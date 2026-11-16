import AVFoundation
import MediaPlayer

/// AVPlayer-based queue player. For every track it asks the appview for playback (`player.getPlayback`) with
/// the player token, plays the returned URL and reports the stream (`player.reportStream`) once `countAfterMs`
/// of playback time has elapsed (seeking does not count). Runs without the web view.
final class QueuePlayer {
    struct Track {
        let uri: String, title: String, artist: String, artworkUrl: URL?, durationMs: Double

        init?(_ o: [String: Any]) {
            guard let uri = o["uri"] as? String, let title = o["title"] as? String else { return nil }
            self.uri = uri
            self.title = title
            artist = o["artist"] as? String ?? ""
            artworkUrl = (o["artworkUrl"] as? String).flatMap(URL.init)
            durationMs = (o["durationMs"] as? NSNumber)?.doubleValue ?? 0
        }
    }

    private struct Playback { let url: URL; let playId: String?; let countAfterMs: Double? }
    private struct ApiError: Error { let code: String }

    var onState: (([String: Any]) -> Void)?
    var onError: ((Int, String) -> Void)?

    private let player = AVPlayer()
    private var appview: URL?
    private var token = ""
    private var queue: [Track] = []
    private var index = -1
    private var generation = 0
    private var playback: Playback?
    private var playedMs = 0.0
    private var lastTime: Double?  // previous position in seconds; nil after a seek or pause
    private var reported = false
    private var retried = false
    private var statusObservation: NSKeyValueObservation?
    private var artwork: MPMediaItemArtwork?

    // Formats AVPlayer can play. MP3 and AAC are the baseline every track has.
    private let accept = ["audio/mpeg", "audio/mp4", "audio/flac"]

