import { BrowserOAuthClient, type OAuthSession } from '@atproto/oauth-client-browser';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { clientMetadata, isCapacitor, isShell, isTauri, NATIVE_SCHEME } from './config';
import { api, createSession, hooks } from './xrpc';

const TOKEN_KEY = 'ms.token';
type Redirect = `${string}.${string}:/${string}`;
const REDIRECT = `${NATIVE_SCHEME}:/oauth/callback` as Redirect;

export const auth = $state({ ready: false, did: '', handle: '', token: '' });

let client: BrowserOAuthClient;
let session: OAuthSession | undefined;

export const getSession = () => {
  if (!session) throw new Error('Not signed in');
  return session;
};

const read = (): { token: string; expiresAt: string; did: string } | null => {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null');
  } catch {
    return null;
  }
};

async function renew() {
  if (!session) return undefined;
  try {
    const s = await createSession((path, init) => session!.fetchHandler(path, init));
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ ...s, did: session.did }));
    auth.token = s.token;
    return s.token;
  } catch {
    return undefined;
  }
}

async function setSession(s: OAuthSession) {
  session = s;
  auth.did = s.did;
  const stored = read();
  if (stored?.did === s.did && Date.parse(stored.expiresAt) > Date.now() + 86_400_000) auth.token = stored.token;
  else await renew();
  s.fetchHandler(`/xrpc/com.atproto.repo.describeRepo?repo=${s.did}`)
    .then((r) => r.json())
    .then((d) => (auth.handle = d.handle ?? ''))
    .catch(() => {});
}

async function finish(params: URLSearchParams, redirectUri?: Redirect) {
  await setSession((await client.initCallback(params, redirectUri)).session);
}

let started: Promise<void> | undefined;
export const initAuth = () => (started ??= init());

async function init() {
  hooks.token = () => auth.token || undefined;
  hooks.renew = renew;
  client = new BrowserOAuthClient({
    clientMetadata: clientMetadata(isShell) as ConstructorParameters<typeof BrowserOAuthClient>[0]['clientMetadata'],
    handleResolver: 'https://bsky.social',
    responseMode: 'query',
  });
  // Shells: the system browser returns through the registered custom scheme.
  const onUrl = (url: string) => {
    const u = new URL(url);
    if (u.protocol === `${NATIVE_SCHEME}:`) finish(u.searchParams, REDIRECT).then(() => Browser.close().catch(() => {})).catch(console.error);
  };
  if (isCapacitor) App.addListener('appUrlOpen', (e) => onUrl(e.url));
  if (isTauri) {
    const link = await import('@tauri-apps/plugin-deep-link');
    link.onOpenUrl((urls) => urls.forEach(onUrl));
    (await link.getCurrent())?.forEach(onUrl); // the app was started by the return link
  }
  try {
    const restored = location.pathname === '/oauth/callback' ? undefined : await client.initRestore();
    if (restored) await setSession(restored.session);
  } catch (e) {
    console.warn('session restore failed', e);
  }
  auth.ready = true;
}

/** Web: completes the redirect to /oauth/callback. */
export const completeSignIn = async () => {
  await initAuth();
  await finish(new URLSearchParams(location.search));
};

export async function signIn(handle: string) {
  if (!isShell) return void (await client.signInRedirect(handle));
  const url = await client.authorize(handle, { redirect_uri: REDIRECT });
  if (isCapacitor) await Browser.open({ url: url.href });
  else await (await import('@tauri-apps/plugin-opener')).openUrl(url.href);
}

export async function signOut() {
  await api.revokeSession().catch(() => {});
  if (session) await client.revoke(session.did).catch(() => {});
  session = undefined;
  localStorage.removeItem(TOKEN_KEY);
  Object.assign(auth, { did: '', handle: '', token: '' });
}
