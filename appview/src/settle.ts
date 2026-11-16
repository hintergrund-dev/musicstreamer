import { Env, NET_CENTS } from './env';
import { putStatement } from './pds';
import { splitCents } from './split';

const MIN_PAYOUT_CENTS = 1000;

type Row = { period_id: number; country: string; track_uri: string; n: number; artist: string | null; json: string | null; ok: number | null };

/**
 * Settles all periods that ended in the calendar month before the previous one.
 * Safe to re-run: settled periods are skipped, and the public record is written
 * before the database changes, so a failure in between is repaired by the next run.
 */
export async function settle(env: Env, now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from = Date.UTC(y, m - 2, 1);
  const to = Date.UTC(y, m - 1, 1);
  const month = new Date(from).toISOString().slice(0, 7);

  const periodCount = (await env.DB.prepare('SELECT COUNT(*) AS n FROM periods WHERE settled=0 AND ends_at>=? AND ends_at<?').bind(from, to).first<{ n: number }>())!.n;
  if (periodCount === 0) return;

  const { results: rows } = await env.DB.prepare(
    `SELECT s.period_id, sub.country, s.track_uri, COUNT(*) AS n, r.did AS artist, r.json,
            (v.did IS NOT NULL AND a.banned=0 AND a.status='active' AND t.uri IS NULL) AS ok
     FROM streams s
     JOIN periods p ON p.id=s.period_id
     LEFT JOIN subscribers sub ON sub.did=p.did
     LEFT JOIN records r ON r.uri=s.track_uri
     LEFT JOIN verifications v ON v.did=r.did
     LEFT JOIN actors a ON a.did=r.did
     LEFT JOIN takedowns t ON t.uri=s.track_uri
     WHERE p.settled=0 AND p.ends_at>=? AND p.ends_at<?
     GROUP BY s.period_id, s.track_uri
     ORDER BY s.period_id, s.track_uri`,
  ).bind(from, to).all<Row>();
  const rates = new Map((await env.DB.prepare('SELECT society, country, rate_bps FROM licences').all<{ society: string; country: string; rate_bps: number }>()).results.map((l) => [`${l.society}/${l.country}`, l.rate_bps]));

  const byPeriod = Map.groupBy(rows, (r) => r.period_id);
  const tracks = new Map<string, { artist: string | null; streams: number; share: number; fee: number }>();
  let unallocated = (periodCount - byPeriod.size) * NET_CENTS;
  for (const period of byPeriod.values()) {
    const shares = splitCents(NET_CENTS, period.map((r) => r.n));
    period.forEach((r, i) => {
      const t = tracks.get(r.track_uri) ?? { artist: r.artist, streams: 0, share: 0, fee: 0 };
      tracks.set(r.track_uri, t);
      t.streams += r.n;
      if (!r.ok) return void (unallocated += shares[i]);
      const writers: { society?: string }[] = JSON.parse(r.json!).writers;
      const bps = Math.max(0, ...writers.map((w) => (w.society ? (rates.get(`${w.society}/${r.country}`) ?? 0) : 0)));
      const fee = Math.floor((shares[i] * bps) / 10000);
      t.share += shares[i];
      t.fee += fee;
    });
  }

  const earned = new Map<string, number>();
  for (const t of tracks.values()) if (t.artist) earned.set(t.artist, (earned.get(t.artist) ?? 0) + t.share - t.fee);
  const balances = new Map((await env.DB.prepare('SELECT did, balance_cents FROM artists').all<{ did: string; balance_cents: number }>()).results.map((a) => [a.did, a.balance_cents]));
  const payouts = new Map<string, number>();
  const writes = [] as D1PreparedStatement[];
  for (const [did, cents] of earned) {
    const balance = (balances.get(did) ?? 0) + cents;
    const pay = balance >= MIN_PAYOUT_CENTS;
    if (pay) {
      payouts.set(did, balance);
      writes.push(env.DB.prepare('INSERT OR REPLACE INTO payouts (month, did, amount_cents) VALUES (?,?,?)').bind(month, did, balance));
    }
    writes.push(env.DB.prepare('UPDATE artists SET balance_cents=? WHERE did=?').bind(pay ? 0 : balance, did));
  }
  for (const [uri, t] of tracks) {
    if (t.artist) writes.push(env.DB.prepare('INSERT OR REPLACE INTO statements (month, did, track_uri, streams, share_cents, fee_cents) VALUES (?,?,?,?,?,?)').bind(month, t.artist, uri, t.streams, t.share, t.fee));
  }
  const range = [from, to];
  writes.push(
    env.DB.prepare('DELETE FROM streams WHERE period_id IN (SELECT id FROM periods WHERE settled=0 AND ends_at>=? AND ends_at<?)').bind(...range),
    env.DB.prepare('UPDATE periods SET settled=1 WHERE settled=0 AND ends_at>=? AND ends_at<?').bind(...range),
  );

  await putStatement(env, month, {
    month,
    revenueCents: periodCount * NET_CENTS,
    societyFeesCents: [...tracks.values()].reduce((a, t) => a + t.fee, 0),
    paidOutCents: [...payouts.values()].reduce((a, b) => a + b, 0),
    unallocatedCents: unallocated,
    subscriberPeriods: periodCount,
    tracks: [...tracks].map(([uri, t]) => ({ uri, streams: t.streams })),
    createdAt: new Date().toISOString(),
  });
  await env.DB.batch(writes);
}
