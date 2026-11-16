import { Env } from './env';
import { grantUrl } from './grant';

const MAX_ATTEMPTS = 3;

/** Fetch the track's first audio source, hash it and compare with the declared sha256. */
async function check(env: Env, uri: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT json FROM records WHERE uri=? AND status='pending'").bind(uri).first<{ json: string }>();
  if (!row) return true; // deleted or already handled
  const src = JSON.parse(row.json).audio[0];
  if (!src.url.startsWith('https://')) return false;
  const res = await fetch(src.access === 'gated' ? await grantUrl(env, src.url) : src.url);
  if (!res.ok || !res.body) return false;
  const digest = new crypto.DigestStream('SHA-256');
  await res.body.pipeTo(digest);
  const got = [...new Uint8Array(await digest.digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return got === String(src.sha256).toLowerCase();
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
