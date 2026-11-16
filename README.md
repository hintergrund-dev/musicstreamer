<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/logo-dark.svg">
    <img src="brand/logo-light.svg" alt="musicstreamer.eu" height="56">
  </picture>
</p>

# musicstreamer.eu

**Status: proposal.** Nothing here is live.

An atproto-based music streaming appview. Artists host their own audio and publish metadata as
atproto records in their own repo. Listeners pay €5 plus VAT per month by bank transfer, and each
listener's €5 is split by stream count among the tracks that listener streamed. A non-profit
association operates it and takes no cut.

The specification is [`docs/plan.md`](docs/plan.md). Audio hosts implement
[`docs/playback-grant.md`](docs/playback-grant.md).

## How it works

**Architecture**

```mermaid
flowchart LR
  subgraph AR["Artist"]
    R[("atproto repo<br/>profile, track, release")]
    H["Audio host<br/>serves files, checks the grant"]
  end
  subgraph AV["Appview (musicstreamer.eu)"]
    I["Ingest<br/>Jetstream consumer"]
    D[("D1 index<br/>catalogue, periods, streams")]
    X["XRPC API"]
    S["Monthly settlement"]
    I --> D
    X <--> D
    S <--> D
  end
  P["Listener's player"]
  B[("Bank account")]
  R -- "records" --> I
  P -- "getPlayback / reportStream" --> X
  X -- "audio URL + signed grant" --> P
  P -- "audio request + grant" --> H
  P -. "5 EUR + VAT per month" .-> B
  B -- "credit notification" --> X
  S -. "payout batch" .-> AR
```

**Playing a track**

```mermaid
sequenceDiagram
  participant P as Player
  participant S as Listener's PDS
  participant A as Appview
  participant H as Artist's audio host
  P->>S: player.getPlayback(track)
  S->>A: forwarded with a signed service token
  A-->>P: audio URL + grant (5 min) + playId
  P->>H: GET audio?grant=...
  H-->>P: audio, after verifying the grant against did.json
  Note over P: 30 seconds played
  P->>A: player.reportStream(playId)
  Note over A: one stream counted for this listener's period
```

**Where one listener's 5 EUR goes**

```mermaid
flowchart LR
  L["Listener<br/>5 EUR net for one month"] --> SP{"Split by this<br/>listener's streams"}
  SP -- "6 of 10 streams" --> A["Artist A<br/>3.00 EUR"]
  SP -- "3 of 10 streams" --> B["Artist B<br/>1.50 EUR"]
  SP -- "1 of 10 streams" --> C["Artist C<br/>0.50 EUR"]
```

Illustrative numbers. A stream counts after 30 seconds, or half the track if it is shorter than 60 seconds.

## Layout

| Path | Contents |
|---|---|
| `docs/plan.md` | the plan (authoritative) |
| `docs/playback-grant.md` | how an audio host verifies the `?grant=` JWT |
| `lexicons/eu/musicstreamer/` | lexicon JSON: records and XRPC methods (plus shared `defs`) |
| `appview/` | Cloudflare Worker: XRPC API, Jetstream ingest (Durable Object), track verification (Queue), settlement (Cron), D1 schema in `migrations/0001_init.sql` |
| `brand/` | logo, mark and the identity notes |
| `site/` | static SvelteKit landing page (German and English) |

## Build

Requires Node and pnpm.

```sh
pnpm install
pnpm typecheck
pnpm build        # wrangler deploy --dry-run for appview, vite build for site
```

Nothing is deployed by these commands.

## Configuring the appview

`appview/wrangler.jsonc` contains placeholder IDs and `vars` (service account DID and PDS URL,
Wise profile and balance IDs, bank IBAN and account holder). Replace them before deploying.

Secrets (names only, see `appview/.dev.vars.example`):

- `ADMIN_SECRET` — bearer token for `/admin/*`
- `GRANT_PRIVATE_JWK` — ES256 (P-256) private key as JWK; the public half is served in `did.json`
- `PLAY_TOKEN_SECRET` — HMAC key for `playId` tokens
- `SERVICE_HANDLE`, `SERVICE_APP_PASSWORD` — service account that publishes `actor.verification` and `settlement.statement` records
- `WISE_API_TOKEN`, `WISE_WEBHOOK_PUBLIC_KEY`

Set them with `wrangler secret put <NAME>`; never commit values.

## License

MIT, see [LICENSE](LICENSE).
