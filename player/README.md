# musicstreamer.eu player

One SvelteKit single-page app (Svelte 5, TypeScript, `adapter-static`) and three shells around it. Specification: [`docs/player-plan.md`](../docs/player-plan.md).

| Path | What |
|---|---|
| `src/` | the app: browse, search, artist, release, playlist, library, account, artist studio, player bar, Media Session, German and English |
| `src-tauri/` | Tauri 2 desktop shell (`eu.musicstreamer.player`) |
| `android/`, `ios/` | Capacitor projects |
| `native-audio/` | local Capacitor plugin: TypeScript API, Kotlin (Media3) and Swift (AVPlayer) implementations |

Playback runs through an `AudioEngine` (`src/lib/audio/`): `html` (audio element) on web and desktop, `native` (the plugin) inside Capacitor. The native side fetches the grant with the player token and reports the stream itself, so it works with the web view suspended.

## Configure

Copy `.env.example` to `.env` (variables are inlined at build time):

- `PUBLIC_APPVIEW_URL`: the appview base URL.
- `PUBLIC_APP_URL`: where the web app is hosted. `<PUBLIC_APP_URL>/oauth/client-metadata.json` is the OAuth `client_id`.
- `PUBLIC_STORE_BUILD=1`: App Store and Google Play builds; hides payment instructions on `/account`.

The native shells use the OAuth client `<PUBLIC_APP_URL>/oauth/client-metadata-native.json` and return through the custom scheme `eu.musicstreamer.app:/oauth/callback`. atproto requires that scheme to be the `client_id` host in reverse order, so it follows `PUBLIC_APP_URL` (`app.musicstreamer.eu` gives `eu.musicstreamer.app`). If you change the host, change the scheme in `src-tauri/tauri.conf.json`, `android/app/src/main/AndroidManifest.xml` and `ios/App/App/Info.plist`.

## Build

From the repository root: `pnpm install`, `pnpm typecheck`, `pnpm build`. Everything below runs in `player/`.

- **Web:** `pnpm build` writes `build/` with `index.html` as the SPA fallback. Host it with every unknown path rewritten to `index.html` (needed for `/oauth/callback` and the dynamic routes) and serve `/oauth/client-metadata*.json` as `application/json`.
- **Desktop:** `pnpm tauri build` (needs Rust and the Tauri prerequisites for your OS). Before releasing, run `pnpm tauri signer generate`, put the public key into `plugins.updater.pubkey` and the update server into `plugins.updater.endpoints` in `src-tauri/tauri.conf.json` (both are placeholders), and sign releases with the private key.
- **Android:** `pnpm build && pnpm cap sync android`, then build in Android Studio or with `./gradlew assembleDebug` in `android/` (needs the Android SDK and JDK 21).
- **iOS:** `pnpm build && pnpm cap sync ios`, then open `ios/App/App.xcodeproj` in Xcode and set your signing team. The project uses Swift Package Manager.

## Unverified

Compiled, with the command shown to work: `pnpm typecheck` and `pnpm build` at the root, `cargo check` in `src-tauri`, and the Swift sources of the plugin against the Capacitor 8.6.2 framework for iOS arm64.

Only written, never compiled or run: the Kotlin plugin and the Android project (no Android SDK here), the iOS app project, a Tauri bundle, and all runtime behaviour. In particular untested: the atproto sign-in flow in each shell, the web view's support for WebCrypto, IndexedDB and Web Locks under `tauri://` and `capacitor://` origins (the OAuth client needs them), the Tauri CSP, deep-link return on each OS, the updater, background playback and lock-screen controls, and the iOS and Android icon and splash assets.
