<script lang="ts">
  import '@fontsource/instrument-serif/400.css';
  import '../app.css';
  import { page } from '$app/state';
  import { onMount, type Snippet } from 'svelte';
  import PlayerBar from '#lib/components/PlayerBar.svelte';
  import { auth, initAuth, signOut } from '#lib/auth.svelte.ts';
  import { isCapacitor, isShell, isTauri } from '#lib/config.ts';
  import { locale, setLocale, t, type Key } from '#lib/i18n.svelte.ts';
  import { loadLibrary, resetLibrary } from '#lib/library.svelte.ts';
  import { getEngine, player } from '#lib/player.svelte.ts';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    initAuth();
    if (isTauri) checkForUpdate();
    if (!isShell && 'serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js', { type: 'module' }).catch(() => {});
  });

  async function checkForUpdate() {
    try {
      const update = await (await import('@tauri-apps/plugin-updater')).check();
      if (update && confirm(t('update.available', { version: update.version }))) {
        await update.downloadAndInstall();
        alert(t('update.installed'));
      }
    } catch (e) {
      console.warn('update check failed', e);
    }
  }

  $effect(() => {
    if (auth.did) loadLibrary();
    else resetLibrary();
  });
  // The native player calls the appview itself, so it needs the token.
  $effect(() => {
    const token = auth.token;
    if (isCapacitor) getEngine().then((e) => e.configure?.(token));
  });
  $effect(() => {
    document.documentElement.lang = locale.value;
  });

  const links: [string, Key][] = [
    ['/', 'nav.new'],
    ['/search', 'nav.search'],
    ['/library', 'nav.library'],
    ['/account', 'nav.account'],
    ...(isShell ? [] : ([['/studio', 'nav.studio']] as [string, Key][])),
  ];
  const here = (href: string) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));
</script>

<div class="shell" class:no-bar={!player.queue.length}>
  <header class="top">
    <a class="brand" href="/"><img src="/mark.svg" alt="" />musicstreamer<i>.eu</i></a>
    <nav aria-label={t('nav')}>
      {#each links as [href, key] (href)}<a {href} aria-current={here(href) ? 'page' : undefined}>{t(key)}</a>{/each}
    </nav>
    <span class="row small">
      <button class="ghost" onclick={() => setLocale(locale.value === 'de' ? 'en' : 'de')} aria-label={t('language')}>{locale.value === 'de' ? 'EN' : 'DE'}</button>
      {#if auth.did}
        <span class="muted">{auth.handle ? `@${auth.handle}` : ''}</span>
        <button class="ghost" onclick={signOut}>{t('signout')}</button>
      {:else if auth.ready}
        <a href="/account">{t('signin.button')}</a>
      {/if}
    </span>
  </header>
  <main>{@render children()}</main>
  <PlayerBar />
</div>
