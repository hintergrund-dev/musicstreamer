<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '#lib/i18n.svelte.ts';
  import { createRecord, listRecords, uploadBlob } from '#lib/pds.ts';
  import type { Release, Track } from '#lib/types.ts';

  type Rec<R> = { uri: string; cid: string; value: R };
  let tracks = $state<Rec<Track>[]>([]);
  let releases = $state<Rec<Release>[]>([]);
  let loading = $state(true);
  let error = $state('');
  let busy = $state(false);
  let f = $state({ title: '', type: 'album' as Release['type'], releaseDate: '', picked: [] as string[] });
  let artwork = $state<File>();

  async function load() {
    loading = true;
    try {
      [tracks, releases] = await Promise.all([listRecords<Track>('music.track'), listRecords<Release>('music.release')]);
      releases.reverse();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function submit(e: Event) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      const record: Release = {
        title: f.title.trim(),
        type: f.type,
        tracks: f.picked.map((uri) => ({ uri, cid: tracks.find((x) => x.uri === uri)!.cid })),
        ...(f.releaseDate && { releaseDate: f.releaseDate }),
        createdAt: new Date().toISOString(),
      };
      if (artwork) record.artwork = await uploadBlob(artwork);
      await createRecord('music.release', record);
      f = { title: '', type: 'album', releaseDate: '', picked: [] };
      artwork = undefined;
      await load();
    } catch (err) {
      error = (err as Error).message;
    } finally {
      busy = false;
    }
  }
  const toggle = (uri: string) => (f.picked = f.picked.includes(uri) ? f.picked.filter((u) => u !== uri) : [...f.picked, uri]);
</script>

<h3>{t('studio.releases')}</h3>
{#if loading}
  <p class="state" role="status">{t('loading')}</p>
{:else if releases.length === 0}
  <p class="state">{t('studio.releases.empty')}</p>
{:else}
  <ul class="list">{#each releases as r (r.uri)}<li><b>{r.value.title}</b> <span class="small muted">{t(`type.${r.value.type}`)} · {r.value.tracks.length}</span></li>{/each}</ul>
{/if}
{#if error}<p class="state err" role="alert">{error}</p>{/if}

<h3>{t('studio.releases.add')}</h3>
{#if !loading && tracks.length === 0}
  <p class="state">{t('studio.releases.needTracks')}</p>
{:else}
  <form onsubmit={submit}>
    <label for="rt">{t('studio.title')}</label>
    <input id="rt" bind:value={f.title} required />
    <label for="ry">{t('studio.type')}</label>
    <select id="ry" bind:value={f.type}>{#each ['album', 'ep', 'single'] as k (k)}<option value={k}>{t(`type.${k as 'album'}`)}</option>{/each}</select>
    <label for="rr">{t('studio.releaseDate')}</label>
    <input id="rr" type="date" bind:value={f.releaseDate} />
    <label for="ra">{t('studio.artwork')}</label>
    <input id="ra" type="file" accept="image/*" onchange={(e) => (artwork = e.currentTarget.files?.[0])} />
    <h3>{t('studio.releases.pick')}</h3>
    {#each tracks as tr (tr.uri)}
      <label class="check"><input type="checkbox" checked={f.picked.includes(tr.uri)} onchange={() => toggle(tr.uri)} />{f.picked.includes(tr.uri) ? `${f.picked.indexOf(tr.uri) + 1}. ` : ''}{tr.value.title}</label>
    {/each}
    <p><button class="primary" disabled={busy || !f.picked.length}>{t('studio.releases.publish')}</button></p>
  </form>
{/if}
