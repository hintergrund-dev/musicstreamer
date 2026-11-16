import type { PluginListenerHandle } from '@capacitor/core';

export interface QueueTrack {
  /** at:// URI of the track record; the native side asks the appview for playback with it. */
  uri: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  durationMs: number;
}

export interface PlayerState {
  index: number;
  positionMs: number;
  durationMs: number;
  playing: boolean;
}

export interface PlayerError {
  index: number;
  /** An appview error name (`NotSubscribed`, `TrackUnavailable`, ...), `AuthRequired`, `Network` or `MediaError`. */
  code: string;
}

export interface NativeAudioPlugin {
  /** Gives the native side the appview base URL and the player token it uses for getPlayback and reportStream. */
  configure(options: { appviewUrl: string; token: string }): Promise<void>;
  setQueue(options: { tracks: QueueTrack[]; startIndex: number }): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(options: { positionMs: number }): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  addListener(event: 'state', cb: (s: PlayerState) => void): Promise<PluginListenerHandle>;
  addListener(event: 'error', cb: (e: PlayerError) => void): Promise<PluginListenerHandle>;
}
