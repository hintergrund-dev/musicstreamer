<script lang="ts">
  import BankDetails from '#lib/components/BankDetails.svelte';
  import SignIn from '#lib/components/SignIn.svelte';
  import { auth, signOut } from '#lib/auth.svelte.ts';
  import { STORE_BUILD } from '#lib/config.ts';
  import { errText, t } from '#lib/i18n.svelte.ts';
  import { Resource } from '#lib/resource.svelte.ts';
  import type { BankDetails as Bank } from '#lib/types.ts';
  import { api } from '#lib/xrpc.ts';

  // EU member states: the VAT rate, and so the amount, depends on the country.
  const COUNTRIES = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ');
  const names = new Intl.DisplayNames(undefined, { type: 'region' });

  const status = new Resource<{ paidUntil?: string; country?: string }>();
  let country = $state('');
  let bank = $state<Bank>();
  let busy = $state(false);
  let error = $state('');

  $effect(() => {
    if (auth.did) status.run(() => api.getBillingStatus());
  });
  $effect(() => {
    if (!country && status.data?.country) country = status.data.country;
  });

  async function show(e: Event) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      bank = await api.getPaymentInstructions(country);
    } catch (err) {
      error = errText((err as { error?: string }).error ?? 'generic');
    } finally {
      busy = false;
    }
  }
  const active = (iso?: string) => !!iso && Date.parse(iso) > Date.now();
</script>

<h1>{t('nav.account')}</h1>
{#if !auth.did}
  <SignIn prompt={t('account.signin')} />
{:else}
  <p class="small muted">{auth.handle ? `@${auth.handle}` : auth.did} · <button class="ghost" onclick={signOut}>{t('signout')}</button></p>

  <h2>{t('account.subscription')}</h2>
  {#if status.loading}
    <p class="state" role="status">{t('loading')}</p>
  {:else if status.error}
    <p class="state err" role="alert">{errText(status.error)} <button onclick={() => status.run(() => api.getBillingStatus())}>{t('retry')}</button></p>
  {:else if active(status.data?.paidUntil)}
    <p>{t('account.active', { date: new Date(status.data!.paidUntil!).toLocaleDateString() })}</p>
  {:else}
    <p>{status.data?.paidUntil ? t('account.expired', { date: new Date(status.data.paidUntil).toLocaleDateString() }) : t('account.none')}</p>
  {/if}

  {#if STORE_BUILD}
    <p class="panel">{t('account.manageOnWeb')}</p>
  {:else}
    <h2>{t('account.pay')}</h2>
    <p>{t('account.pay.intro')}</p>
    <form class="row" onsubmit={show}>
      <select bind:value={country} required aria-label={t('account.country')}>
        <option value="" disabled>{t('account.country')}</option>
        {#each COUNTRIES as c (c)}<option value={c}>{names.of(c)}</option>{/each}
      </select>
      <button class="primary" disabled={busy || !country}>{t('account.pay.show')}</button>
    </form>
    {#if error}<p class="state err" role="alert">{error}</p>{/if}
    {#if bank}<BankDetails d={bank} />{/if}
  {/if}
{/if}
