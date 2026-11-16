<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { errText, t } from '#lib/i18n.svelte.ts';
  import type { Resource } from '#lib/resource.svelte.ts';

  let { r, retry, children }: { r: Resource<T>; retry: () => void; children: Snippet<[T]> } = $props();
</script>

{#if r.loading}
  <p class="state" role="status">{t('loading')}</p>
{:else if r.error}
  <p class="state err" role="alert">{errText(r.error)} <button onclick={retry}>{t('retry')}</button></p>
{:else if r.data}
  {@render children(r.data)}
{/if}
