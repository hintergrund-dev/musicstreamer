import { activePeriod } from './billing';
import { authenticate, bearer, sha256Hex } from './auth';
import { BASELINE, Env, XrpcError } from './env';
import { grantUrl, readPlayId, signPlayId } from './grant';
import { monthlyGross, isEuCountry } from './vat';
import { bytesToB64u, makeCode } from './util';

type Ctx = { env: Env; did: string; token?: string; p: URLSearchParams; body: any };
// 'required' accepts a service-auth JWT or a player token; 'jwt' only the JWT, 'session' only the player token.
type Method = { type: 'query' | 'procedure'; auth: 'optional' | 'required' | 'jwt' | 'session'; run: (c: Ctx) => Promise<unknown> };
type Rec = { uri: string; cid: string; did: string; json: string; collection: string; sort: string };

const NS = 'eu.musicstreamer.';
const bad = (m: string) => new XrpcError(400, 'InvalidRequest', m);
const PROFILE = (did: string) => `at://${did}/${NS}actor.profile/self`;

// Artist content is only visible when the artist is verified, not banned, active, and the record is not taken down.
const VISIBLE = `r.did IN (SELECT did FROM verifications)
  AND NOT EXISTS (SELECT 1 FROM actors a WHERE a.did=r.did AND (a.banned=1 OR a.status!='active'))
  AND r.uri NOT IN (SELECT uri FROM takedowns) AND (r.status IS NULL OR r.status='ok')`;
const SELECT = 'SELECT r.uri, r.cid, r.did, r.json, r.collection, r.sort FROM records r';

const str = (v: unknown, name: string, max = 2000) => {
  if (typeof v !== 'string' || !v || v.length > max) throw bad(`${name} is required`);
  return v;
};

async function hydrate(env: Env, rows: Rec[]) {
  const dids = [...new Set(rows.map((r) => r.did))];
  const { results } = await env.DB.prepare(
    `SELECT a.did, a.handle, v.kind, r.json FROM actors a
     LEFT JOIN verifications v ON v.did=a.did
     LEFT JOIN records r ON r.uri='at://'||a.did||'/${NS}actor.profile/self'
     WHERE a.did IN (SELECT value FROM json_each(?))`,
  ).bind(JSON.stringify(dids)).all<{ did: string; handle: string | null; kind: string | null; json: string | null }>();
  const authors = new Map(results.map((a) => [a.did, { did: a.did, handle: a.handle ?? undefined, displayName: a.json ? JSON.parse(a.json).displayName : undefined, kind: a.kind ?? undefined }]));
  return rows.map((r) => ({ uri: r.uri, cid: r.cid, author: authors.get(r.did) ?? { did: r.did }, record: JSON.parse(r.json) }));
}

async function tracksByUris(env: Env, uris: string[]) {
  const { results } = await env.DB.prepare(`${SELECT} WHERE r.uri IN (SELECT value FROM json_each(?)) AND r.collection='${NS}music.track' AND ${VISIBLE}`).bind(JSON.stringify(uris)).all<Rec>();
  const views = await hydrate(env, results);
  return uris.map((u) => views.find((v) => v.uri === u)).filter((v) => v);
}

async function oneRecord(env: Env, uri: string, collection: string, visible = true) {
  const row = await env.DB.prepare(`${SELECT} WHERE r.uri=? AND r.collection=? ${visible ? 'AND ' + VISIBLE : ''}`).bind(uri, collection).first<Rec>();
  if (!row) throw new XrpcError(404, 'NotFound');
  return (await hydrate(env, [row]))[0];
}

async function resolveActor(env: Env, actor: string) {
  if (actor.startsWith('did:')) return actor;
  const row = await env.DB.prepare('SELECT did FROM actors WHERE handle=?').bind(actor).first<{ did: string }>();
  if (!row) throw new XrpcError(404, 'NotFound');
  return row.did;
}

