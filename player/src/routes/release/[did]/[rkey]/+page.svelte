<script lang="ts">
  import { page } from '$app/state';
  import Art from '#lib/components/Art.svelte';
  import Status from '#lib/components/Status.svelte';
  import TrackList from '#lib/components/TrackList.svelte';
  import { auth } from '#lib/auth.svelte.ts';
  import { authorName } from '#lib/format.ts';
  import { t } from '#lib/i18n.svelte.ts';
  import { library, toggleLike } from '#lib/library.svelte.ts';
  import { playTracks } from '#lib/player.svelte.ts';
  import { Resource } from '#lib/resource.svelte.ts';
  import { api } from '#lib/xrpc.ts';

  type Result = Awaited<ReturnType<typeof api.getRelease>>;
  const r = new Resource<Result>();
  const uri = $derived(`at://${page.params.did}/eu.musicstreamer.music.release/${page.params.rkey}`);
  let error = $state('');

  const load = () => r.run(() => api.getRelease(uri));
  $effect(() => {
    if (uri) load();
  });

  async function like(ref: { uri: string; cid: string }) {
    error = '';
    try {
      await toggleLike(ref);
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

<Status {r} retry={load}>
  {#snippet children({ release, tracks })}
    <div class="hero">
      <div style="width: 11rem"><Art did={release.author.did} blob={release.record.artwork} /></div>
      <div>
        <span class="badge plain">{t(`type.${release.record.type}`)}</span>
        <h1>{release.record.title}</h1>
        <p><a href="/artist/{release.author.did}">{authorName(release.author)}</a> <span class="small muted">{release.record.releaseDate ?? ''}</span></p>
        <div class="row">
          <button class="primary" disabled={!tracks.length} onclick={() => playTracks(tracks, 0)}>▶︎ {t('play')}</button>
          {#if auth.did}
            <button aria-pressed={!!library.likes[release.uri]} onclick={() => like(release)}>{library.likes[release.uri] ? '♥' : '♡'} {t('like')}</button>
          {/if}
        </div>
        {#if error}<p class="small" role="alert" style="color: var(--accent)">{error}</p>{/if}
      </div>
    </div>
    {#if tracks.length}
      <TrackList {tracks} />
      {#if tracks.length < release.record.tracks.length}<p class="small muted">{t('release.missing', { n: release.record.tracks.length - tracks.length })}</p>{/if}
    {:else}
      <p class="state">{t('empty.tracks')}</p>
    {/if}
  {/snippet}
</Status>
