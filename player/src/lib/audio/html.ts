import type { PlayerError, PlayerState } from '@musicstreamer/native-audio';
import { api, XrpcError } from '../xrpc';
import type { AudioEngine, QueueTrack } from './engine';
import type { Playback } from '../types';

/** [mime type, codec string for canPlayType]. MP3 and AAC are the baseline every track has. */
const FORMATS = [
  ['audio/mpeg', 'audio/mpeg'],
  ['audio/mp4', 'audio/mp4; codecs="mp4a.40.2"'],
  ['audio/flac', 'audio/flac'],
  ['audio/ogg', 'audio/ogg; codecs="opus"'],
  ['audio/opus', 'audio/ogg; codecs="opus"'],
];

/** Web and desktop: an audio element. Fetches the grant per track and reports the stream after `countAfterMs` of played time. */
export class HtmlEngine implements AudioEngine {
  private a = new Audio();
  private queue: QueueTrack[] = [];
  private index = -1;
  private gen = 0;
  private pb?: Playback;
  private played = 0; // ms of actual playback of the current track
  private last: number | null = null; // previous currentTime, null after a seek or pause
  private reported = false;
  private retried = false;
  private stateCb: (s: PlayerState) => void = () => {};
  private errorCb: (e: PlayerError) => void = () => {};
  private accept = FORMATS.filter(([, test]) => this.a.canPlayType(test)).map(([mime]) => mime);

  constructor() {
    const a = this.a;
    a.preload = 'auto';
    a.addEventListener('timeupdate', () => {
      const t = a.currentTime;
      if (this.last !== null && t > this.last && t - this.last < 1.5) this.played += (t - this.last) * 1000;
      this.last = t;
      this.maybeReport();
      this.emit();
    });
    a.addEventListener('seeking', () => (this.last = null));
    a.addEventListener('playing', () => (this.last = a.currentTime));
    a.addEventListener('pause', () => {
      this.last = null;
      this.emit();
    });
    for (const e of ['play', 'durationchange']) a.addEventListener(e, () => this.emit());
    a.addEventListener('ended', () => void this.next());
    a.addEventListener('error', () => void this.recover());
  }

  private emit() {
    const a = this.a;
    this.stateCb({
      index: this.index,
      positionMs: a.currentTime * 1000,
      durationMs: Number.isFinite(a.duration) ? a.duration * 1000 : (this.queue[this.index]?.durationMs ?? 0),
      playing: !a.paused,
    });
  }

  private fail(index: number, e: unknown) {
    this.errorCb({ index, code: e instanceof XrpcError ? e.error : e instanceof TypeError ? 'Network' : 'MediaError' });
    this.a.pause();
  }

  private maybeReport() {
    const pb = this.pb;
    if (this.reported || !pb?.playId || pb.countAfterMs === undefined || this.played < pb.countAfterMs) return;
    this.reported = true;
    api.reportStream(pb.playId).catch((e) => {
      if (!(e instanceof XrpcError)) this.reported = false; // network failure: try again on the next tick
    });
  }

  private async load(index: number) {
    const gen = ++this.gen;
    this.index = index;
    this.played = 0;
    this.last = null;
    this.reported = false;
    this.retried = false;
    this.pb = undefined;
    this.a.pause();
    this.a.removeAttribute('src');
    this.emit();
    try {
      const pb = await api.getPlayback(this.queue[index].uri, this.accept);
      if (gen !== this.gen) return;
      this.pb = pb;
      this.a.src = pb.url;
      await this.a.play();
    } catch (e) {
      if (gen === this.gen && !(e instanceof DOMException && e.name === 'AbortError')) this.fail(index, e);
    }
  }

  /** The grant lives five minutes; if the host starts refusing, ask for a new one once and resume. The playId is kept, so the track still counts once. */
  private async recover() {
    if (!this.a.src || this.index < 0) return;
    if (this.retried) return this.fail(this.index, null);
    this.retried = true;
    const gen = this.gen;
    const at = this.a.currentTime;
    try {
      const pb = await api.getPlayback(this.queue[this.index].uri, this.accept);
      if (gen !== this.gen) return;
      this.a.src = pb.url;
      this.a.addEventListener('loadedmetadata', () => (this.a.currentTime = at), { once: true });
      await this.a.play();
    } catch (e) {
      this.fail(this.index, e);
    }
  }

  async setQueue(tracks: QueueTrack[], startIndex: number) {
    this.queue = tracks;
    await this.load(startIndex);
  }
  async play() {
    if (this.a.src) await this.a.play();
    else if (this.index >= 0) await this.load(this.index);
  }
  async pause() {
    this.a.pause();
  }
  async seek(positionMs: number) {
    this.a.currentTime = positionMs / 1000;
    this.emit();
  }
  async next() {
    if (this.index + 1 < this.queue.length) await this.load(this.index + 1);
    else {
      this.a.pause();
      this.a.currentTime = 0;
    }
  }
  async previous() {
    if (this.a.currentTime > 3 || this.index <= 0) await this.seek(0);
    else await this.load(this.index - 1);
  }
  onState(cb: (s: PlayerState) => void) {
    this.stateCb = cb;
  }
  onError(cb: (e: PlayerError) => void) {
    this.errorCb = cb;
  }
}
