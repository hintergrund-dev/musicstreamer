import type { BlobRef } from './types';

const pds = new Map<string, Promise<string | undefined>>();

/** The PDS endpoint from the DID document (plc or did:web). */
export function pdsOf(did: string) {
  let p = pds.get(did);
  if (!p) {
    const url = did.startsWith('did:web:') ? `https://${decodeURIComponent(did.slice(8))}/.well-known/did.json` : `https://plc.directory/${did}`;
    p = fetch(url)
      .then((r) => r.json())
      .then((d) => d.service?.find((s: { id: string }) => s.id === '#atproto_pds')?.serviceEndpoint as string | undefined)
      .catch(() => undefined);
    pds.set(did, p);
  }
  return p;
}

/** URL of a blob (cover, avatar) in the author's repo, if it can be resolved. */
export async function blobUrl(did: string, blob?: BlobRef) {
  const cid = blob?.ref?.$link;
  const host = cid && (await pdsOf(did));
  return host ? `${host}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}` : undefined;
}