    init() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { [weak self] _ in
            self?.tick()
        }
        NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: nil, queue: .main) { [weak self] _ in
            self?.next()
        }
        NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt else { return }
            if AVAudioSession.InterruptionType(rawValue: raw) == .began { self?.pause() }
        }
        setUpRemoteCommands()
    }

    // MARK: Commands

    func configure(appviewUrl: String, token: String) {
        appview = URL(string: appviewUrl.hasSuffix("/") ? String(appviewUrl.dropLast()) : appviewUrl)
        self.token = token
    }

    func setQueue(_ tracks: [Track], startIndex: Int) {
        queue = tracks
        load(startIndex)
    }

    func play() {
        try? AVAudioSession.sharedInstance().setActive(true)
        if player.currentItem != nil { player.play() } else if index >= 0 { load(index) }
        publish()
    }

    func pause() {
        player.pause()
        lastTime = nil
        publish()
    }

    func seek(toMs ms: Double) {
        lastTime = nil
        player.seek(to: CMTime(seconds: ms / 1000, preferredTimescale: 600)) { [weak self] _ in self?.publish() }
    }

    func next() {
        if index + 1 < queue.count {
            load(index + 1)
        } else {
            player.pause()
            seek(toMs: 0)
        }
    }

    func previous() {
        if position > 3 || index <= 0 { seek(toMs: 0) } else { load(index - 1) }
    }

    // MARK: Loading

    private var position: Double { player.currentTime().seconds.isFinite ? player.currentTime().seconds : 0 }

    private func load(_ i: Int) {
        generation += 1
        let gen = generation
        index = i
        playedMs = 0
        lastTime = nil
        reported = false
        retried = false
        playback = nil
        artwork = nil
        player.pause()
        player.replaceCurrentItem(with: nil)
        updateNowPlaying()
        publish()
        Task { @MainActor in
            do {
                let pb = try await fetchPlayback(queue[i].uri)
                guard gen == generation else { return }
                playback = pb
                start(pb.url, at: 0)
            } catch {
                guard gen == generation else { return }
                fail(i, error)
            }
        }
    }

    private func start(_ url: URL, at seconds: Double) {
        try? AVAudioSession.sharedInstance().setActive(true)
        let item = AVPlayerItem(url: url)
        statusObservation = item.observe(\.status) { [weak self] item, _ in
            if item.status == .failed { DispatchQueue.main.async { self?.recover() } }
        }
        player.replaceCurrentItem(with: item)
        if seconds > 0 { player.seek(to: CMTime(seconds: seconds, preferredTimescale: 600)) }
        player.play()
    }

    /// The grant lives five minutes. If the host starts refusing, ask for a new one once and resume. The playId is kept,
    /// so the track still counts once.
    private func recover() {
        guard index >= 0 else { return }
        if retried { return fail(index, ApiError(code: "MediaError")) }
        retried = true
        let gen = generation, i = index, at = position
        Task { @MainActor in
            do {
                let pb = try await fetchPlayback(queue[i].uri)
                guard gen == generation else { return }
                start(pb.url, at: at)
            } catch {
                guard gen == generation else { return }
                fail(i, error)
            }
        }
    }

    private func fail(_ i: Int, _ error: Error) {
        player.pause()
        let code = (error as? ApiError)?.code ?? ((error is URLError) ? "Network" : "MediaError")
        onError?(i, code)
        publish()
    }

    // MARK: Appview

    private func request(_ nsid: String, query: [URLQueryItem] = [], body: [String: String]? = nil) async throws -> [String: Any] {
        guard let base = appview, !token.isEmpty else { throw ApiError(code: "AuthRequired") }
        var comps = URLComponents(url: base.appendingPathComponent("xrpc/eu.musicstreamer.\(nsid)"), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comps.queryItems = query }
        var req = URLRequest(url: comps.url!)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let body {
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, res) = try await URLSession.shared.data(for: req)
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        if let status = (res as? HTTPURLResponse)?.statusCode, status >= 400 {
            throw ApiError(code: json["error"] as? String ?? (status == 401 ? "AuthRequired" : "MediaError"))
        }
        return json
    }

    private func fetchPlayback(_ uri: String) async throws -> Playback {
        let query = [URLQueryItem(name: "uri", value: uri)] + accept.map { URLQueryItem(name: "accept", value: $0) }
        let json = try await request("player.getPlayback", query: query)
        guard let s = json["url"] as? String, let url = URL(string: s) else { throw ApiError(code: "TrackUnavailable") }
        return Playback(url: url, playId: json["playId"] as? String, countAfterMs: (json["countAfterMs"] as? NSNumber)?.doubleValue)
    }

    // MARK: Played time and reporting

    private func tick() {
        let t = position
        if player.timeControlStatus == .playing, let last = lastTime, t > last, t - last < 1.5 {
            playedMs += (t - last) * 1000
        }
        lastTime = player.timeControlStatus == .playing ? t : nil
        if !reported, let pb = playback, let id = pb.playId, let after = pb.countAfterMs, playedMs >= after {
            reported = true
            Task {
                do { _ = try await request("player.reportStream", body: ["playId": id]) }
                catch is URLError { self.reported = false }  // network failure: try again on the next tick
                catch {}  // already counted or rejected: nothing to retry
            }
        }
        publish()
        updateNowPlaying()
    }

    // MARK: State, lock screen and remote commands

    private func publish() {
        let d = player.currentItem?.duration.seconds ?? 0
        onState?([
            "index": index,
            "positionMs": position * 1000,
            "durationMs": d.isFinite && d > 0 ? d * 1000 : (queue.indices.contains(index) ? queue[index].durationMs : 0),
            "playing": player.timeControlStatus != .paused,
        ])
    }

    private func updateNowPlaying() {
        guard queue.indices.contains(index) else {
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            return
        }
        let t = queue[index]
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: t.title,
            MPMediaItemPropertyArtist: t.artist,
            MPMediaItemPropertyPlaybackDuration: (player.currentItem?.duration.seconds).flatMap { $0.isFinite ? $0 : nil } ?? t.durationMs / 1000,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: position,
            MPNowPlayingInfoPropertyPlaybackRate: player.timeControlStatus == .playing ? 1.0 : 0.0,
        ]
        if let artwork { info[MPMediaItemPropertyArtwork] = artwork }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
        if artwork == nil, let url = t.artworkUrl {
            let gen = generation
            Task {
                guard let (data, _) = try? await URLSession.shared.data(from: url), let image = UIImage(data: data), gen == generation else { return }
                artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                updateNowPlaying()
            }
        }
    }

    private func setUpRemoteCommands() {
        let c = MPRemoteCommandCenter.shared()
        c.playCommand.addTarget { [weak self] _ in self?.play(); return .success }
        c.pauseCommand.addTarget { [weak self] _ in self?.pause(); return .success }
        c.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            if self.player.timeControlStatus == .paused { self.play() } else { self.pause() }
            return .success
        }
        c.nextTrackCommand.addTarget { [weak self] _ in self?.next(); return .success }
        c.previousTrackCommand.addTarget { [weak self] _ in self?.previous(); return .success }
        c.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let e = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self?.seek(toMs: e.positionTime * 1000)
            return .success
        }
    }
}
