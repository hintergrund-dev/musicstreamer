// Hand-written from lexicons/eu/musicstreamer. Records come from other people's repos, so every field may be missing.
export type BlobRef = { ref?: { $link?: string }; mimeType?: string };
export type StrongRef = { uri: string; cid: string };
export type Author = { did: string; handle?: string; displayName?: string; kind?: 'person' | 'collective' };
export type View<R> = { uri: string; cid: string; author: Author; record: R };

export type AudioSource = { url: string; mimeType: string; bitrate?: number; size?: number; sha256: string; access: 'gated' | 'open' };
export type Writer = { name: string; role: 'composer' | 'lyricist' | 'arranger'; society?: string; ipi?: string };
export type Profile = {
  displayName: string; description?: string; avatar?: BlobRef; banner?: BlobRef; kind: 'person' | 'collective';
  links?: { label: string; url: string }[]; genres?: string[]; members?: { name: string; did?: string }[]; createdAt?: string;
};
export type Track = {
  title: string; artists: { name: string; did?: string; role?: string }[]; durationMs: number; audio: AudioSource[];
  artwork?: BlobRef; explicit?: boolean; tags?: string[]; releaseDate?: string; writers: Writer[]; iswc?: string; isrc?: string; createdAt: string;
};
export type Release = { title: string; type: 'album' | 'ep' | 'single'; artwork?: BlobRef; releaseDate?: string; tracks: StrongRef[]; upc?: string; label?: string; createdAt: string };
export type Playlist = { name: string; description?: string; cover?: BlobRef; tracks?: StrongRef[]; createdAt: string };

export type TrackView = View<Track>;
export type ReleaseView = View<Release>;
export type PlaylistView = View<Playlist>;
export type ProfileView = { author: Author; record?: Profile };
export type RecordView<R> = { uri: string; cid: string; record: R };

export type BankDetails = { iban: string; accountHolder: string; amountCents: number; currency: string; reference: string };
export type Playback = { url: string; mimeType: string; playId?: string; countAfterMs?: number };
export type Statement = { month: string; payoutCents: number; tracks: { uri: string; streams: number; shareCents: number; societyFeeCents: number }[] };
