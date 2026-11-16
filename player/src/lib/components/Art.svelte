<script lang="ts">
  import { blobUrl } from '#lib/blob.ts';
  import type { BlobRef } from '#lib/types.ts';

  let { did = '', blob, url, round = false }: { did?: string; blob?: BlobRef; url?: string; round?: boolean } = $props();
  let src = $state<string>();

  $effect(() => {
    src = url;
    if (url || !blob) return;
    let live = true;
    blobUrl(did, blob).then((u) => live && (src = u));
    return () => (live = false);
  });
</script>

{#if src}
  <img class="art" class:round {src} alt="" loading="lazy" />
{:else}
  <div class="art" class:round></div>
{/if}
