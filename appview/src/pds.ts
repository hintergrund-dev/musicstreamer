import { Env } from './env';

let session: { did: string; jwt: string; exp: number } | undefined;

async function call(env: Env, method: string, body: unknown, jwt?: string) {
  const res = await fetch(`${env.SERVICE_PDS_URL}/xrpc/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method}: ${res.status} ${await res.text()}`);
  return (await res.json()) as any;
}

async function login(env: Env) {
  if (!session || session.exp < Date.now()) {
    const s = await call(env, 'com.atproto.server.createSession', { identifier: env.SERVICE_HANDLE, password: env.SERVICE_APP_PASSWORD });
    session = { did: s.did, jwt: s.accessJwt, exp: Date.now() + 5 * 60_000 };
  }
  return session;
}

const write = async (env: Env, method: string, body: Record<string, unknown>) => {
  const s = await login(env);
  return call(env, `com.atproto.repo.${method}`, { repo: s.did, ...body }, s.jwt);
};

/** Create an actor.verification record; returns its rkey. */
export async function createVerification(env: Env, subject: string, kind: string): Promise<string> {
  const res = await write(env, 'createRecord', {
    collection: 'eu.musicstreamer.actor.verification',
    record: { $type: 'eu.musicstreamer.actor.verification', subject, kind, createdAt: new Date().toISOString() },
  });
  return res.uri.split('/').pop();
}

export const deleteVerification = (env: Env, rkey: string) =>
  write(env, 'deleteRecord', { collection: 'eu.musicstreamer.actor.verification', rkey });

export const putStatement = (env: Env, month: string, record: Record<string, unknown>) =>
  write(env, 'putRecord', {
    collection: 'eu.musicstreamer.settlement.statement',
    rkey: month,
    record: { $type: 'eu.musicstreamer.settlement.statement', ...record },
  });
