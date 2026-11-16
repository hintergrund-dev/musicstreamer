import { p256 } from '@noble/curves/nist.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { SERVICE_DID, XrpcError } from './env';
import { b64uToBytes, utf8 } from './util';

type DidDoc = {
  alsoKnownAs?: string[];
  verificationMethod?: { id: string; publicKeyMultibase?: string }[];
};

const cache = new Map<string, { doc: DidDoc; exp: number }>();

export async function resolveDid(did: string): Promise<DidDoc> {
  const hit = cache.get(did);
  if (hit && hit.exp > Date.now()) return hit.doc;
  let url: string;
  if (did.startsWith('did:plc:')) url = `https://plc.directory/${did}`;
  else if (did.startsWith('did:web:') && !did.slice(8).includes(':')) url = `https://${decodeURIComponent(did.slice(8))}/.well-known/did.json`;
  else throw new XrpcError(401, 'AuthRequired', 'Unsupported DID method');
  const res = await fetch(url);
  if (!res.ok) throw new XrpcError(401, 'AuthRequired', 'Cannot resolve DID');
  const doc = (await res.json()) as DidDoc;
  cache.set(did, { doc, exp: Date.now() + 5 * 60_000 });
  return doc;
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58btc(s: string): Uint8Array {
  let n = 0n;
  for (const c of s) n = n * 58n + BigInt(B58.indexOf(c));
  const out: number[] = [];
  for (; n > 0n; n >>= 8n) out.unshift(Number(n & 0xffn));
  return Uint8Array.from([...Array(s.length - s.replace(/^1+/, '').length).fill(0), ...out]);
}

/** Decode an atproto `Multikey` (`z` + base58btc of multicodec varint + compressed key). */
function parseMultikey(mb: string): { alg: 'ES256K' | 'ES256'; key: Uint8Array } {
  const raw = base58btc(mb.slice(1));
  if (raw[0] === 0xe7 && raw[1] === 0x01) return { alg: 'ES256K', key: raw.slice(2) };
  if (raw[0] === 0x80 && raw[1] === 0x24) return { alg: 'ES256', key: raw.slice(2) };
  throw new Error('unsupported key type');
}

/** Verify an atproto inter-service JWT for method `lxm`; returns the issuer DID. */
export async function verifyServiceAuth(req: Request, lxm: string): Promise<string> {
  const fail = (m: string) => new XrpcError(401, 'AuthRequired', m);
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw fail('Missing bearer token');
  const parts = token.split('.');
  if (parts.length !== 3) throw fail('Malformed token');
  try {
    const header = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[1])));
    if (typeof claims.iss !== 'string') throw fail('Missing iss');
    const aud = String(claims.aud ?? '');
    if (aud !== SERVICE_DID && aud !== `${SERVICE_DID}#musicstreamer_appview`) throw fail('Wrong audience');
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) throw fail('Token expired');
    if (claims.lxm !== lxm) throw fail('Wrong lxm');
    const did = claims.iss.split('#')[0];
    const kid = header.kid ?? '#atproto';
    const vm = (await resolveDid(did)).verificationMethod?.find((m) => m.id === kid || m.id === did + kid);
    if (!vm?.publicKeyMultibase) throw fail('No signing key');
    const { alg, key } = parseMultikey(vm.publicKeyMultibase);
    if (header.alg !== alg) throw fail('Algorithm does not match key');
    const curve = alg === 'ES256K' ? secp256k1 : p256;
    const msg = utf8(`${parts[0]}.${parts[1]}`);
    if (!curve.verify(b64uToBytes(parts[2]), msg, key, { prehash: true })) throw fail('Bad signature');
    return did;
  } catch (e) {
    throw e instanceof XrpcError ? e : fail('Invalid token');
  }
}
