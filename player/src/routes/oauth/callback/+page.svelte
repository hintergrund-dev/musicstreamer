<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { completeSignIn } from '#lib/auth.svelte.ts';
  import { t } from '#lib/i18n.svelte.ts';

  let error = $state('');
  onMount(() =>
    completeSignIn().then(
      () => goto('/', { replaceState: true }),
      (e) => (error = e.message || 'error'),
    ),
  );
</script>

<h1>{t('signin.title')}</h1>
{#if error}
  <p class="state err" role="alert">{t('signin.failed')} {error}</p>
  <a href="/account">{t('signin.button')}</a>
{:else}
  <p class="state" role="status">{t('loading')}</p>
{/if}
