<script lang="ts">
  import { errText, t } from '#lib/i18n.svelte.ts';
  import { fmtTime } from '#lib/format.ts';
  import { jumpTo, next, player, previous, seek, toggle } from '#lib/player.svelte.ts';
  import Art from './Art.svelte';

  let showQueue = $state(false);
  let drag = $state<number>();
  const track = $derived(player.queue[player.index]);
</script>

{#if track}
  <div class="bar" role="region" aria-label={t('player')}>
    {#if player.error}
      <div class="err" role="alert">
        {errText(player.error)}
        {#if player.error === 'NotSubscribed' || player.error === 'AuthRequired'}<a href="/account">{t('nav.account')}</a>{/if}
      </div>
    {/if}
    <div class="now">
      <Art url={track.artworkUrl} />
      <div class="meta"><b>{track.title}</b><span class="small muted">{track.artist}</span></div>
      <div class="row">
        <button class="icon" aria-label={t('previous')} onclick={previous}>⏮︎</button>
        <button class="icon" aria-label={player.playing ? t('pause') : t('play')} onclick={toggle}>{player.playing ? '⏸︎' : '▶︎'}</button>
        <button class="icon" aria-label={t('next')} onclick={next}>⏭︎</button>
      </div>
      <div class="seek">
        <span>{fmtTime(drag ?? player.positionMs)}</span>
        <input
          type="range"
          aria-label={t('seek')}
          min="0"
          max={player.durationMs || 1}
          step="1000"
          value={drag ?? player.positionMs}
          oninput={(e) => (drag = +e.currentTarget.value)}
          onchange={(e) => {
            seek(+e.currentTarget.value);
            drag = undefined;
          }}
        />
        <span>{fmtTime(player.durationMs)}</span>
      </div>
      <button class="icon" aria-label={t('queue')} aria-pressed={showQueue} onclick={() => (showQueue = !showQueue)}>☰</button>
    </div>
    {#if showQueue}
      <ol class="queue">
        {#each player.queue as q, i (q.uri + i)}
          <li><button class:current={i === player.index} onclick={() => jumpTo(i)}><span>{i + 1}.</span><span>{q.title} <span class="muted">{q.artist}</span></span></button></li>
        {/each}
      </ol>
    {/if}
  </div>
{/if}
