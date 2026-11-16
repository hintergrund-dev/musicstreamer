# musicstreamer.eu — plan

Status: proposal. Nothing here is live. External blockers are listed at the end.

## 1. Model

- Listeners pay **€5 plus their country's VAT** per month by SEPA (instant) bank transfer.
- Artists **host their own audio files** and publish metadata as atproto records in their own repo.
- The **appview** indexes the catalogue, gates playback, counts streams and settles monthly.
- A non-profit association (Verein) operates musicstreamer.eu. It **takes no cut**; fixed costs are
  covered by donations.
- **User-centric split:** each listener's €5 is divided among the tracks that listener streamed,
  by stream count.
- **Humans only:** every artist is a verified person or collective. No AI-generated music.
- Everything is open source; anyone can run another appview on the same lexicons.

### What counts as a stream

A stream counts once the listener has played **30 seconds** of a track, or **half the track** if
it is shorter than 60 seconds. One playback grant can produce at most one stream. This is the
30-second rule Spotify, Deezer and Apple Music use, plus a short-track rule so very short pieces
can still count.

## 2. Lexicons (`eu.musicstreamer.*`)

JSON files live in `lexicons/eu/musicstreamer/...`, one file per NSID.

### Records in the artist's repo

`eu.musicstreamer.actor.profile` — key `self`
- `displayName` string (required, max 64 graphemes)
- `description` string (max 2560 graphemes)
- `avatar` blob image (max 1 MB), `banner` blob image (max 1 MB)
- `links` array of `{ label: string, url: uri }`
- `genres` array of string
- `kind` string, knownValues `person`, `collective` (required)
- `members` array of `{ name: string, did?: did }` (for collectives)
- `createdAt` datetime

`eu.musicstreamer.music.track` — key `tid`
- `title` string (required)
- `artists` array of `{ name: string, did?: did, role?: string }` (required, min 1)
- `durationMs` integer (required)
- `audio` array of `#audioSource` (required, min 1)
- `artwork` blob image
- `explicit` boolean
- `tags` array of string
- `releaseDate` string (ISO date)
- `writers` array of `{ name: string, role: string, society?: string, ipi?: string }`
  (required, min 1). `name` is the writer's legal name. `role` knownValues `composer`,
  `lyricist`, `arranger`. `society` is the collecting society short name (`GEMA`, `PRS`, …);
  omitted means the writer is in no society.
- `iswc` string, `isrc` string
- `createdAt` datetime (required)

`#audioSource` object
- `url` uri (required) — must support HTTP Range requests and CORS
- `mimeType` string (required)
- `bitrate` integer, `size` integer
- `sha256` string (required, hex) — pins the content because the URL is mutable
- `access` string, knownValues `gated`, `open` (required)

`eu.musicstreamer.music.release` — key `tid`
- `title` string (required)
- `type` string, knownValues `album`, `ep`, `single` (required)
- `artwork` blob image, `releaseDate` string
- `tracks` array of `com.atproto.repo.strongRef` (required, ordered)
- `upc` string, `label` string
- `createdAt` datetime (required)

### Records in the listener's repo

`eu.musicstreamer.graph.like` — key `tid`: `subject` strongRef (track or release), `createdAt`
`eu.musicstreamer.graph.follow` — key `tid`: `subject` did, `createdAt`
`eu.musicstreamer.music.playlist` — key `tid`: `name` (required), `description`, `cover` blob,
`tracks` array of strongRef, `createdAt`

### Records in the musicstreamer.eu repo

`eu.musicstreamer.actor.verification` — key `tid`: `subject` did, `kind` (`person` |
`collective`), `createdAt`. Deleting the record revokes verification.

`eu.musicstreamer.settlement.statement` — key: the month (`2027-01`), record key type `any`
- `month` string, `revenueCents` integer (net of VAT), `societyFeesCents` integer,
  `paidOutCents` integer, `unallocatedCents` integer (subscriber periods with no streams; goes to
  the donation-funded cost account), `subscriberPeriods` integer
- `tracks` array of `{ uri: at-uri, streams: integer }`
- `createdAt` datetime

