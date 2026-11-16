<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Status from '#lib/components/Status.svelte';
  import TrackList from '#lib/components/TrackList.svelte';
  import { auth } from '#lib/auth.svelte.ts';
  import { authorName } from '#lib/format.ts';
  import { t } from '#lib/i18n.svelte.ts';
  import { deletePlaylist, setPlaylistTracks } from '#lib/library.svelte.ts';
  import { playTracks } from '#lib/player.svelte.ts';
  import { Resource } from '#lib/resource.svelte.ts';
  import type { PlaylistView, TrackView } from '#lib/types.ts';
  import { api } from '#lib/xrpc.ts';

  type Result = { playlist: PlaylistView; tracks: TrackView[] };
  const r = new Resource<Result>();
  const uri = $derived(`at://${page.params.did}/eu.musicstreamer.music.playlist/${page.params.rkey}`);
  let error = $state('');

  const load = () => r.run(() => api.getPlaylist(uri));
  $effect(() => {
    if (uri) load();
  });

  async function edit(fn: () => Promise<unknown>) {
    error = '';
    try {
      await fn();
    } catch (e) {
      error = (e as Error).message;
    }
  }
  const remove = (res: Result, i: number) =>
    edit(async () => {
      const uriToRemove = res.tracks[i].uri;
      const refs = res.playlist.record.tracks ?? [];
      const at = refs.findIndex((x) => x.uri === uriToRemove);
      const playlist = await setPlaylistTracks(res.playlist, refs.filter((_, j) => j !== at));
      r.data = { playlist, tracks: res.tracks.filter((_, j) => j !== i) };
    });
  const rename = (res: Result) =>
    edit(async () => {
      const name = prompt(t('playlist.name'), res.playlist.record.name);
      if (!name) return;
      const record = { ...res.playlist.record, name };
      r.data = { ...res, playlist: await setPlaylistTracks({ ...res.playlist, record }, record.tracks ?? []) };
    });
  const del = (res: Result) =>
    edit(async () => {
      if (!confirm(t('playlist.confirmDelete'))) return;
      await deletePlaylist(res.playlist.uri);
      await goto('/library');
    });
</script>

<Status {r} retry={load}>
  {#snippet children(res)}
    {@const owner = auth.did === res.playlist.author.did}
    <h1>{res.playlist.record.name}</h1>
    <p class="small muted">{t('playlist.by')} {authorName(res.playlist.author)}</p>
    <div class="row">
      <button class="primary" disabled={!res.tracks.length} onclick={() => playTracks(res.tracks, 0)}>▶︎ {t('play')}</button>
      {#if owner}
        <button onclick={() => rename(res)}>{t('rename')}</button>
        <button onclick={() => del(res)}>{t('delete')}</button>
      {/if}
    </div>
    {#if error}<p class="small" role="alert" style="color: var(--accent)">{error}</p>{/if}
    {#if res.tracks.length}
      <TrackList tracks={res.tracks} onremove={owner ? (i) => remove(res, i) : undefined} />
    {:else}
      <p class="state">{t('empty.playlist')}</p>
    {/if}
  {/snippet}
</Status>
