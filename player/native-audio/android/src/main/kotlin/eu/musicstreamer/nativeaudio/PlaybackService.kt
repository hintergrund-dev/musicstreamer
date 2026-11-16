package eu.musicstreamer.nativeaudio

import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.HttpDataSource
import androidx.media3.datasource.ResolvingDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import kotlin.concurrent.thread

/**
 * Hosts ExoPlayer in a foreground media service (notification, lock screen, headset buttons). It resolves each track
 * through the appview when ExoPlayer opens it and reports the stream after `countAfterMs` of played time, all without the web view.
 */
@OptIn(UnstableApi::class)
class PlaybackService : MediaSessionService() {
    private var session: MediaSession? = null
    private val handler = Handler(Looper.getMainLooper())
    private var playedMs = 0L
    private var lastPosition: Long? = null // null after a seek or pause
    private var retried = false

    override fun onCreate() {
        super.onCreate()
        val upstream = DefaultDataSource.Factory(this, DefaultHttpDataSource.Factory())
        val player = ExoPlayer.Builder(this)
            .setMediaSourceFactory(DefaultMediaSourceFactory(this).setDataSourceFactory(ResolvingDataSource.Factory(upstream) { Appview.resolve(it) }))
            .setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
            .setHandleAudioBecomingNoisy(true)
            .build()
        player.addListener(listener(player))
        session = MediaSession.Builder(this, player).setCallback(object : MediaSession.Callback {
            // Controllers send items without a URI; the plugin puts the track's at:// URI into the request metadata.
            override fun onAddMediaItems(mediaSession: MediaSession, controller: MediaSession.ControllerInfo, mediaItems: MutableList<MediaItem>): ListenableFuture<MutableList<MediaItem>> =
                Futures.immediateFuture(mediaItems.map { it.buildUpon().setUri(it.requestMetadata.mediaUri).build() }.toMutableList())
        }).build()
        tick(player)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

    override fun onTaskRemoved(rootIntent: android.content.Intent?) {
        if (session?.player?.playWhenReady != true) stopSelf()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        session?.run {
            player.release()
            release()
        }
        session = null
        super.onDestroy()
    }

    private fun listener(player: ExoPlayer) = object : Player.Listener {
        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            playedMs = 0
            lastPosition = null
            retried = false
            // A track that was already counted starts a new listen: ask for a new playId when it is opened.
            mediaItem?.mediaId?.let { id -> Appview.entries[id]?.takeIf { it.reported }?.let { Appview.entries.remove(id) } }
        }

        override fun onPositionDiscontinuity(oldPosition: Player.PositionInfo, newPosition: Player.PositionInfo, reason: Int) {
            if (reason == Player.DISCONTINUITY_REASON_SEEK) lastPosition = null
        }

        override fun onPlayerError(error: PlaybackException) {
            val cause = generateSequence<Throwable>(error) { it.cause }.toList()
            val api = cause.filterIsInstance<ApiException>().firstOrNull()
            // A refusal by the audio host usually means the grant expired: ask for a new one once and resume.
            val refused = cause.any { it is HttpDataSource.InvalidResponseCodeException }
            if (api == null && refused && !retried) {
                retried = true
                player.currentMediaItem?.mediaId?.let { id -> Appview.entries[id]?.let { Appview.entries[id] = Appview.Entry(it.url, it.playId, it.countAfterMs, 0, it.reported) } }
                player.prepare()
                player.play()
                return
            }
            Appview.onError?.invoke(player.currentMediaItemIndex, api?.code ?: if (cause.any { it is java.io.IOException }) "Network" else "MediaError")
        }
    }

    /** Counts played time (not wall-clock time; a seek does not count) and reports the stream once. */
    private fun tick(player: ExoPlayer) {
        if (player.isPlaying) {
            val position = player.currentPosition
            lastPosition?.let { if (position > it && position - it < 1500) playedMs += position - it }
            lastPosition = position
            val id = player.currentMediaItem?.mediaId
            val entry = id?.let { Appview.entries[it] }
            val playId = entry?.playId
            if (entry != null && !entry.reported && playId != null && entry.countAfterMs >= 0 && playedMs >= entry.countAfterMs) {
                entry.reported = true
                thread {
                    try {
                        Appview.report(playId)
                    } catch (e: ApiException) {
                        // already counted or rejected: nothing to retry
                    } catch (e: java.io.IOException) {
                        entry.reported = false // network failure: try again on the next tick
                    }
                }
            }
        } else {
            lastPosition = null
        }
        handler.postDelayed({ tick(player) }, 500)
    }
}
