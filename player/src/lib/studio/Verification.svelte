<script lang="ts">
  import { onMount } from 'svelte';
  import BankDetails from '#lib/components/BankDetails.svelte';
  import { euro } from '#lib/format.ts';
  import { errText, t } from '#lib/i18n.svelte.ts';
  import { Resource } from '#lib/resource.svelte.ts';
  import type { BankDetails as Bank } from '#lib/types.ts';
  import { api } from '#lib/xrpc.ts';

  const r = new Resource<Awaited<ReturnType<typeof api.getArtistStatus>>>();
  let bank = $state<Bank>();
  let error = $state('');
  let busy = $state(false);

  const load = () => r.run(() => api.getArtistStatus());
  onMount(load);

  async function start() {
    busy = true;
    error = '';
    try {
      bank = await api.startVerification();
    } catch (e) {
      error = errText((e as { error?: string }).error ?? 'generic');
    } finally {
      busy = false;
    }
  }
</script>

<h3>{t('studio.verification')}</h3>
{#if r.loading}
  <p class="state" role="status">{t('loading')}</p>
{:else if r.error}
  <p class="state err" role="alert">{errText(r.error)} <button onclick={load}>{t('retry')}</button></p>
{:else if r.data}
  {#if r.data.banned}
    <p class="state err">{t('studio.verification.banned')}</p>
  {:else if r.data.verified}
    <p><span class="badge">{t('artist.verified')}</span> {r.data.kind ? t(r.data.kind === 'collective' ? 'artist.collective' : 'artist.person') : ''}</p>
    <p class="small muted">{t('studio.balance')}: {euro(r.data.balanceCents)}</p>
  {:else}
    <p>{t('studio.verification.intro')}</p>
    <button class="primary" onclick={start} disabled={busy}>{t('studio.verification.start')}</button>
    {#if error}<p class="state err" role="alert">{error}</p>{/if}
    {#if bank}<BankDetails d={bank} />{/if}
  {/if}
{/if}
