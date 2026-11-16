package eu.musicstreamer.nativeaudio

import android.Manifest
import android.content.ComponentName
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.getcapacitor.PermissionState

/** Capacitor bridge to the playback service: commands go through a MediaController, state and errors come back as events. */
@CapacitorPlugin(name = "NativeAudio", permissions = [Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")])
class NativeAudioPlugin : Plugin() {
    private val handler = Handler(Looper.getMainLooper())

    private val controller by lazy {
        val token = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        MediaController.Builder(context, token).buildAsync().also { future ->
            future.addListener({
                future.get().addListener(object : Player.Listener {
                    override fun onEvents(player: Player, events: Player.Events) = emit(player)
                })
                poll(future.get())
            }, ContextCompat.getMainExecutor(context))
        }
    }

    override fun load() {
        Appview.onError = { index, code -> notifyListeners("error", JSObject().put("index", index).put("code", code)) }
    }

    private fun emit(c: Player) {
        val duration = c.duration.takeIf { it != C.TIME_UNSET && it > 0 } ?: c.currentMediaItem?.mediaMetadata?.durationMs ?: 0L
        notifyListeners(
            "state",
            JSObject()
                .put("index", c.currentMediaItemIndex)
                .put("positionMs", c.currentPosition)
                .put("durationMs", duration)
                .put("playing", c.isPlaying || (c.playWhenReady && c.playbackState == Player.STATE_BUFFERING)),
        )
    }

    private fun poll(c: Player) {
        if (c.isPlaying) emit(c)
        handler.postDelayed({ poll(c) }, 500)
    }

    private fun use(call: PluginCall, block: (MediaController) -> Unit) {
        controller.addListener({
            try {
                block(controller.get())
                call.resolve()
            } catch (e: Exception) {
                call.reject(e.message)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    @PluginMethod
    fun configure(call: PluginCall) {
        Appview.url = call.getString("appviewUrl", "")!!.trimEnd('/')
        Appview.token = call.getString("token", "")!!
        // Signed out: stop playback.
        if (Appview.token.isEmpty()) use(call) { it.clearMediaItems() } else call.resolve()
    }

    @PluginMethod
    fun setQueue(call: PluginCall) {
        // Android 13+: the media notification needs the notification permission. Playback works without it.
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "queueAfterPermission")
        } else {
            queue(call)
        }
    }

    @PermissionCallback
    private fun queueAfterPermission(call: PluginCall) = queue(call)

    private fun queue(call: PluginCall) {
        val tracks = call.getArray("tracks")
        val start = call.getInt("startIndex", 0)!!
        val items = (0 until tracks.length()).map {
            val t = tracks.getJSONObject(it)
            val uri = t.getString("uri")
            MediaItem.Builder()
                .setMediaId(uri)
                .setRequestMetadata(MediaItem.RequestMetadata.Builder().setMediaUri(Uri.parse(uri)).build())
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle(t.getString("title"))
                        .setArtist(t.optString("artist"))
                        .setArtworkUri(t.optString("artworkUrl").takeIf { u -> u.isNotEmpty() }?.let(Uri::parse))
                        .setDurationMs(t.optLong("durationMs"))
                        .build(),
                )
                .build()
        }
        use(call) {
            Appview.entries.clear() // a new queue starts new listens
            it.setMediaItems(items, start, 0L)
            it.prepare()
            it.play()
        }
    }

    @PluginMethod fun play(call: PluginCall) = use(call) { it.play() }
    @PluginMethod fun pause(call: PluginCall) = use(call) { it.pause() }
    @PluginMethod fun seek(call: PluginCall) = use(call) { it.seekTo(call.getLong("positionMs", 0L)!!) }
    @PluginMethod fun next(call: PluginCall) = use(call) { it.seekToNextMediaItem() }
    @PluginMethod fun previous(call: PluginCall) = use(call) { if (it.currentPosition > 3000 || !it.hasPreviousMediaItem()) it.seekTo(0) else it.seekToPreviousMediaItem() }
}
