import { Hono } from 'hono';
import { admin } from './admin';
import { processCredits } from './billing';
import { Env, XrpcError } from './env';
import { didDocument } from './grant';
import { Jetstream } from './jetstream';
import { settle } from './settle';
import { verifyBatch } from './verify';
import { handleXrpc } from './xrpc';
import { verifyWebhook } from './wise';

const app = new Hono<{ Bindings: Env }>();

app.get('/.well-known/did.json', (c) => c.json(didDocument(c.env)));

app.all('/xrpc/:nsid', (c) => handleXrpc(c.env, c.req.raw, c.req.param('nsid')));

app.post('/webhooks/wise', async (c) => {
  const body = await c.req.text();
  if (!(await verifyWebhook(c.env, body, c.req.header('x-signature-sha256') ?? null))) return c.text('bad signature', 401);
  if (JSON.parse(body).event_type === 'balances#update') await processCredits(c.env);
  return c.text('ok');
});

app.route('/admin', admin);

app.onError((e, c) => {
  if (e instanceof XrpcError) return c.json({ error: e.error, message: e.message }, e.status as 400);
  console.log('error', e);
  return c.json({ error: 'InternalServerError' }, 500);
});

export { Jetstream };

export default {
  fetch: app.fetch,
  queue: verifyBatch,
  scheduled: (_e: ScheduledController, env: Env, ctx: ExecutionContext) => ctx.waitUntil(settle(env)),
} satisfies ExportedHandler<Env, { uri: string }>;
