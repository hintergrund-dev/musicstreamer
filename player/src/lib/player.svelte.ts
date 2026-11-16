import type { PlayerError } from '@musicstreamer/native-audio';
import { blobUrl } from './blob';
import { isCapacitor } from './config';
import { HtmlEngine } from './audio/html';
import type { AudioEngine, QueueTrack } from './audio/engine';
import type { TrackView } from './types';

export const player = $state({
  queue: [] as QueueTrack[],
  index: -1,
  positionMs: 0,
  durationMs: 0,
  playing: false,
  error: '' as PlayerError['code'],
});

let engine: AudioEngine | undefined;

export async function getEngine(): Promise<AudioEngine> {
  if (engine) return engine;
  engine = isCapacitor ? (await import('./audio/native')).nativeEngine : new HtmlEngine();
  engine.onState((s) => {
    Object.assign(player, s);
    updateMediaSession();
  });
  engine.onError((e) => (player.error = e.code));
  if (!isCapacitor) bindMediaSession(engine);
  return engine;
}

export async function queueTrack(t: TrackView): Promise<QueueTrack> {
  return {
    uri: t.uri,
    title: t.record.title,
    artist: t.record.artists.map((a) => a.name).join(', '),
    artworkUrl: await blobUrl(t.author.did, t.record.artwork),
    durationMs: t.record.durationMs,
  };
}

/** Replaces the queue and starts playing at `startIndex`. */
export async function playTracks(tracks: TrackView[], startIndex = 0) {
  const e = await getEngine();
  const queue = await Promise.all(tracks.map(queueTrack));
  player.queue = queue;
  player.error = '';
  await e.setQueue(queue, startIndex);
}

export const jumpTo = async (i: number) => {
  player.error = '';
  await (await getEngine()).setQueue($state.snapshot(player.queue), i);
};
export const toggle = async () => ((await getEngine())[player.playing ? 'pause' : 'play']());
export const next = async () => (await getEngine()).next();
export const previous = async () => (await getEngine()).previous();
export const seek = async (ms: number) => (await getEngine()).seek(ms);

/** Media keys and system controls on web and desktop. On phones the native plugin owns these. */
function bindMediaSession(e: AudioEngine) {
  if (!('mediaSession' in navigator)) return;
  const set = (a: MediaSessionAction, h: MediaSessionActionHandler) => navigator.mediaSession.setActionHandler(a, h);
  set('play', () => void e.play());
  set('pause', () => void e.pause());
  set('previoustrack', () => void e.previous());
  set('nexttrack', () => void e.next());
  set('seekto', (d) => void e.seek((d.seekTime ?? 0) * 1000));
}

let shown = -1;
function updateMediaSession() {
  if (isCapacitor || !('mediaSession' in navigator)) return;
  const t = player.queue[player.index];
  if (player.index !== shown) {
    shown = player.index;
    navigator.mediaSession.metadata = t
      ? new MediaMetadata({ title: t.title, artist: t.artist, artwork: t.artworkUrl ? [{ src: t.artworkUrl }] : [] })
      : null;
  }
  navigator.mediaSession.playbackState = player.playing ? 'playing' : 'paused';
  if (player.durationMs > 0) {
    navigator.mediaSession.setPositionState({ duration: player.durationMs / 1000, position: Math.min(player.positionMs, player.durationMs) / 1000 });
  }
}
