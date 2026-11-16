import { Env, SERVICE_DID } from './env';
import { b64uToBytes, bytesToB64u, jsonB64u, utf8 } from './util';

export const GRANT_KID = `${SERVICE_DID}#grant`;
const GRANT_TTL_S = 300;

const privateKey = (env: Env) =>
  crypto.subtle.importKey('jwk', JSON.parse(env.GRANT_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

/** ES256 playback grant for `url`, valid 5 minutes, carrying no listener identity. */
export async function signGrant(env: Env, url: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  url = new URL(url).href; // normalized, so hosts can compare it with the request URL
  const body = `${jsonB64u({ alg: 'ES256', typ: 'JWT', kid: GRANT_KID })}.${jsonB64u({
    iss: SERVICE_DID, aud: new URL(url).origin, url, iat: now, exp: now + GRANT_TTL_S, jti: crypto.randomUUID(),
  })}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await privateKey(env), utf8(body));
  return `${body}.${bytesToB64u(new Uint8Array(sig))}`;
}

export const grantUrl = async (env: Env, url: string) => {
  const u = new URL(url);
  u.searchParams.set('grant', await signGrant(env, url));
  return u.toString();
};

export function didDocument(env: Env) {
  const { kty, crv, x, y } = JSON.parse(env.GRANT_PRIVATE_JWK);
  return {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/jwk/v1'],
    id: SERVICE_DID,
    verificationMethod: [{ id: GRANT_KID, type: 'JsonWebKey', controller: SERVICE_DID, publicKeyJwk: { kty, crv, x, y, alg: 'ES256', use: 'sig', kid: GRANT_KID } }],
    service: [{ id: '#musicstreamer_appview', type: 'MusicstreamerAppView', serviceEndpoint: 'https://musicstreamer.eu' }],
  };
}

export type PlayToken = { d: string; t: string; p: number; i: number; c: number };

const hmacKey = (env: Env, usage: 'sign' | 'verify') =>
  crypto.subtle.importKey('raw', utf8(env.PLAY_TOKEN_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);

export async function signPlayId(env: Env, p: PlayToken): Promise<string> {
  const body = jsonB64u(p);
  const mac = await crypto.subtle.sign('HMAC', await hmacKey(env, 'sign'), utf8(body));
  return `${body}.${bytesToB64u(new Uint8Array(mac))}`;
}

export async function readPlayId(env: Env, token: string): Promise<PlayToken | null> {
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', await hmacKey(env, 'verify'), b64uToBytes(mac), utf8(body)))) return null;
    return JSON.parse(new TextDecoder().decode(b64uToBytes(body)));
  } catch {
    return null;
  }
}
