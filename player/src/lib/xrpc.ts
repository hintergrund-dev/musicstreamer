import { APPVIEW_PROXY, APPVIEW_URL, NS } from './config';
import type * as T from './types';

export class XrpcError extends Error {
  constructor(public status: number, public error: string, message?: string) {
    super(message ?? error);
  }
}

/** Set by auth.svelte.ts: the stored player token and a way to mint a new one when it is rejected. */
export const hooks: { token: () => string | undefined; renew: () => Promise<string | undefined> } = {
  token: () => undefined,
  renew: async () => undefined,
};

type Params = Record<string, string | number | string[] | undefined>;

async function call<R>(method: 'GET' | 'POST', name: string, opts: { params?: Params; body?: unknown; auth?: boolean } = {}): Promise<R> {
  const url = new URL(`${APPVIEW_URL}/xrpc/${NS}${name}`);
  for (const [k, v] of Object.entries(opts.params ?? {})) for (const x of [v].flat()) if (x !== undefined) url.searchParams.append(k, String(x));
  const send = (token?: string) =>
    fetch(url, {
      method,
      headers: { ...(token && { authorization: `Bearer ${token}` }), ...(method === 'POST' && { 'content-type': 'application/json' }) },
      body: method === 'POST' ? JSON.stringify(opts.body ?? {}) : undefined,
    });
  let res = await send(hooks.token());
  if (res.status === 401 && opts.auth) {
    const token = await hooks.renew();
    if (token) res = await send(token);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new XrpcError(res.status, data.error ?? 'Error', data.message);
  return data as R;
}

const q = <R>(name: string, params?: Params, auth = false) => call<R>('GET', name, { params, auth });
const p = <R>(name: string, body?: unknown) => call<R>('POST', name, { body, auth: true });

export const api = {
  getNewReleases: (cursor?: string) => q<{ releases: T.ReleaseView[]; cursor?: string }>('catalog.getNewReleases', { cursor, limit: 24 }),
  searchCatalog: (term: string) => q<{ artists: T.ProfileView[]; releases: T.ReleaseView[]; tracks: T.TrackView[] }>('catalog.searchCatalog', { q: term }),
  getArtist: (actor: string) => q<{ artist: T.ProfileView; releases: T.ReleaseView[] }>('catalog.getArtist', { actor }),
  getRelease: (uri: string) => q<{ release: T.ReleaseView; tracks: T.TrackView[] }>('catalog.getRelease', { uri }),
  getTracks: (uris: string[]) => (uris.length ? q<{ tracks: T.TrackView[] }>('catalog.getTracks', { uris: uris.slice(0, 50) }) : Promise.resolve({ tracks: [] })),
  getPlaylist: (uri: string) => q<{ playlist: T.PlaylistView; tracks: T.TrackView[] }>('catalog.getPlaylist', { uri }),
  getLibrary: () =>
    q<{ likes: T.RecordView<{ subject: T.StrongRef }>[]; follows: T.RecordView<{ subject: string }>[]; playlists: T.PlaylistView[] }>('catalog.getLibrary', undefined, true),
  getPlayback: (uri: string, accept: string[]) => q<T.Playback>('player.getPlayback', { uri, accept }, true),
  reportStream: (playId: string) => p<{ counted: boolean }>('player.reportStream', { playId }),
  revokeSession: () => p<object>('player.revokeSession'),
  getBillingStatus: () => q<{ paidUntil?: string; country?: string }>('billing.getStatus', undefined, true),
  getPaymentInstructions: (country: string) => p<T.BankDetails>('billing.getPaymentInstructions', { country }),
  getArtistStatus: () => q<{ verified: boolean; kind?: string; banned: boolean; balanceCents: number }>('artist.getStatus', undefined, true),
  startVerification: () => p<T.BankDetails>('artist.startVerification'),
  getStatements: () => q<{ statements: T.Statement[] }>('artist.getStatements', undefined, true),
};

/** Service-auth call through the listener's PDS; the PDS signs the JWT. Only used for player.createSession. */
export async function createSession(fetchHandler: (path: string, init?: RequestInit) => Promise<Response>) {
  const res = await fetchHandler(`/xrpc/${NS}player.createSession`, {
    method: 'POST',
    headers: { 'atproto-proxy': APPVIEW_PROXY, 'content-type': 'application/json' },
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new XrpcError(res.status, data.error ?? 'Error', data.message);
  return data as { token: string; expiresAt: string };
}
