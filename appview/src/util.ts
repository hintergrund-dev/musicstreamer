const enc = new TextEncoder();
export const utf8 = (s: string) => enc.encode(s);

export function b64uToBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export function bytesToB64u(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const jsonB64u = (o: unknown) => bytesToB64u(utf8(JSON.stringify(o)));

export const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

/** Random code without ambiguous characters, e.g. `MS-K7QH2W9D`. */
export function makeCode(prefix: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}-${[...r].map((x) => alphabet[x % alphabet.length]).join('')}`;
}

export const sqlList = (n: number) => Array(n).fill('?').join(',');
