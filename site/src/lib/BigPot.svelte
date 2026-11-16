<script lang="ts">
  import { content, type Lang } from './content';
  let { lang }: { lang: Lang } = $props();
  const t = $derived(content[lang].diff.d);
  const euro = (c: number) => (lang === 'de' ? `${(c / 100).toFixed(2).replace('.', ',')} €` : `€${(c / 100).toFixed(2)}`);
</script>

<svg class="diagram" viewBox="0 0 360 420" role="img" aria-label={t.title}>
  <defs>
    <marker id="bp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker>
  </defs>
  <text class="b" x="10" y="16">{t.pot}</text>
  <rect class="box" x="30" y="26" width="110" height="30" rx="4" />
  <text x="85" y="46" text-anchor="middle">{t.l1} · {euro(500)}</text>
  <rect class="box" x="220" y="26" width="110" height="30" rx="4" />
  <text x="275" y="46" text-anchor="middle">{t.l2} · {euro(500)}</text>
  <path class="ln" d="M85 56L160 82" marker-end="url(#bp)" />
  <path class="ln" d="M275 56L200 82" marker-end="url(#bp)" />
  <rect class="box" x="120" y="84" width="120" height="30" rx="4" />
  <text class="b" x="180" y="104" text-anchor="middle">{t.potBox}</text>
  <path class="ln" d="M150 114L95 140" marker-end="url(#bp)" />
  <path class="ln" d="M210 114L265 140" marker-end="url(#bp)" />
  <rect class="box" x="30" y="142" width="130" height="46" rx="4" />
  <text x="95" y="162" text-anchor="middle">{t.a}</text>
  <text class="b" x="95" y="180" text-anchor="middle">{euro(900)}</text>
  <rect class="box" x="200" y="142" width="130" height="46" rx="4" />
  <text x="265" y="162" text-anchor="middle">{t.b}</text>
  <text class="b" x="265" y="180" text-anchor="middle">{euro(100)}</text>
  {#each t.note as line, i}
    <text class="m" x="180" y={208 + i * 17} text-anchor="middle">{line}</text>
  {/each}

  <path class="ln dash m" d="M10 270H350" style="stroke: var(--line)" />
  <text class="b" x="10" y="296">{t.per}</text>
  <rect class="box" x="30" y="308" width="130" height="30" rx="4" />
  <text x="95" y="328" text-anchor="middle">{t.l1} · {euro(500)}</text>
  <rect class="box" x="200" y="308" width="130" height="30" rx="4" />
  <text x="265" y="328" text-anchor="middle">{t.l2} · {euro(500)}</text>
  <path class="ln" d="M95 338V362" marker-end="url(#bp)" />
  <path class="ln" d="M265 338V362" marker-end="url(#bp)" />
  <rect class="box" x="30" y="364" width="130" height="46" rx="4" />
  <text x="95" y="384" text-anchor="middle">{t.a}</text>
  <text class="b" x="95" y="402" text-anchor="middle">{euro(500)}</text>
  <rect class="box" x="200" y="364" width="130" height="46" rx="4" />
  <text x="265" y="384" text-anchor="middle">{t.b}</text>
  <text class="b" x="265" y="402" text-anchor="middle">{euro(500)}</text>
</svg>
