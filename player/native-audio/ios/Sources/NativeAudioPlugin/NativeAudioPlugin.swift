import Capacitor

/// Capacitor bridge: forwards calls to `QueuePlayer` and its events to the web view.
@objc(NativeAudioPlugin)
public class NativeAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeAudioPlugin"
    public let jsName = "NativeAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setQueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "next", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "previous", returnType: CAPPluginReturnPromise),
    ]

    private let player = QueuePlayer()

    override public func load() {
        player.onState = { [weak self] state in self?.notifyListeners("state", data: state) }
        player.onError = { [weak self] index, code in self?.notifyListeners("error", data: ["index": index, "code": code]) }
    }

    @objc func configure(_ call: CAPPluginCall) {
        guard let url = call.getString("appviewUrl"), let token = call.getString("token") else {
            return call.reject("appviewUrl and token are required")
        }
        player.configure(appviewUrl: url, token: token)
        call.resolve()
    }

    @objc func setQueue(_ call: CAPPluginCall) {
        let tracks = (call.getArray("tracks") ?? []).compactMap { ($0 as? [String: Any]).flatMap(QueuePlayer.Track.init) }
        guard let start = call.getInt("startIndex"), tracks.indices.contains(start) else {
            return call.reject("invalid queue")
        }
        player.setQueue(tracks, startIndex: start)
        call.resolve()
    }

    @objc func play(_ call: CAPPluginCall) { player.play(); call.resolve() }
    @objc func pause(_ call: CAPPluginCall) { player.pause(); call.resolve() }
    @objc func next(_ call: CAPPluginCall) { player.next(); call.resolve() }
    @objc func previous(_ call: CAPPluginCall) { player.previous(); call.resolve() }

    @objc func seek(_ call: CAPPluginCall) {
        player.seek(toMs: Double(call.getDouble("positionMs") ?? 0))
        call.resolve()
    }
}
