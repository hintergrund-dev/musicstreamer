<script lang="ts">
  import { content, type Lang } from './content';
  let { lang }: { lang: Lang } = $props();
  const t = $derived(content[lang].built.d);
</script>

<svg class="diagram" viewBox="0 0 360 372" role="img" aria-label={t.title}>
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker>
  </defs>
  <rect class="box" x="6" y="6" width="164" height="56" rx="4" />
  <text class="b" x="88" y="28" text-anchor="middle">{t.repo}</text>
  <text class="m" x="88" y="48" text-anchor="middle">{t.repoSub}</text>
  <rect class="box" x="190" y="6" width="164" height="56" rx="4" />
  <text class="b" x="272" y="28" text-anchor="middle">{t.host}</text>
  <text class="m" x="272" y="48" text-anchor="middle">{t.hostSub}</text>

  <path class="ln" d="M88 62V134" marker-end="url(#ar)" />
  <text class="m" x="96" y="104">{t.records}</text>

  <rect class="box" x="30" y="136" width="300" height="56" rx="4" />
  <text class="b" x="180" y="158" text-anchor="middle">{t.app}</text>
  <text class="m" x="180" y="178" text-anchor="middle">{t.appSub}</text>

  <path class="ln" d="M110 292V194" marker-end="url(#ar)" />
  <text class="m" x="100" y="250" text-anchor="end">{t.ask}</text>
  <path class="ln" d="M180 194V290" marker-end="url(#ar)" />
  <text class="m" x="188" y="250">{t.url}</text>

  <rect class="box" x="30" y="294" width="300" height="56" rx="4" />
  <text class="b" x="180" y="316" text-anchor="middle">{t.player}</text>
  <text class="m" x="180" y="336" text-anchor="middle">{t.playerSub}</text>

  <path class="ln" d="M330 322H350V64" marker-end="url(#ar)" />
  <text class="m" x="342" y="250" text-anchor="middle" transform="rotate(-90 342 250)">{t.audio}</text>
</svg>
