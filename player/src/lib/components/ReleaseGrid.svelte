<script lang="ts">
  import { authorName, releasePath } from '#lib/format.ts';
  import type { ReleaseView } from '#lib/types.ts';
  import Art from './Art.svelte';

  let { releases }: { releases: ReleaseView[] } = $props();
</script>

<ul class="grid">
  {#each releases as r (r.uri)}
    <li>
      <a class="card" href={releasePath(r.uri)}>
        <Art did={r.author.did} blob={r.record.artwork} />
        <span class="title">{r.record.title}</span>
        <span class="small muted">{authorName(r.author)}</span>
      </a>
    </li>
  {/each}
</ul>