### Not records (private appview state)

Streams, subscription status, payment data, artist legal names and IBANs, payouts. Repos are
public and writable by their owner, so none of this can live there.

## 3. XRPC API

All methods are under `eu.musicstreamer.*` and each has a lexicon file.

Auth: **atproto service auth**. The client sends the request through the user's PDS with the
`atproto-proxy: did:web:musicstreamer.eu#musicstreamer_appview` header; the PDS adds a signed
inter-service JWT (`iss` = user DID, `aud` = `did:web:musicstreamer.eu`, `lxm` = method NSID).
The appview resolves the user's DID document and verifies the signature. The appview itself needs
no OAuth client. Catalogue queries work without auth.

| Method | Type | Auth | Purpose |
|---|---|---|---|
| `catalog.getArtist` | query | optional | profile, verification, release list |
| `catalog.getRelease` | query | optional | release with hydrated tracks |
| `catalog.getTracks` | query | optional | hydrate up to 50 track URIs |
| `catalog.getArtistReleases` | query | optional | paginated |
| `catalog.searchCatalog` | query | optional | full-text over artists, releases, tracks |
| `catalog.getNewReleases` | query | optional | paginated, newest first |
| `catalog.getPlaylist` | query | optional | playlist with hydrated tracks |
| `catalog.getLibrary` | query | required | caller's likes, follows, playlists |
| `player.getPlayback` | query | required | returns `{ url, playId, countAfterMs }` or an error |
| `player.reportStream` | procedure | required | input `{ playId }`; counts the stream |
| `billing.getPaymentInstructions` | procedure | required | input `{ country }`; returns IBAN, amount, reference |
| `billing.getStatus` | query | required | `{ paidUntil, country }` |
| `artist.startVerification` | procedure | required | returns IBAN, amount (€1), reference |
| `artist.getStatus` | query | required | verification and payout status |
| `artist.getStatements` | query | required | per-month, per-track streams, share, fees, payout |
| `moderation.createReport` | procedure | required | `{ subject, reason, text? }`; reasons `ai-generated`, `society-member`, `copyright`, `other` |

`player.getPlayback` errors: `NotSubscribed`, `ArtistNotVerified`, `NotLicensedInCountry`,
`TrackUnavailable`. For `open` audio it returns the plain URL without requiring a subscription
and no stream is counted.

## 4. Appview

Runs on Cloudflare: one Worker, one Durable Object, one Queue, D1, Cron.

### Ingest
- The Durable Object keeps a WebSocket to Jetstream filtered to the `eu.musicstreamer.*`
  collections, stores the cursor, and an alarm reconnects it.
- Each commit event is validated against the lexicon and upserted or deleted in D1.
- Records from DIDs without a verification are still indexed but never returned by catalogue
  queries and never playable. They become visible when verification lands.
- Account and identity events update handle and takedown/deactivation status.

### Track verification (Queue)
- For each new or changed track: fetch the first audio source, compute sha256, compare.
- `gated` sources are fetched with a grant the appview signs for itself.
- Tracks that fail are marked unavailable.

### Playback grant
- `getPlayback` checks: caller has an active paid period; artist is verified and not banned;
  track is available; every writer society on the track is licensed in the caller's country.
- The grant is an ES256 JWT, valid 5 minutes: `{ iss: did:web:musicstreamer.eu, aud: <audio URL
  origin>, url: <audio URL>, exp, jti }`. It carries no listener identity.
- It is appended to the audio URL as `?grant=<jwt>`. The artist's host verifies it against the
  public key published in `https://musicstreamer.eu/.well-known/did.json`.
- `playId` is a second signed token for the appview only: listener DID, track URI, period id,
  issued-at, `countAfterMs`.
- The protocol is specified for hosts in `docs/playback-grant.md`.

### Stream counting
- `reportStream(playId)` is accepted when the token is valid, at least `countAfterMs` of
  wall-clock time has passed since it was issued, and the `playId` has not been counted before.
- One row per counted stream: play id, listener DID, track URI, period id, timestamp.

