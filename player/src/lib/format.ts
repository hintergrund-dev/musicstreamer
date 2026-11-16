import type { Author } from './types';

export const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const authorName = (a: Author) => a.displayName || (a.handle ? `@${a.handle}` : a.did);
export const euro = (cents: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(cents / 100);
/** at://did/collection/rkey -> [did, rkey] */
export const parts = (uri: string) => ({ did: uri.split('/')[2], rkey: uri.split('/')[4] });
export const releasePath = (uri: string) => `/release/${parts(uri).did}/${parts(uri).rkey}`;
