<script lang="ts">
  import { auth } from '#lib/auth.svelte.ts';
  import { fmtTime } from '#lib/format.ts';
  import { t } from '#lib/i18n.svelte.ts';
  import { createPlaylist, library, setPlaylistTracks, toggleLike } from '#lib/library.svelte.ts';
  import { player, playTracks } from '#lib/player.svelte.ts';
  import type { TrackView } from '#lib/types.ts';

  let { tracks, onremove }: { tracks: TrackView[]; onremove?: (i: number) => void } = $props();
  let error = $state('');

  async function guard(fn: () => Promise<unknown>) {
    error = '';
    try {
      await fn();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  async function addTo(e: Event, track: TrackView) {
    const select = e.currentTarget as HTMLSelectElement;
    const choice = select.value;
    select.value = '';
    const ref = { uri: track.uri, cid: track.cid };
    if (choice === 'new') {
      const name = prompt(t('playlist.name'));
      if (name) await guard(() => createPlaylist(name, [ref]));
    } else if (choice) {
      const pl = library.playlists.find((p) => p.uri === choice);
      if (pl) await guard(() => setPlaylistTracks(pl, [...(pl.record.tracks ?? []), ref]));
    }
  }
</script>

{#if error}<p class="small" role="alert" style="color: var(--accent)">{error}</p>{/if}
<ol class="tracks">
  {#each tracks as track, i (track.uri + i)}
    <li class="track" class:current={player.queue[player.index]?.uri === track.uri}>
      <span class="num">{i + 1}</span>
      <span>
        <button class="name" onclick={() => playTracks(tracks, i)}>{track.record.title}</button>
        {#if track.record.explicit}<span class="badge plain">E</span>{/if}
        <br />
        <a class="small" href="/artist/{track.author.did}">{track.record.artists.map((a) => a.name).join(', ')}</a>
      </span>
      <span class="small muted">{fmtTime(track.record.durationMs)}</span>
      <span class="row">
        {#if auth.did}
          <button class="icon" aria-pressed={!!library.likes[track.uri]} aria-label={t('like')} onclick={() => guard(() => toggleLike(track))}>
            {library.likes[track.uri] ? '♥' : '♡'}
          </button>
          <select aria-label={t('playlist.add')} onchange={(e) => addTo(e, track)}>
            <option value="">＋</option>
            {#each library.playlists as pl (pl.uri)}<option value={pl.uri}>{pl.record.name}</option>{/each}
            <option value="new">{t('playlist.new')}</option>
          </select>
        {/if}
        {#if onremove}<button class="icon" aria-label={t('remove')} onclick={() => onremove(i)}>✕</button>{/if}
      </span>
    </li>
  {/each}
</ol>
