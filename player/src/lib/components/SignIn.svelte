<script lang="ts">
  import { auth, signIn } from '#lib/auth.svelte.ts';
  import { isShell } from '#lib/config.ts';
  import { t } from '#lib/i18n.svelte.ts';

  let { prompt = '' }: { prompt?: string } = $props();
  let handle = $state('');
  let busy = $state(false);
  let error = $state('');

  async function submit(e: Event) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      await signIn(handle.trim().replace(/^@/, ''));
    } catch (err) {
      error = (err as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

{#if !auth.did}
  <form class="panel" onsubmit={submit}>
    {#if prompt}<p>{prompt}</p>{/if}
    <label for="handle">{t('signin.handle')}</label>
    <div class="row">
      <input id="handle" bind:value={handle} placeholder="name.bsky.social" autocapitalize="none" autocorrect="off" required />
      <button class="primary" disabled={busy}>{t('signin.button')}</button>
    </div>
    {#if isShell}<p class="small muted">{t('signin.browser')}</p>{/if}
    {#if error}<p class="small" role="alert" style="color: var(--accent)">{error}</p>{/if}
  </form>
{/if}