/** Releases newest first, keyset-paginated with cursor `sort|uri`. */
async function releases(env: Env, p: URLSearchParams, did?: string) {
  const limit = Math.min(Number(p.get('limit')) || 25, 100);
  const [cs, cu] = (p.get('cursor') ?? '').split('|');
  const binds: unknown[] = [];
  let extra = '';
  if (did) { extra += ' AND r.did=?'; binds.push(did); }
  if (cu !== undefined) { extra += ' AND (r.sort < ? OR (r.sort = ? AND r.uri < ?))'; binds.push(cs, cs, cu); }
  const { results } = await env.DB.prepare(
    `${SELECT} WHERE r.collection='${NS}music.release' AND ${VISIBLE}${extra} ORDER BY r.sort DESC, r.uri DESC LIMIT ${limit + 1}`,
  ).bind(...binds).all<Rec>();
  const page = results.slice(0, limit);
  const last = page.at(-1);
  return { releases: await hydrate(env, page), cursor: results.length > limit && last ? `${last.sort}|${last.uri}` : undefined };
}

export const methods: Record<string, Method> = {
  [NS + 'catalog.getArtist']: { type: 'query', auth: 'optional', run: async ({ env, p }) => {
    const did = await resolveActor(env, str(p.get('actor'), 'actor'));
    const { author, record } = await oneRecord(env, PROFILE(did), NS + 'actor.profile');
    return { artist: { author, record }, releases: (await releases(env, new URLSearchParams({ limit: '20' }), did)).releases };
  } },
  [NS + 'catalog.getRelease']: { type: 'query', auth: 'optional', run: async ({ env, p }) => {
    const release = await oneRecord(env, str(p.get('uri'), 'uri'), NS + 'music.release');
    return { release, tracks: await tracksByUris(env, (release.record as any).tracks.map((t: any) => t.uri)) };
  } },
  [NS + 'catalog.getTracks']: { type: 'query', auth: 'optional', run: async ({ env, p }) => {
    const uris = p.getAll('uris');
    if (uris.length > 50) throw bad('at most 50 uris');
    return { tracks: await tracksByUris(env, uris) };
  } },
  [NS + 'catalog.getArtistReleases']: { type: 'query', auth: 'optional', run: async ({ env, p }) => releases(env, p, await resolveActor(env, str(p.get('actor'), 'actor'))) },
  [NS + 'catalog.searchCatalog']: { type: 'query', auth: 'optional', run: async ({ env, p }) => {
    const match = (str(p.get('q'), 'q', 200).match(/[\p{L}\p{N}]+/gu) ?? []).map((t) => `"${t}"*`).join(' ');
    const out = { artists: [] as unknown[], releases: [] as unknown[], tracks: [] as unknown[] };
    if (!match) return out;
    const { results } = await env.DB.prepare(
      `${SELECT} JOIN search ON search.uri=r.uri WHERE search MATCH ? AND ${VISIBLE} ORDER BY rank LIMIT ?`,
    ).bind(match, Math.min(Number(p.get('limit')) || 25, 50)).all<Rec>();
    const views = await hydrate(env, results);
    results.forEach((r, i) => (r.collection === NS + 'actor.profile' ? out.artists : r.collection === NS + 'music.release' ? out.releases : out.tracks).push(views[i]));
    return out;
  } },
  [NS + 'catalog.getNewReleases']: { type: 'query', auth: 'optional', run: async ({ env, p }) => releases(env, p) },
  [NS + 'catalog.getPlaylist']: { type: 'query', auth: 'optional', run: async ({ env, p }) => {
    const playlist = await oneRecord(env, str(p.get('uri'), 'uri'), NS + 'music.playlist', false);
    return { playlist, tracks: await tracksByUris(env, ((playlist.record as any).tracks ?? []).map((t: any) => t.uri)) };
  } },
  [NS + 'catalog.getLibrary']: { type: 'query', auth: 'required', run: async ({ env, did }) => {
    const list = async (c: string) => (await env.DB.prepare(`${SELECT} WHERE r.did=? AND r.collection=? ORDER BY r.sort DESC LIMIT 100`).bind(did, NS + c).all<Rec>()).results;
    const raw = (r: Rec) => ({ uri: r.uri, cid: r.cid, record: JSON.parse(r.json) });
    return { likes: (await list('graph.like')).map(raw), follows: (await list('graph.follow')).map(raw), playlists: await hydrate(env, await list('music.playlist')) };
  } },

  [NS + 'player.getPlayback']: { type: 'query', auth: 'required', run: async ({ env, did, p }) => {
    const uri = str(p.get('uri'), 'uri');
    const t = await env.DB.prepare(
      `SELECT r.did, r.json, r.status, (SELECT 1 FROM verifications v WHERE v.did=r.did) AS verified,
              (SELECT 1 FROM actors a WHERE a.did=r.did AND (a.banned=1)) AS banned,
              (SELECT 1 FROM actors a WHERE a.did=r.did AND a.status!='active') AS inactive,
              (SELECT 1 FROM takedowns t WHERE t.uri=r.uri) AS taken
       FROM records r WHERE r.uri=? AND r.collection='${NS}music.track'`,
    ).bind(uri).first<any>();
    if (!t) throw new XrpcError(404, 'TrackUnavailable');
    if (!t.verified || t.banned) throw new XrpcError(403, 'ArtistNotVerified');
    if (t.status !== 'ok' || t.taken || t.inactive) throw new XrpcError(404, 'TrackUnavailable');
    const track = JSON.parse(t.json);
    const accept = p.getAll('accept');
    const src = track.audio.find((s: any) => accept.includes(s.mimeType)) ?? track.audio.find((s: any) => BASELINE.includes(s.mimeType));
    if (!src) throw new XrpcError(404, 'TrackUnavailable');
    if (src.access === 'open') return { url: src.url, mimeType: src.mimeType };

    const sub = await env.DB.prepare('SELECT country FROM subscribers WHERE did=?').bind(did).first<{ country: string }>();
    const period = sub && (await activePeriod(env, did));
    if (!period) throw new XrpcError(402, 'NotSubscribed');
    const societies = [...new Set<string>(track.writers.map((w: any) => w.society).filter(Boolean))];
    if (societies.length) {
      const { results } = await env.DB.prepare('SELECT society FROM licences WHERE country=?').bind(sub.country).all<{ society: string }>();
      if (!societies.every((s) => results.some((l) => l.society === s))) throw new XrpcError(403, 'NotLicensedInCountry');
    }
    const countAfterMs = Math.min(30_000, Math.floor(track.durationMs / 2));
    return {
      url: await grantUrl(env, src.url),
      mimeType: src.mimeType,
      playId: await signPlayId(env, { d: did, t: uri, p: period.id, i: Date.now(), c: countAfterMs }),
      countAfterMs,
    };
  } },
  [NS + 'player.createSession']: { type: 'procedure', auth: 'jwt', run: async ({ env, did }) => {
    const token = bytesToB64u(crypto.getRandomValues(new Uint8Array(32)));
    const expiresAt = Date.now() + 30 * 86_400_000;
    await env.DB.batch([
      env.DB.prepare('DELETE FROM player_sessions WHERE expires_at<?').bind(Date.now()),
      env.DB.prepare('INSERT INTO player_sessions (token_hash, did, expires_at) VALUES (?,?,?)').bind(await sha256Hex(token), did, expiresAt),
    ]);
    return { token, expiresAt: new Date(expiresAt).toISOString() };
  } },
  [NS + 'player.revokeSession']: { type: 'procedure', auth: 'session', run: async ({ env, token }) => {
    await env.DB.prepare('DELETE FROM player_sessions WHERE token_hash=?').bind(await sha256Hex(token!)).run();
    return {};
  } },
  [NS + 'player.reportStream']: { type: 'procedure', auth: 'required', run: async ({ env, did, body }) => {
    const t = await readPlayId(env, str(body?.playId, 'playId', 1000));
    if (!t || t.d !== did) throw new XrpcError(400, 'InvalidPlayId');
    if (Date.now() - t.i < t.c) throw new XrpcError(400, 'TooEarly');
    const res = await env.DB.prepare(
      'INSERT OR IGNORE INTO streams (play_id, did, track_uri, period_id, at) SELECT ?1, ?2, ?3, id, ?4 FROM periods WHERE id=?5 AND settled=0',
    ).bind(body.playId, did, t.t, Date.now(), t.p).run();
    if (!res.meta.changes) {
      const seen = await env.DB.prepare('SELECT 1 FROM streams WHERE play_id=?').bind(body.playId).first();
      throw new XrpcError(400, seen ? 'AlreadyCounted' : 'InvalidPlayId');
    }
    return { counted: true };
  } },

  [NS + 'billing.getPaymentInstructions']: { type: 'procedure', auth: 'required', run: async ({ env, did, body }) => {
    const country = String(body?.country ?? '').toUpperCase();
    if (!isEuCountry(country)) throw new XrpcError(400, 'UnsupportedCountry');
    const row = await env.DB.prepare(
      'INSERT INTO subscribers (did, code, country) VALUES (?,?,?) ON CONFLICT(did) DO UPDATE SET country=excluded.country RETURNING code',
    ).bind(did, makeCode('MS'), country).first<{ code: string }>();
    return { iban: env.BANK_IBAN, accountHolder: env.BANK_ACCOUNT_HOLDER, amountCents: monthlyGross(country), currency: 'EUR', reference: row!.code };
  } },
  [NS + 'billing.getStatus']: { type: 'query', auth: 'required', run: async ({ env, did }) => {
    const s = await env.DB.prepare('SELECT s.country, (SELECT MAX(ends_at) FROM periods WHERE did=s.did) AS paid FROM subscribers s WHERE s.did=?').bind(did).first<{ country: string; paid: number | null }>();
    return { paidUntil: s?.paid ? new Date(s.paid).toISOString() : undefined, country: s?.country };
  } },

  [NS + 'artist.startVerification']: { type: 'procedure', auth: 'required', run: async ({ env, did }) => {
    if (!(await env.DB.prepare('SELECT 1 FROM records WHERE uri=?').bind(PROFILE(did)).first())) throw new XrpcError(400, 'NoProfile');
    const row = await env.DB.prepare('INSERT INTO artists (did, code) VALUES (?,?) ON CONFLICT(did) DO UPDATE SET did=did RETURNING code').bind(did, makeCode('MSV')).first<{ code: string }>();
    return { iban: env.BANK_IBAN, accountHolder: env.BANK_ACCOUNT_HOLDER, amountCents: 100, currency: 'EUR', reference: row!.code };
  } },
  [NS + 'artist.getStatus']: { type: 'query', auth: 'required', run: async ({ env, did }) => {
    const r = await env.DB.prepare(
      `SELECT (SELECT kind FROM verifications WHERE did=?1) AS kind,
              COALESCE((SELECT banned FROM actors WHERE did=?1), 0) AS banned,
              COALESCE((SELECT balance_cents FROM artists WHERE did=?1), 0) AS balance`,
    ).bind(did).first<{ kind: string | null; banned: number; balance: number }>();
    return { verified: !!r!.kind, kind: r!.kind ?? undefined, banned: !!r!.banned, balanceCents: r!.balance };
  } },
  [NS + 'artist.getStatements']: { type: 'query', auth: 'required', run: async ({ env, did }) => {
    const { results } = await env.DB.prepare('SELECT month, track_uri, streams, share_cents, fee_cents FROM statements WHERE did=? ORDER BY month DESC, track_uri').bind(did).all<any>();
    const pay = new Map((await env.DB.prepare('SELECT month, amount_cents FROM payouts WHERE did=?').bind(did).all<any>()).results.map((r) => [r.month, r.amount_cents]));
    const months = Map.groupBy(results, (r) => r.month);
    return { statements: [...months].map(([month, rows]) => ({ month, payoutCents: pay.get(month) ?? 0, tracks: rows.map((r) => ({ uri: r.track_uri, streams: r.streams, shareCents: r.share_cents, societyFeeCents: r.fee_cents })) })) };
  } },

  [NS + 'moderation.createReport']: { type: 'procedure', auth: 'required', run: async ({ env, did, body }) => {
    if (!['ai-generated', 'society-member', 'copyright', 'other'].includes(body?.reason)) throw bad('unknown reason');
    const r = await env.DB.prepare('INSERT INTO reports (reporter, subject, reason, text, at) VALUES (?,?,?,?,?)')
      .bind(did, str(body.subject, 'subject', 512), body.reason, typeof body.text === 'string' ? body.text.slice(0, 10000) : null, Date.now()).run();
    return { id: r.meta.last_row_id };
  } },
};

export async function handleXrpc(env: Env, req: Request, nsid: string): Promise<Response> {
  const m = methods[nsid];
  if (!m) throw new XrpcError(501, 'MethodNotImplemented');
  if (req.method !== (m.type === 'query' ? 'GET' : 'POST')) throw new XrpcError(405, 'InvalidRequest', 'Wrong HTTP method');
  const token = bearer(req);
  const did = m.auth !== 'optional' || req.headers.has('authorization')
    ? await authenticate(env, token, nsid, m.auth === 'jwt' || m.auth === 'session' ? m.auth : undefined)
    : '';
  // Procedures without an input (createSession, revokeSession, startVerification) may send an empty body.
  const body = m.type === 'procedure' ? await req.json().catch(() => ({})) : undefined;
  return Response.json(await m.run({ env, did, token, p: new URL(req.url).searchParams, body }));
}
