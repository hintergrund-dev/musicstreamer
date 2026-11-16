<script lang="ts">
  import { page } from '$app/state';
  import Art from '#lib/components/Art.svelte';
  import ReleaseGrid from '#lib/components/ReleaseGrid.svelte';
  import Status from '#lib/components/Status.svelte';
  import { auth } from '#lib/auth.svelte.ts';
  import { authorName } from '#lib/format.ts';
  import { t } from '#lib/i18n.svelte.ts';
  import { library, toggleFollow } from '#lib/library.svelte.ts';
  import { Resource } from '#lib/resource.svelte.ts';
  import { api } from '#lib/xrpc.ts';

  type Result = Awaited<ReturnType<typeof api.getArtist>>;
  const r = new Resource<Result>();
  const actor = $derived(page.params.did ?? '');
  let error = $state('');

  const load = () => r.run(() => api.getArtist(actor));
  $effect(() => {
    if (actor) load();
  });

  async function follow(did: string) {
    error = '';
    try {
      await toggleFollow(did);
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

<Status {r} retry={load}>
  {#snippet children({ artist, releases })}
    {@const p = artist.record}
    <div class="hero">
      <div style="width: 11rem"><Art did={artist.author.did} blob={p?.avatar} round /></div>
      <div>
        <h1>{authorName(artist.author)}</h1>
        <p class="small muted">
          {#if artist.author.kind}<span class="badge">{t('artist.verified')} · {t(artist.author.kind === 'collective' ? 'artist.collective' : 'artist.person')}</span>{/if}
          {#if artist.author.handle}@{artist.author.handle}{/if}
        </p>
        {#if auth.did && auth.did !== artist.author.did}
          <button aria-pressed={!!library.follows[artist.author.did]} onclick={() => follow(artist.author.did)}>
            {library.follows[artist.author.did] ? t('unfollow') : t('follow')}
          </button>
        {/if}
        {#if error}<p class="small" role="alert" style="color: var(--accent)">{error}</p>{/if}
      </div>
    </div>
    {#if p?.description}<p style="white-space: pre-line">{p.description}</p>{/if}
    {#if p?.genres?.length}<p class="small muted">{p.genres.join(' · ')}</p>{/if}
    {#if p?.members?.length}<p class="small">{t('artist.members')}: {p.members.map((m) => m.name).join(', ')}</p>{/if}
    {#if p?.links?.length}
      <p class="small">{#each p.links as l, i (l.url)}{i ? ' · ' : ''}<a href={l.url} rel="noopener noreferrer" target="_blank">{l.label}</a>{/each}</p>
    {/if}
    <h2>{t('artist.releases')}</h2>
    {#if releases.length}<ReleaseGrid {releases} />{:else}<p class="state">{t('empty.artistReleases')}</p>{/if}
  {/snippet}
</Status>