### Subscriptions and payments (Wise)
- `getPaymentInstructions` stores the listener's country and a permanent reference code
  (`MS-XXXXXXXX`), and returns the IBAN, the gross monthly amount (500 cents plus the country's
  VAT rate, EU-27 table in code) and the reference.
- Wise calls the webhook on every balance change. The appview verifies the webhook signature,
  then fetches the balance statement and processes credits it has not seen.
- A credit whose reference contains a subscriber code creates `floor(amount / monthlyGross)`
  consecutive one-month **periods**, starting at the later of now or the end of the last period.
  Each period carries 500 net cents.
- A credit of at least €1 whose reference contains an artist code (`MSV-XXXXXXXX`) verifies that
  artist: the sender name and IBAN are stored, and the appview writes the `actor.verification`
  record. An IBAN that belongs to a banned artist is rejected.
- Unmatched credits are stored for manual review.

### Society licensing
- Table `licences (society, country, rate_bps)`, maintained by hand. Empty at launch, so only
  tracks whose writers are in no society are playable.
- When a licence exists, `rate_bps` of a society track's share is withheld for the society.

### Settlement (Cron, monthly)
Runs on the 1st and settles every period that ended in the calendar month **before the previous
one** (one month in arrears, so reports can stop a payout).
1. For each period: split 500 cents across the tracks streamed in it by stream count, using
   largest-remainder rounding. A period with no streams is `unallocated`.
2. For each track share: withhold the society fee if any writer society applies; credit the rest
   to the artist's balance. Shares for taken-down tracks or banned artists go to `unallocated`.
3. Artists with a balance of €10 or more get a payout row and their balance resets.
4. Write per-artist, per-track statement rows.
5. Publish the public `settlement.statement` record.
6. Delete the stream rows of the settled periods.

Payouts are exported as a CSV in Wise's batch-transfer format from an admin endpoint; the
operator uploads and approves it in Wise (EU accounts cannot fund transfers by API).

### Moderation and admin
Admin endpoints behind a bearer secret: list reports, take a track down, ban an artist (deletes
the verification record), list unmatched credits, download the payout CSV, edit `licences`.

### Service identity
`/.well-known/did.json` serves the `did:web:musicstreamer.eu` document with the grant
verification key and the `#musicstreamer_appview` service entry.

## 5. Landing page

Static SvelteKit site, German and English, labelled as a proposal and "coming soon".

| Section | Content |
|---|---|
| Hero | One-sentence pitch, "proposal — in development" label |
| Where your €5 goes | Diagram: listener → €5 → split by that listener's streams → artists, with a worked example |
| Why it is different | Diagram: one big pot (your money pays artists you never played) vs per-listener split |
| How it is built | Diagram: artist's own host, artist's atproto repo, appview, player |
| Principles | Zero cut, open source, public monthly statements, humans only, no AI music |
| For artists | What they need: own hosting, verification transfer, declare writers and societies |
| Open questions | Society licensing, bank integration, legal form — stated as unresolved |
| Follow | Link to the GitHub repo and the `@musicstreamer.eu` atproto account; no email collection |

Diagrams are inline SVG and work in light and dark mode.

## 6. Out of scope for now

- The listener web player and artist upload UI.
- The audio host integration (later part of hintergrund.cloud); only its protocol is specified.
- Per-track payout splits between several payees.
- Previews for non-subscribers.

## 7. External blockers

- **ICE licence:** current small-service terms, per-subscriber minimum, territories. Until signed,
  only artists outside all collecting societies can be onboarded.
- **Wise:** whether the balance statement API works unattended on an EU business account. If not,
  switch to a bank whose API exposes payment references (bunq is the candidate).
- **Legal review:** the association structure, the royalty model and the artist terms.

## 8. Rules for artists (for the terms)

- No generative AI for composition, performance, vocals or lyrics. Mastering, noise reduction and
  similar tools are allowed.
- All writers of every track are named with their legal names and society membership.
- No covers and no uncleared samples while no society licence is in place.
- A collective is represented by one verified person and declares its members.
- Breach: takedown, loss of unpaid balance, ban of the verified identity.
