<script lang="ts">
  import { content, type Lang } from './content';
  let { lang }: { lang: Lang } = $props();
  const t = $derived(content[lang].flow.d);
  const euro = (c: number) => (lang === 'de' ? `${(c / 100).toFixed(2).replace('.', ',')} €` : `€${(c / 100).toFixed(2)}`);
  const shares = [['A', 6, 300], ['B', 3, 150], ['C', 1, 50]] as const;
</script>

<svg class="diagram" viewBox="0 0 360 318" role="img" aria-label={t.title}>
  <defs>
    <marker id="mf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker>
  </defs>
  <rect class="box" x="100" y="6" width="160" height="34" rx="4" />
  <text class="b" x="180" y="28" text-anchor="middle">{t.listener}</text>
  <path class="ln" d="M180 40V66" marker-end="url(#mf)" />
  <rect class="box" x="30" y="68" width="300" height="50" rx="4" />
  <text class="b" x="180" y="90" text-anchor="middle">{t.pay}</text>
  <text class="m" x="180" y="108" text-anchor="middle">{t.split}</text>
  <path class="ln" d="M180 118V144" marker-end="url(#mf)" />
  <rect class="hl" x="10" y="146" width="340" height="50" rx="4" />
  <text class="m" x="180" y="168" text-anchor="middle">{t.ex}</text>
  <text x="180" y="186" text-anchor="middle">{t.tracks}</text>
  {#each shares as [name, n, cents], i}
    {@const cx = 60 + i * 120}
    <path class="ln" d="M180 196L{cx} 238" marker-end="url(#mf)" />
    <rect class="box" x={cx - 50} y="240" width="100" height="68" rx="4" />
    <text x={cx} y="260" text-anchor="middle">{t.artist} {name}</text>
    <text class="b" x={cx} y="280" text-anchor="middle">{euro(cents)}</text>
    <text class="m" x={cx} y="298" text-anchor="middle">{n} {t.of}</text>
  {/each}
</svg>
