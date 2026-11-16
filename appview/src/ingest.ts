import { jsonToLex, Lexicons, type LexiconDoc } from '@atproto/lexicon';
import profile from '../../lexicons/eu/musicstreamer/actor/profile.json';
import verification from '../../lexicons/eu/musicstreamer/actor/verification.json';
import track from '../../lexicons/eu/musicstreamer/music/track.json';
import release from '../../lexicons/eu/musicstreamer/music/release.json';
import playlist from '../../lexicons/eu/musicstreamer/music/playlist.json';
import like from '../../lexicons/eu/musicstreamer/graph/like.json';
import follow from '../../lexicons/eu/musicstreamer/graph/follow.json';
import { resolveDid } from './auth';
import { Env } from './env';

const strongRef = {
  lexicon: 1, id: 'com.atproto.repo.strongRef',
  defs: { main: { type: 'object', required: ['uri', 'cid'], properties: { uri: { type: 'string', format: 'at-uri' }, cid: { type: 'string', format: 'cid' } } } },
};

const lex = new Lexicons([strongRef, profile, verification, track, release, playlist, like, follow] as LexiconDoc[]);

export const COLLECTIONS = [profile, verification, track, release, playlist, like, follow].map((d) => d.id);
const NS = (n: string) => `eu.musicstreamer.${n}`;

type JetstreamEvent = {
  did: string;
  kind: 'commit' | 'identity' | 'account';
  commit?: { operation: 'create' | 'update' | 'delete'; collection: string; rkey: string; cid?: string; record?: any };
  identity?: { handle?: string };
  account?: { active: boolean; status?: string };
};

async function fetchHandle(did: string): Promise<string | null> {
  try {
    const aka = (await resolveDid(did)).alsoKnownAs?.find((a) => a.startsWith('at://'));
    return aka ? aka.slice(5) : null;
  } catch {
    return null;
  }
}

const searchText = (collection: string, r: any): string | null => {
  const parts =
    collection === NS('actor.profile') ? [r.displayName, r.description, ...(r.genres ?? [])]
    : collection === NS('music.release') ? [r.title, r.label]
    : collection === NS('music.track') ? [r.title, ...r.artists.map((a: any) => a.name), ...(r.tags ?? [])]
    : null;
  return parts && parts.filter(Boolean).join(' ');
};

export async function handleEvent(env: Env, ev: JetstreamEvent, known: Set<string>): Promise<void> {
  const { did } = ev;
  if (ev.kind === 'identity') {
    if (known.has(did) && ev.identity?.handle) await env.DB.prepare('UPDATE actors SET handle=? WHERE did=?').bind(ev.identity.handle, did).run();
    return;
  }
  if (ev.kind === 'account') {
    if (known.has(did) && ev.account) {
      await env.DB.prepare('UPDATE actors SET status=? WHERE did=?').bind(ev.account.active ? 'active' : (ev.account.status ?? 'inactive'), did).run();
    }
    return;
  }
  const c = ev.commit;
  if (!c || !COLLECTIONS.includes(c.collection)) return;
  const isVerification = c.collection === NS('actor.verification');
  if (isVerification && did !== env.SERVICE_ACCOUNT_DID) return;

  if (!known.has(did)) {
    await env.DB.prepare('INSERT OR IGNORE INTO actors (did, handle) VALUES (?, ?)').bind(did, await fetchHandle(did)).run();
    known.add(did);
  }

  const uri = `at://${did}/${c.collection}/${c.rkey}`;
  if (c.operation === 'delete') {
    if (isVerification) await env.DB.prepare('DELETE FROM verifications WHERE rkey=?').bind(c.rkey).run();
    else await env.DB.batch([env.DB.prepare('DELETE FROM records WHERE uri=?').bind(uri), env.DB.prepare('DELETE FROM search WHERE uri=?').bind(uri)]);
    return;
  }

  const record = { ...c.record, $type: c.collection };
  try {
    lex.assertValidRecord(c.collection, jsonToLex(record));
    if (c.collection === NS('actor.profile') && c.rkey !== 'self') throw new Error('profile key must be self');
  } catch (e) {
    console.log('skip invalid record', uri, String(e));
    return;
  }

  if (isVerification) {
    await env.DB.prepare('INSERT OR REPLACE INTO verifications (did, rkey, kind) VALUES (?, ?, ?)').bind(record.subject, c.rkey, record.kind).run();
    return;
  }

  const isTrack = c.collection === NS('music.track');
  const stmts = [
    env.DB.prepare('INSERT OR REPLACE INTO records (uri, did, collection, rkey, cid, json, sort, status) VALUES (?,?,?,?,?,?,?,?)')
      .bind(uri, did, c.collection, c.rkey, c.cid ?? '', JSON.stringify(record), record.createdAt ?? '', isTrack ? 'pending' : null),
    env.DB.prepare('DELETE FROM search WHERE uri=?').bind(uri),
  ];
  const text = searchText(c.collection, record);
  if (text) stmts.push(env.DB.prepare('INSERT INTO search (uri, text) VALUES (?, ?)').bind(uri, text));
  await env.DB.batch(stmts);
  if (isTrack) await env.VERIFY_QUEUE.send({ uri });
}
