# Playback grant

How an audio host decides whether to serve a `gated` audio source. Status: proposal.

The appview appends a short-lived signed token to the audio URL:

```
https://audio.example.org/track.mp3?grant=<jwt>
```

The host checks the token and serves the file (including `Range` requests) or answers `403`.
The token says "musicstreamer.eu allows this URL to be fetched now". It carries **no listener
identity**, so the host learns nothing about who is listening.

## Token

A JWT (compact serialization), algorithm `ES256` (ECDSA P-256 with SHA-256, signature as raw
64-byte `r || s` as in RFC 7515).

Header: `{ "alg": "ES256", "typ": "JWT", "kid": "did:web:musicstreamer.eu#grant" }`

Claims:

| Claim | Meaning |
|---|---|
| `iss` | `did:web:musicstreamer.eu` |
| `aud` | origin of the audio URL, e.g. `https://audio.example.org` |
| `url` | the full audio URL without the `grant` parameter, normalized (`new URL(url).href`) |
| `iat`, `exp` | unix seconds; `exp` is `iat` + 300 |
| `jti` | random id |

## Key discovery

The public key is in the DID document at `https://musicstreamer.eu/.well-known/did.json`: the
`verificationMethod` entry whose `id` is `did:web:musicstreamer.eu#grant` has the key as
`publicKeyJwk` (`kty: EC`, `crv: P-256`).

- Cache the document for up to one hour.
- If a signature does not verify with the cached key, refetch once (at most once a minute) in case
  the key was rotated, then reject.

## What to reject

Reject with `403` if any of these holds:

- `grant` parameter missing or not a three-part JWT
- `alg` is not `ES256` (never accept `none` or symmetric algorithms)
- signature invalid
- `iss` is not `did:web:musicstreamer.eu`
- `exp` is missing or in the past
- `aud` is not the origin of the request URL
- `url` is not equal to the request URL with the `grant` parameter removed

Do **not** reject a repeated `jti`: the browser sends the same URL with the same grant for every
`Range` request of one playback.

## Reference verifier

```js
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const DID = 'did:web:musicstreamer.eu';
let key, keyAt = 0;

async function grantKey(force) {
  if (key && !force && Date.now() - keyAt < 3600_000) return key;
  const doc = await (await fetch(`https://musicstreamer.eu/.well-known/did.json`)).json();
  const jwk = doc.verificationMethod.find((m) => m.id === `${DID}#grant`).publicKeyJwk;
  keyAt = Date.now();
  return (key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']));
}

export async function verifyGrant(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('grant');
  const [h, p, s] = (token ?? '').split('.');
  if (!s || JSON.parse(atob(h.replace(/-/g, '+').replace(/_/g, '/'))).alg !== 'ES256') return false;
  const data = new TextEncoder().encode(`${h}.${p}`);
  const verify = async (force) => crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await grantKey(force), b64u(s), data);
  if (!(await verify(false)) && !(await verify(true))) return false; // add a once-per-minute limit on forced refetches
  const c = JSON.parse(new TextDecoder().decode(b64u(p)));
  url.searchParams.delete('grant');
  return c.iss === DID && c.exp * 1000 > Date.now() && c.aud === url.origin && c.url === url.href;
}
```

## Notes for implementers

- The grant is valid for five minutes from issue. A player that seeks or resumes after that needs a
  new grant from `player.getPlayback`; hosts should not extend the lifetime.
- Serve `Accept-Ranges: bytes` as the lexicon requires. CORS is not needed: players use an audio element or a native player, not `fetch`.
- Open sources (`access: "open"`) carry no grant and need no check.
- The appview itself fetches gated files with a grant for hash verification, so the check must not
  block requests that carry a valid grant from a non-browser client.
