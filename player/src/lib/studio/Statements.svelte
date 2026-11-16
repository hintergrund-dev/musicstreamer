<script lang="ts">
  import { onMount } from 'svelte';
  import Status from '#lib/components/Status.svelte';
  import { euro } from '#lib/format.ts';
  import { t } from '#lib/i18n.svelte.ts';
  import { Resource } from '#lib/resource.svelte.ts';
  import type { Statement } from '#lib/types.ts';
  import { api } from '#lib/xrpc.ts';

  const r = new Resource<{ statements: Statement[]; titles: Record<string, string> }>();
  const load = () =>
    r.run(async () => {
      const { statements } = await api.getStatements();
      const uris = [...new Set(statements.flatMap((s) => s.tracks.map((x) => x.uri)))];
      const { tracks } = await api.getTracks(uris).catch(() => ({ tracks: [] }));
      return { statements, titles: Object.fromEntries(tracks.map((x) => [x.uri, x.record.title])) };
    });
  onMount(load);
</script>

<h3>{t('studio.statements')}</h3>
<Status {r} retry={load}>
  {#snippet children({ statements, titles })}
    {#if statements.length === 0}
      <p class="state">{t('studio.statements.empty')}</p>
    {/if}
    {#each statements as s (s.month)}
      <h3>{s.month} <span class="small muted">{t('studio.payout')}: {euro(s.payoutCents)}</span></h3>
      <table>
        <thead><tr><th>{t('studio.track')}</th><th class="n">{t('studio.streams')}</th><th class="n">{t('studio.share')}</th><th class="n">{t('studio.fee')}</th></tr></thead>
        <tbody>
          {#each s.tracks as x (x.uri)}
            <tr><td>{titles[x.uri] ?? x.uri.split('/').pop()}</td><td class="n">{x.streams}</td><td class="n">{euro(x.shareCents)}</td><td class="n">{euro(x.societyFeeCents)}</td></tr>
          {/each}
        </tbody>
      </table>
    {/each}
  {/snippet}
</Status>
