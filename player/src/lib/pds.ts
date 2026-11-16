import { getSession } from './auth.svelte';
import { NS } from './config';
import type { BlobRef } from './types';
import { XrpcError } from './xrpc';

/** Calls the signed-in user's own PDS with the OAuth session. */
async function xrpc<R>(nsid: string, opts: { params?: Record<string, string | number>; body?: BodyInit | object; type?: string } = {}): Promise<R> {
  const s = getSession();
  const url = new URLSearchParams(opts.params as Record<string, string>);
  const raw = opts.body instanceof Blob || opts.body instanceof File;
  const res = await s.fetchHandler(`/xrpc/${nsid}${opts.params ? `?${url}` : ''}`, {
    method: opts.body ? 'POST' : 'GET',
    headers: opts.body ? { 'content-type': raw ? (opts.type ?? 'application/octet-stream') : 'application/json' } : {},
    body: opts.body ? (raw ? (opts.body as BodyInit) : JSON.stringify(opts.body)) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new XrpcError(res.status, data.error ?? 'Error', data.message);
  return data as R;
}

export const rkeyOf = (uri: string) => uri.split('/').pop()!;

export const createRecord = (collection: string, record: object) =>
  xrpc<{ uri: string; cid: string }>('com.atproto.repo.createRecord', { body: { repo: getSession().did, collection: NS + collection, record: { $type: NS + collection, ...record } } });

export const putRecord = (collection: string, rkey: string, record: object) =>
  xrpc<{ uri: string; cid: string }>('com.atproto.repo.putRecord', { body: { repo: getSession().did, collection: NS + collection, rkey, record: { $type: NS + collection, ...record } } });

export const deleteRecord = (collection: string, rkey: string) =>
  xrpc('com.atproto.repo.deleteRecord', { body: { repo: getSession().did, collection: NS + collection, rkey } });

export const getRecord = <R>(collection: string, rkey: string) =>
  xrpc<{ uri: string; cid: string; value: R }>('com.atproto.repo.getRecord', { params: { repo: getSession().did, collection: NS + collection, rkey } }).catch((e) => {
    if (e instanceof XrpcError && e.status === 400) return null; // RecordNotFound
    throw e;
  });

export async function listRecords<R>(collection: string) {
  const r = await xrpc<{ records: { uri: string; cid: string; value: R }[] }>('com.atproto.repo.listRecords', { params: { repo: getSession().did, collection: NS + collection, limit: 100 } });
  return r.records;
}

export async function uploadBlob(file: File): Promise<BlobRef> {
  return (await xrpc<{ blob: BlobRef }>('com.atproto.repo.uploadBlob', { body: file, type: file.type })).blob;
}
