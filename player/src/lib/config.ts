import { Capacitor } from '@capacitor/core';

export const APPVIEW_URL = __APPVIEW_URL__.replace(/\/$/, '');
export const APP_URL = __APP_URL__.replace(/\/$/, '');
export const STORE_BUILD = __STORE_BUILD__;
export const APPVIEW_PROXY = 'did:web:musicstreamer.eu#musicstreamer_appview';
export const NS = 'eu.musicstreamer.';

export const isCapacitor = typeof window !== 'undefined' && Capacitor.isNativePlatform();
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const isShell = isCapacitor || isTauri;

/** atproto requires the custom redirect scheme to be the client_id host in reverse order. */
export const NATIVE_SCHEME = new URL(APP_URL).hostname.split('.').reverse().join('.');

const collections = ['actor.profile', 'music.track', 'music.release', 'music.playlist', 'graph.like', 'graph.follow'];
export const OAUTH_SCOPE = [
  'atproto',
  ...collections.map((c) => `repo:${NS}${c}`),
  'blob:image/*',
  `rpc:${NS}player.createSession?aud=${APPVIEW_PROXY.replace('#', '%23')}`,
].join(' ');

export function clientMetadata(native: boolean) {
  return {
    client_id: `${APP_URL}/oauth/client-metadata${native ? '-native' : ''}.json`,
    client_name: 'musicstreamer.eu',
    client_uri: APP_URL,
    application_type: native ? 'native' : 'web',
    redirect_uris: [native ? `${NATIVE_SCHEME}:/oauth/callback` : `${APP_URL}/oauth/callback`],
    scope: OAUTH_SCOPE,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true,
  };
}
