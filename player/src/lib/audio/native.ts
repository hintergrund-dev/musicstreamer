import { NativeAudio } from '@musicstreamer/native-audio';
import { APPVIEW_URL } from '../config';
import type { AudioEngine } from './engine';

/** Capacitor: the native plugin owns playback, grants and stream reporting, so it keeps working with the web view suspended. */
export const nativeEngine: AudioEngine = {
  configure: (token) => NativeAudio.configure({ appviewUrl: APPVIEW_URL, token }),
  setQueue: (tracks, startIndex) => NativeAudio.setQueue({ tracks, startIndex }),
  play: () => NativeAudio.play(),
  pause: () => NativeAudio.pause(),
  seek: (positionMs) => NativeAudio.seek({ positionMs }),
  next: () => NativeAudio.next(),
  previous: () => NativeAudio.previous(),
  onState: (cb) => void NativeAudio.addListener('state', cb),
  onError: (cb) => void NativeAudio.addListener('error', cb),
};
