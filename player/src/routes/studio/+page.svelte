<script lang="ts">
  import SignIn from '#lib/components/SignIn.svelte';
  import { auth } from '#lib/auth.svelte.ts';
  import { isShell } from '#lib/config.ts';
  import { t } from '#lib/i18n.svelte.ts';
  import Profile from '#lib/studio/Profile.svelte';
  import Releases from '#lib/studio/Releases.svelte';
  import Statements from '#lib/studio/Statements.svelte';
  import Tracks from '#lib/studio/Tracks.svelte';
  import Verification from '#lib/studio/Verification.svelte';

  const tabs = ['profile', 'tracks', 'releases', 'verification', 'statements'] as const;
  let tab = $state<(typeof tabs)[number]>('profile');
</script>

<h1>{t('nav.studio')}</h1>
{#if isShell}
  <p class="state">{t('studio.webOnly')}</p>
{:else if !auth.did}
  <SignIn prompt={t('studio.signin')} />
{:else}
  <div class="tabs" role="group">
    {#each tabs as k (k)}<button aria-pressed={tab === k} onclick={() => (tab = k)}>{t(`studio.tab.${k}`)}</button>{/each}
  </div>
  {#if tab === 'profile'}<Profile />
  {:else if tab === 'tracks'}<Tracks />
  {:else if tab === 'releases'}<Releases />
  {:else if tab === 'verification'}<Verification />
  {:else}<Statements />{/if}
{/if}
