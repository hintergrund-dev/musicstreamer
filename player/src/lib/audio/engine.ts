import type { PlayerError, PlayerState, QueueTrack } from '@musicstreamer/native-audio';

export type { QueueTrack };

export interface AudioEngine {
  setQueue(tracks: QueueTrack[], startIndex: number): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  onState(cb: (s: PlayerState) => void): void;
  onError(cb: (e: PlayerError) => void): void;
  /** Native engine only: hand over the player token (and clear it on sign-out with ''). */
  configure?(token: string): Promise<void>;
}
