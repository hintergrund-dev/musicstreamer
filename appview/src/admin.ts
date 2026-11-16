import { Hono } from 'hono';
import { Env } from './env';
import { deleteVerification } from './pds';
import { settle } from './settle';
import { payoutCsv } from './wise';

export const admin = new Hono<{ Bindings: Env }>();

admin.use('*', async (c, next) => {
  const given = c.req.header('authorization') ?? '';
  const want = `Bearer ${c.env.ADMIN_SECRET}`;
  const ok = c.env.ADMIN_SECRET && given.length === want.length && crypto.subtle.timingSafeEqual(new TextEncoder().encode(given), new TextEncoder().encode(want));
  return ok ? next() : c.json({ error: 'Unauthorized' }, 401);
});

admin.get('/reports', async (c) => c.json((await c.env.DB.prepare('SELECT * FROM reports ORDER BY id DESC LIMIT 200').all()).results));

admin.get('/credits/unmatched', async (c) => c.json((await c.env.DB.prepare("SELECT * FROM credits WHERE status IN ('unmatched','rejected') ORDER BY at DESC").all()).results));

admin.post('/takedown', async (c) => {
  const { uri } = await c.req.json<{ uri: string }>();
  await c.env.DB.prepare('INSERT OR IGNORE INTO takedowns (uri) VALUES (?)').bind(uri).run();
  return c.json({ ok: true });
});

admin.post('/ban', async (c) => {
  const { did } = await c.req.json<{ did: string }>();
  await c.env.DB.prepare('INSERT INTO actors (did, banned) VALUES (?, 1) ON CONFLICT(did) DO UPDATE SET banned=1').bind(did).run();
  const v = await c.env.DB.prepare('SELECT rkey FROM verifications WHERE did=?').bind(did).first<{ rkey: string }>();
  if (v) {
    await deleteVerification(c.env, v.rkey);
    await c.env.DB.prepare('DELETE FROM verifications WHERE did=?').bind(did).run();
  }
  return c.json({ ok: true });
});

admin.get('/licences', async (c) => c.json((await c.env.DB.prepare('SELECT * FROM licences ORDER BY society, country').all()).results));

admin.put('/licences', async (c) => {
  const { society, country, rateBps } = await c.req.json<{ society: string; country: string; rateBps: number }>();
  await c.env.DB.prepare('INSERT OR REPLACE INTO licences (society, country, rate_bps) VALUES (?,?,?)').bind(society, country.toUpperCase(), rateBps).run();
  return c.json({ ok: true });
});

admin.delete('/licences', async (c) => {
  const { society, country } = await c.req.json<{ society: string; country: string }>();
  await c.env.DB.prepare('DELETE FROM licences WHERE society=? AND country=?').bind(society, country.toUpperCase()).run();
  return c.json({ ok: true });
});

/** Payout CSV for one settled month: /admin/payouts.csv?month=2027-01 */
admin.get('/payouts.csv', async (c) => {
  const month = c.req.query('month') ?? '';
  const { results } = await c.env.DB.prepare(
    'SELECT a.legal_name AS name, a.iban, p.amount_cents AS cents FROM payouts p JOIN artists a ON a.did=p.did WHERE p.month=?',
  ).bind(month).all<{ name: string; iban: string; cents: number }>();
  const csv = payoutCsv(results.map((r) => ({ ...r, reference: `musicstreamer.eu ${month}` })));
  return c.body(csv, 200, { 'content-type': 'text/csv', 'content-disposition': `attachment; filename="payouts-${month}.csv"` });
});

admin.post('/settle', async (c) => {
  await settle(c.env);
  return c.json({ ok: true });
});

// Starts (or checks) the Jetstream consumer; its alarm keeps it connected afterwards.
admin.post('/ingest/start', async (c) => c.json(await (await c.env.JETSTREAM.get(c.env.JETSTREAM.idFromName('main')).fetch('https://do/')).json()));
