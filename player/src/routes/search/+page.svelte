<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Art from '#lib/components/Art.svelte';
  import ReleaseGrid from '#lib/components/ReleaseGrid.svelte';
  import Status from '#lib/components/Status.svelte';
  import TrackList from '#lib/components/TrackList.svelte';
  import { authorName } from '#lib/format.ts';
  import { t } from '#lib/i18n.svelte.ts';
  import { Resource } from '#lib/resource.svelte.ts';
  import { api } from '#lib/xrpc.ts';

  type Result = Awaited<ReturnType<typeof api.searchCatalog>>;
  const r = new Resource<Result>();
  const q = $derived(page.url.searchParams.get('q')?.trim() ?? '');
  let input = $state(page.url.searchParams.get('q') ?? '');

  $effect(() => {
    if (q) r.run(() => api.searchCatalog(q));
  });
</script>

<h1>{t('nav.search')}</h1>
<form class="row" onsubmit={(e) => { e.preventDefault(); goto(`/search?q=${encodeURIComponent(input.trim())}`); }}>
  <input type="search" bind:value={input} placeholder={t('search.placeholder')} aria-label={t('nav.search')} />
  <button class="primary">{t('nav.search')}</button>
</form>

{#if !q}
  <p class="state">{t('search.hint')}</p>
{:else}
  <Status {r} retry={() => r.run(() => api.searchCatalog(q))}>
    {#snippet children(res)}
      {#if !res.artists.length && !res.releases.length && !res.tracks.length}
        <p class="state">{t('search.empty')}</p>
      {/if}
      {#if res.artists.length}
        <h2>{t('search.artists')}</h2>
        <ul class="grid">
          {#each res.artists as a (a.author.did)}
            <li>
              <a class="card" href="/artist/{a.author.did}">
                <Art did={a.author.did} blob={a.record?.avatar} round />
                <span class="title">{authorName(a.author)}</span>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
      {#if res.releases.length}<h2>{t('search.releases')}</h2><ReleaseGrid releases={res.releases} />{/if}
      {#if res.tracks.length}<h2>{t('search.tracks')}</h2><TrackList tracks={res.tracks} />{/if}
    {/snippet}
  </Status>
{/if}
