package eu.musicstreamer.nativeaudio

import android.net.Uri
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSpec
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap

/** An appview error name (`NotSubscribed`, `TrackUnavailable`, ...). */
class ApiException(val code: String) : IOException(code)

/** The appview base URL and player token. The plugin and the playback service run in one process, so this is shared directly. */
object Appview {
    @Volatile var url = ""
    @Volatile var token = ""
    @Volatile var onError: ((index: Int, code: String) -> Unit)? = null

    class Entry(val url: String, val playId: String?, val countAfterMs: Long, val at: Long, @Volatile var reported: Boolean = false)

    /** Latest playback per track URI. The grant lives five minutes, so it is refreshed after four. */
    val entries = ConcurrentHashMap<String, Entry>()

    // Formats ExoPlayer can play. MP3 and AAC are the baseline every track has.
    private val accept = listOf("audio/mpeg", "audio/mp4", "audio/flac", "audio/ogg", "audio/opus")

    private fun call(nsid: String, query: String = "", body: String? = null): JSONObject {
        if (url.isEmpty() || token.isEmpty()) throw ApiException("AuthRequired")
        val conn = URL("$url/xrpc/eu.musicstreamer.$nsid$query").openConnection() as HttpURLConnection
        try {
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.connectTimeout = 15_000
            conn.readTimeout = 15_000
            if (body != null) {
                conn.requestMethod = "POST"
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toByteArray()) }
            }
            val ok = conn.responseCode < 400
            val text = (if (ok) conn.inputStream else conn.errorStream)?.bufferedReader()?.use { it.readText() } ?: "{}"
            val json = runCatching { JSONObject(text) }.getOrDefault(JSONObject())
            if (!ok) throw ApiException(json.optString("error", if (conn.responseCode == 401) "AuthRequired" else "MediaError"))
            return json
        } finally {
            conn.disconnect()
        }
    }

    /** `player.getPlayback`. A refresh keeps the playId of the first call, so one listen counts at most once. */
    private fun fetch(uri: String, previous: Entry?): Entry {
        val query = "?uri=${enc(uri)}" + accept.joinToString("") { "&accept=${enc(it)}" }
        val json = call("player.getPlayback", query)
        return Entry(
            url = json.getString("url"),
            playId = previous?.playId ?: json.optString("playId").ifEmpty { null },
            countAfterMs = previous?.countAfterMs ?: json.optLong("countAfterMs", -1),
            at = System.currentTimeMillis(),
            reported = previous?.reported ?: false,
        )
    }

    /** Called by ExoPlayer on its loading thread each time it opens a track: swaps the `at://` URI for the granted URL. */
    @OptIn(UnstableApi::class)
    fun resolve(spec: DataSpec): DataSpec {
        val uri = spec.uri.toString()
        if (!uri.startsWith("at://")) return spec
        val known = entries[uri]
        val entry = if (known != null && System.currentTimeMillis() - known.at < 240_000) known else fetch(uri, known).also { entries[uri] = it }
        return spec.withUri(Uri.parse(entry.url))
    }

    /** `player.reportStream`. */
    fun report(playId: String) {
        call("player.reportStream", body = JSONObject().put("playId", playId).toString())
    }

    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")
}
