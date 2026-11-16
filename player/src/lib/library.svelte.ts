import { createRecord, deleteRecord, putRecord, rkeyOf } from './pds';
import type { PlaylistView, StrongRef } from './types';
import { api } from './xrpc';

/** The signed-in listener's likes, follows and playlists. The appview lags the PDS, so writes update this state directly. */
export const library = $state({
  loading: false,
  error: '',
  likes: {} as Record<string, string>, // subject uri -> like record uri
  follows: {} as Record<string, string>, // did -> follow record uri
  playlists: [] as PlaylistView[],
});

export function resetLibrary() {
  Object.assign(library, { loading: false, error: '', likes: {}, follows: {}, playlists: [] });
}

export async function loadLibrary() {
  library.loading = true;
  library.error = '';
  try {
    const l = await api.getLibrary();
    library.likes = Object.fromEntries(l.likes.map((x) => [x.record.subject.uri, x.uri]));
    library.follows = Object.fromEntries(l.follows.map((x) => [x.record.subject, x.uri]));
    library.playlists = l.playlists;
  } catch (e) {
    library.error = e instanceof TypeError ? 'Network' : ((e as { error?: string }).error ?? 'generic');
  } finally {
    library.loading = false;
  }
}

export async function toggleLike(subject: StrongRef) {
  const existing = library.likes[subject.uri];
  if (existing) {
    delete library.likes[subject.uri];
    await deleteRecord('graph.like', rkeyOf(existing));
  } else {
    library.likes[subject.uri] = (await createRecord('graph.like', { subject, createdAt: new Date().toISOString() })).uri;
  }
}

export async function toggleFollow(did: string) {
  const existing = library.follows[did];
  if (existing) {
    delete library.follows[did];
    await deleteRecord('graph.follow', rkeyOf(existing));
  } else {
    library.follows[did] = (await createRecord('graph.follow', { subject: did, createdAt: new Date().toISOString() })).uri;
  }
}

export async function createPlaylist(name: string, tracks: StrongRef[] = []) {
  const record = { name, tracks, createdAt: new Date().toISOString() };
  const { uri, cid } = await createRecord('music.playlist', record);
  library.playlists.push({ uri, cid, author: { did: uri.split('/')[2] }, record });
  return uri;
}

export async function setPlaylistTracks(pl: PlaylistView, tracks: StrongRef[]): Promise<PlaylistView> {
  const record = { ...$state.snapshot(pl.record), tracks };
  const { cid } = await putRecord('music.playlist', rkeyOf(pl.uri), record);
  const mine = library.playlists.find((p) => p.uri === pl.uri);
  if (mine) Object.assign(mine, { cid, record });
  return { ...pl, cid, record };
}

export async function deletePlaylist(uri: string) {
  await deleteRecord('music.playlist', rkeyOf(uri));
  library.playlists = library.playlists.filter((p) => p.uri !== uri);
}

