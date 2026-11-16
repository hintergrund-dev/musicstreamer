<script lang="ts">
  import Art from '#lib/components/Art.svelte';
  import ReleaseGrid from '#lib/components/ReleaseGrid.svelte';
  import SignIn from '#lib/components/SignIn.svelte';
  import TrackList from '#lib/components/TrackList.svelte';
  import { auth } from '#lib/auth.svelte.ts';
  import { authorName, parts } from '#lib/format.ts';
  import { errText, t } from '#lib/i18n.svelte.ts';
  import { createPlaylist, library } from '#lib/library.svelte.ts';
  import { Resource } from '#lib/resource.svelte.ts';
  import type { ProfileView, ReleaseView, TrackView } from '#lib/types.ts';
  import { api } from '#lib/xrpc.ts';

  type Hydrated = { tracks: TrackView[]; releases: ReleaseView[]; artists: ProfileView[] };
  const r = new Resource<Hydrated>();
  let error = $state('');

  // Hydrate likes and follows (the first 50 tracks, 20 releases and 20 artists).
  $effect(() => {
    const likes = Object.keys(library.likes);
    const follows = Object.keys(library.follows);
    if (!auth.did || library.loading) return;
    r.run(async () => {
      const settled = async <T,>(ps: Promise<T>[]) => (await Promise.allSettled(ps)).flatMap((x) => (x.status === 'fulfilled' ? [x.value] : []));
      const [tracks, releases, artists] = await Promise.all([
        api.getTracks(likes.filter((u) => u.includes('music.track')).slice(0, 50)).then((x) => x.tracks),
        settled(likes.filter((u) => u.includes('music.release')).slice(0, 20).map((u) => api.getRelease(u))).then((x) => x.map((y) => y.release)),
        settled(follows.slice(0, 20).map((d) => api.getArtist(d))).then((x) => x.map((y) => y.artist)),
      ]);
      return { tracks, releases, artists };
    });
  });

  async function add(e: Event) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const name = new FormData(form).get('name') as string;
    error = '';
    try {
      await createPlaylist(name.trim());
      form.reset();
    } catch (err) {
      error = (err as Error).message;
    }
  }
</script>

<h1>{t('nav.library')}</h1>
{#if !auth.did}
  <SignIn prompt={t('library.signin')} />
{:else if library.loading && !library.playlists.length}
  <p class="state" role="status">{t('loading')}</p>
{:else if library.error}
  <p class="state err" role="alert">{errText(library.error)}</p>
{:else}
  <h2>{t('library.playlists')}</h2>
  <ul class="list">
    {#each library.playlists as pl (pl.uri)}
      <li><a href="/playlist/{parts(pl.uri).did}/{parts(pl.uri).rkey}">{pl.record.name}</a> <span class="small muted">({pl.record.tracks?.length ?? 0})</span></li>
    {:else}
      <li class="muted">{t('empty.playlists')}</li>
    {/each}
  </ul>
  <form class="row" onsubmit={add}>
    <input name="name" placeholder={t('playlist.name')} aria-label={t('playlist.name')} required />
    <button>{t('playlist.create')}</button>
  </form>
  {#if error}<p class="small" role="alert" style="color: var(--accent)">{error}</p>{/if}

  <h2>{t('library.likes')}</h2>
  {#if r.error}
    <p class="state err" role="alert">{errText(r.error)}</p>
  {:else if r.loading}
    <p class="state" role="status">{t('loading')}</p>
  {:else if r.data}
    {#if r.data.tracks.length || r.data.releases.length}
      {#if r.data.releases.length}<ReleaseGrid releases={r.data.releases} />{/if}
      {#if r.data.tracks.length}<TrackList tracks={r.data.tracks} />{/if}
    {:else}
      <p class="state">{t('empty.likes')}</p>
    {/if}

    <h2>{t('library.follows')}</h2>
    {#if r.data.artists.length}
      <ul class="grid">
        {#each r.data.artists as a (a.author.did)}
          <li>
            <a class="card" href="/artist/{a.author.did}"><Art did={a.author.did} blob={a.record?.avatar} round /><span class="title">{authorName(a.author)}</span></a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="state">{t('empty.follows')}</p>
    {/if}
  {/if}
{/if}
