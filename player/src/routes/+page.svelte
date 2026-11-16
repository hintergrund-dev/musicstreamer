<script lang="ts">
  import { onMount } from 'svelte';
  import ReleaseGrid from '#lib/components/ReleaseGrid.svelte';
  import Status from '#lib/components/Status.svelte';
  import { t } from '#lib/i18n.svelte.ts';
  import { Resource } from '#lib/resource.svelte.ts';
  import type { ReleaseView } from '#lib/types.ts';
  import { api } from '#lib/xrpc.ts';

  const r = new Resource<ReleaseView[]>();
  let more = $state<ReleaseView[]>([]);
  let cursor = $state<string>();
  let loadingMore = $state(false);

  const load = () =>
    r.run(async () => {
      const p = await api.getNewReleases();
      cursor = p.cursor;
      more = [];
      return p.releases;
    });
  async function loadMore() {
    loadingMore = true;
    try {
      const p = await api.getNewReleases(cursor);
      cursor = p.cursor;
      more = [...more, ...p.releases];
    } finally {
      loadingMore = false;
    }
  }
  onMount(load);
</script>

<h1>{t('nav.new')}</h1>
<Status {r} retry={load}>
  {#snippet children(releases)}
    {#if releases.length === 0}
      <p class="state">{t('empty.releases')}</p>
    {:else}
      <ReleaseGrid releases={[...releases, ...more]} />
      {#if cursor}<button onclick={loadMore} disabled={loadingMore}>{t('more')}</button>{/if}
    {/if}
  {/snippet}
</Status>
