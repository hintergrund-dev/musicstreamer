# musicstreamer.eu — player apps plan

Status: proposal. Extends `docs/plan.md`, which listed the player as out of scope.

## 1. One codebase, three shells

| Target | Shell | Distribution |
|---|---|---|
| Web | SvelteKit single-page app, installable as a PWA | `app.musicstreamer.eu` |
| Windows, macOS, Linux | Tauri 2 (system web view) | Direct download and GitHub Releases, auto-update |
| Android | Capacitor + native audio plugin | APK and F-Droid first, then Google Play |
| iOS | Capacitor + native audio plugin | App Store |

Everything lives in `player/` in this repository:

```
player/                 SvelteKit SPA (adapter-static), Svelte 5, TypeScript
player/src-tauri/       Tauri 2 desktop shell
player/android/         Capacitor Android project
player/ios/             Capacitor iOS project
player/native-audio/    local Capacitor plugin: TypeScript API, Kotlin (Media3), Swift (AVPlayer)
```

Artist tools exist on the web only, as the `/studio` section of the same app. The shells are
players.

## 2. Appview changes

### Player sessions

Playback calls no longer go through the listener's PDS for every track.

- `eu.musicstreamer.player.createSession` — procedure, authenticated by atproto service auth
  (called once after sign-in, proxied through the listener's PDS). Returns
  `{ token, expiresAt }`. The token is 32 random bytes; the appview stores only its SHA-256, the
  DID and the expiry (30 days).
- `eu.musicstreamer.player.revokeSession` — procedure, authenticated by the player token.
- Every authenticated appview method accepts **either** a service-auth JWT **or**
  `Authorization: Bearer <player token>`.

### Audio format baseline

- Every track must include at least one source with `mimeType` `audio/mpeg` (MP3) or
  `audio/mp4` (AAC). Other sources (Opus, FLAC) are optional extras. Tracks without a baseline
  source are marked unavailable by the track check.
- `player.getPlayback` gets an optional `accept` parameter (array of mime types the client can
  play). It returns the first source of the track whose mime type is accepted, otherwise the
  baseline source. The response also carries the chosen `mimeType`.
- Audio hosts need HTTP Range support. CORS is no longer required: players use a plain audio
  element or a native player, never `fetch`.

## 3. Sign-in and writes

- atproto OAuth, public client. Client metadata is served by the web app at
  `/oauth/client-metadata.json`.
- Web: redirect back to `/oauth/callback`.
- Desktop and mobile: sign-in opens in the system browser and returns through a registered link
  (custom scheme `eu.musicstreamer.app`, the reverse of the client host as atproto requires; loopback or deep link on desktop).
- After sign-in the app calls `player.createSession` once and keeps the player token.
- Likes, follows, playlists and (in the studio) profile, track and release records are written
  straight to the user's own PDS with the OAuth session.

## 4. Web player

Routes:

| Route | Content |
|---|---|
| `/` | new releases |
| `/search` | search over artists, releases, tracks |
| `/artist/[did]` | profile, verification badge, releases, follow |
| `/release/[did]/[rkey]` | cover, track list, play, like |
| `/playlist/[did]/[rkey]` | playlist; editing for the owner |
| `/library` | likes, follows, playlists |
| `/account` | subscription status; payment instructions (IBAN, amount, reference, QR code) unless this is a store build |
| `/studio` | artist tools: profile, tracks, releases, verification status, statements |
| `/oauth/callback` | completes sign-in |

- A persistent player bar: artwork, title, artist, play/pause, previous/next, seek, queue.
- Media Session API for media keys and system controls on web and desktop.
- A stream is reported with `player.reportStream` once the listener has actually played
  `countAfterMs` of the track (playback time, not wall-clock time; seeking does not count).
- PWA manifest and a service worker that caches the app shell only, never audio.
- `PUBLIC_STORE_BUILD=1` hides payment instructions and replaces them with "manage your
  subscription on the website" (required for the App Store and Google Play builds).
- Uses the identity in `brand/` and the tokens of the landing page, light and dark.
- German and English.

### Audio engine

One interface, two implementations:

```ts
interface AudioEngine {
  setQueue(tracks: QueueTrack[], startIndex: number): Promise<void>;
  play(): Promise<void>; pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  next(): Promise<void>; previous(): Promise<void>;
  onState(cb: (s: { index: number; positionMs: number; durationMs: number; playing: boolean }) => void): void;
  onError(cb: (e: { index: number; code: string }) => void): void;
}
```

- `html` (web, desktop): an audio element; the app fetches the grant per track and reports the
  stream itself.
- `native` (Android, iOS): the Capacitor plugin below.

### Studio

- Edit `actor.profile`.
- Add a track: metadata form, writers with legal names and society, one or more audio sources by
  URL. The studio computes the SHA-256 of a file the artist picks locally and checks it against
  the URL's `Content-Length`; it never uploads audio.
- Create releases from existing tracks.
- Verification: show the transfer instructions and status.
- Statements: per month and track.

## 5. Native audio plugin (`player/native-audio`)

The web view may be suspended in the background, so on phones native code owns playback.

- `configure({ appviewUrl, token })`
- `setQueue`, `play`, `pause`, `seek`, `next`, `previous`, and `state` / `error` events matching
  the `AudioEngine` interface.
- For each track the native side calls `player.getPlayback` with the player token, plays the
  returned URL, and calls `player.reportStream` after `countAfterMs` of playback.
- Android: Media3 `ExoPlayer` in a `MediaSessionService` (foreground service, notification and
  lock-screen controls).
- iOS: `AVPlayer`, `AVAudioSession` category playback, `MPNowPlayingInfoCenter` and
  `MPRemoteCommandCenter`; background mode `audio`.

## 6. Desktop shell

- Tauri 2, bundle id `eu.musicstreamer.player`, window with the web app.
- Sign-in return via deep link or loopback.
- Updater plugin configured with placeholder endpoint and public key.
- Installers: `.dmg`, `.msi`/NSIS, AppImage and `.deb`.

## 7. Out of scope for now

- Offline downloads (counting offline plays fairly needs its own token scheme).
- CarPlay and Android Auto.
- Store listings, signing certificates and release automation.

## 8. Needs checking before release

- Codec support per system web view; the MP3/AAC baseline is the safe assumption.
- The exact atproto OAuth redirect rules for installed apps.
- App Store and Google Play rules for subscription apps without in-app purchase.
