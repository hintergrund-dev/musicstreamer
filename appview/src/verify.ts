import { BASELINE, Env } from './env';
import { grantUrl } from './grant';


const MAX_ATTEMPTS = 3;

/** The track needs a baseline source (MP3 or AAC); every source is fetched, hashed and compared with its declared sha256. */
async function check(env: Env, uri: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT json FROM records WHERE uri=? AND status='pending'").bind(uri).first<{ json: string }>();
  if (!row) return true; // deleted or already handled
  const audio: { url: string; mimeType: string; sha256: string; access: string }[] = JSON.parse(row.json).audio;
  if (!audio.some((s) => BASELINE.includes(s.mimeType))) return false;
  for (const src of audio) {
    if (!src.url.startsWith('https://')) return false;
    const res = await fetch(src.access === 'gated' ? await grantUrl(env, src.url) : src.url);
    if (!res.ok || !res.body) return false;
    const digest = new crypto.DigestStream('SHA-256');
    await res.body.pipeTo(digest);
    const got = [...new Uint8Array(await digest.digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (got !== String(src.sha256).toLowerCase()) return false;
  }
  return true;
}

export async function verifyBatch(batch: MessageBatch<{ uri: string }>, env: Env) {
  for (const msg of batch.messages) {
    let ok = false;
    try {
      ok = await check(env, msg.body.uri);
    } catch (e) {
      if (msg.attempts < MAX_ATTEMPTS) {
        msg.retry({ delaySeconds: 60 * msg.attempts });
        continue;
      }
    }
    await env.DB.prepare("UPDATE records SET status=? WHERE uri=? AND status='pending'").bind(ok ? 'ok' : 'unavailable', msg.body.uri).run();
    msg.ack();
  }
}
