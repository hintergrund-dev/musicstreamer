import { Env } from './env';
import { createVerification } from './pds';
import { monthlyGross } from './vat';
import { Credit, fetchCredits } from './wise';

const MIN_ARTIST_CENTS = 100;

const addMonth = (ms: number) => {
  const d = new Date(ms);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
  return d.getTime();
};

export async function activePeriod(env: Env, did: string) {
  return env.DB.prepare('SELECT id FROM periods WHERE did=? AND starts_at<=? AND ends_at>? AND settled=0').bind(did, Date.now(), Date.now()).first<{ id: number }>();
}

/** Fetch recent credits and process the ones not seen before. */
export async function processCredits(env: Env) {
  for (const credit of await fetchCredits(env)) {
    if (await env.DB.prepare('SELECT 1 FROM credits WHERE id=?').bind(credit.id).first()) continue;
    const [status, did] = await classify(env, credit);
    // Insert last: a crash above means the credit is processed again.
    await env.DB.prepare('INSERT INTO credits (id, amount_cents, currency, reference, sender_name, sender_iban, at, status, did) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(credit.id, credit.cents, credit.currency, credit.reference, credit.senderName, credit.senderIban, credit.at, status, did).run();
  }
}

async function classify(env: Env, c: Credit): Promise<[string, string | null]> {
  const ref = c.reference.toUpperCase();
  if (c.currency !== 'EUR') return ['unmatched', null];

  const artistCode = ref.match(/\bMSV-[A-Z0-9]{8}\b/)?.[0];
  if (artistCode && c.cents >= MIN_ARTIST_CENTS) {
    const a = await env.DB.prepare('SELECT did FROM artists WHERE code=?').bind(artistCode).first<{ did: string }>();
    if (a) {
      const banned = await env.DB.prepare('SELECT 1 FROM artists a JOIN actors x ON x.did=a.did WHERE a.iban=? AND x.banned=1').bind(c.senderIban).first();
      if (banned) return ['rejected', a.did];
      const profile = await env.DB.prepare("SELECT json FROM records WHERE uri=?").bind(`at://${a.did}/eu.musicstreamer.actor.profile/self`).first<{ json: string }>();
      if (!profile) return ['unmatched', a.did];
      await env.DB.prepare('UPDATE artists SET legal_name=?, iban=? WHERE did=?').bind(c.senderName, c.senderIban, a.did).run();
      if (!(await env.DB.prepare('SELECT 1 FROM verifications WHERE did=?').bind(a.did).first())) {
        const kind = JSON.parse(profile.json).kind;
        const rkey = await createVerification(env, a.did, kind);
        await env.DB.prepare('INSERT OR REPLACE INTO verifications (did, rkey, kind) VALUES (?,?,?)').bind(a.did, rkey, kind).run();
      }
      return ['artist', a.did];
    }
  }

  const subCode = ref.match(/\bMS-[A-Z0-9]{8}\b/)?.[0];
  const sub = subCode && (await env.DB.prepare('SELECT did, country FROM subscribers WHERE code=?').bind(subCode).first<{ did: string; country: string }>());
  if (sub) {
    const n = Math.floor(c.cents / monthlyGross(sub.country));
    if (n === 0) return ['unmatched', sub.did];
    const last = await env.DB.prepare('SELECT MAX(ends_at) AS e FROM periods WHERE did=?').bind(sub.did).first<{ e: number | null }>();
    let start = Math.max(Date.now(), last?.e ?? 0);
    for (let i = 0; i < n; i++) {
      const end = addMonth(start);
      await env.DB.prepare('INSERT INTO periods (did, starts_at, ends_at) VALUES (?,?,?)').bind(sub.did, start, end).run();
      start = end;
    }
    return ['subscription', sub.did];
  }
  return ['unmatched', null];
}

