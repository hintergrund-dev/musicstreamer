import { registerPlugin } from '@capacitor/core';
import type { NativeAudioPlugin } from './definitions';

export * from './definitions';
export const NativeAudio = registerPlugin<NativeAudioPlugin>('NativeAudio');
