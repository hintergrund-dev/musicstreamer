<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '#lib/auth.svelte.ts';
  import { fmtTime, parts } from '#lib/format.ts';
  import { t } from '#lib/i18n.svelte.ts';
  import { createRecord, listRecords, uploadBlob } from '#lib/pds.ts';
  import { hashFile } from '#lib/sha256.ts';
  import type { Track } from '#lib/types.ts';
  import { api } from '#lib/xrpc.ts';

  const BASELINE = ['audio/mpeg', 'audio/mp4'];
  const MIMES = ['audio/mpeg', 'audio/mp4', 'audio/flac', 'audio/ogg', 'audio/opus'];
  const guessMime = (type: string) => (type === 'audio/mpeg' ? 'audio/mpeg' : /mp4|aac|m4a/.test(type) ? 'audio/mp4' : (MIMES.find((m) => m === type) ?? 'audio/mpeg'));
  const newSource = () => ({ url: '', mimeType: 'audio/mpeg', access: 'gated' as 'gated' | 'open', sha256: '', size: 0, progress: 0, check: '' });
  const newForm = () => ({
    title: '', artists: '', durationMs: 0, explicit: false, tags: '', releaseDate: '', isrc: '', iswc: '',
    writers: [{ name: '', role: 'composer', society: '' }],
    audio: [newSource()],
  });

  let rows = $state<{ uri: string; value: Track; listed: boolean }[]>([]);
  let loading = $state(true);
  let error = $state('');
  let busy = $state(false);
  let f = $state(newForm());
  let artwork = $state<File>();
  const hasBaseline = $derived(f.audio.some((s) => BASELINE.includes(s.mimeType)));

  async function load() {
    loading = true;
    error = '';
    try {
      const recs = await listRecords<Track>('music.track');
      // The appview only returns tracks that passed its check.
      const seen = new Set((await api.getTracks(recs.map((r) => r.uri).slice(-50)).catch(() => ({ tracks: [] }))).tracks.map((x) => x.uri));
      rows = recs.map((r) => ({ uri: r.uri, value: r.value, listed: seen.has(r.uri) })).reverse();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
  onMount(load);

  /** Compares the local file's size with the URL's Content-Length. Hosts that block cross-origin requests or gate the file cannot be checked here. */
  async function checkLength(s: (typeof f.audio)[number]) {
    if (!s.size || !/^https:\/\//.test(s.url)) return (s.check = '');
    try {
      const len = Number((await fetch(s.url, { method: 'HEAD' })).headers.get('content-length'));
      s.check = len === s.size ? t('studio.check.ok') : len ? t('studio.check.mismatch', { remote: len, local: s.size }) : t('studio.check.unknown');
    } catch {
      s.check = t('studio.check.unknown');
    }
  }

  async function pick(s: (typeof f.audio)[number], file?: File) {
    if (!file) return;
    s.mimeType = guessMime(file.type);
    s.size = file.size;
    s.sha256 = '';
    s.progress = 0;
    if (!f.durationMs) {
      const a = new Audio(URL.createObjectURL(file));
      a.onloadedmetadata = () => {
        if (Number.isFinite(a.duration)) f.durationMs = Math.round(a.duration * 1000);
        URL.revokeObjectURL(a.src);
      };
    }
    s.sha256 = await hashFile(file, (p) => (s.progress = p));
    await checkLength(s);
  }

  async function submit(e: Event) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
      const record: Track = {
        title: f.title.trim(),
        artists: list(f.artists).map((name) => ({ name })),
        durationMs: f.durationMs,
        audio: f.audio.map((s) => ({ url: s.url.trim(), mimeType: s.mimeType, access: s.access, sha256: s.sha256, ...(s.size && { size: s.size }) })),
        writers: f.writers.filter((w) => w.name.trim()).map((w) => ({ name: w.name.trim(), role: w.role as 'composer', ...(w.society.trim() && { society: w.society.trim() }) })),
        ...(f.explicit && { explicit: true }),
        ...(f.tags.trim() && { tags: list(f.tags) }),
        ...(f.releaseDate && { releaseDate: f.releaseDate }),
        ...(f.isrc.trim() && { isrc: f.isrc.trim() }),
        ...(f.iswc.trim() && { iswc: f.iswc.trim() }),
        createdAt: new Date().toISOString(),
      };
      if (artwork) record.artwork = await uploadBlob(artwork);
      await createRecord('music.track', record);
      f = newForm();
      artwork = undefined;
      await load();
    } catch (err) {
      error = (err as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<h3>{t('studio.tracks')}</h3>
{#if loading}
  <p class="state" role="status">{t('loading')}</p>
{:else if rows.length === 0}
  <p class="state">{t('studio.tracks.empty')}</p>
{:else}
  <ul class="list">
    {#each rows as r (r.uri)}
      <li class="row">
        <b>{r.value.title}</b> <span class="small muted">{fmtTime(r.value.durationMs)}</span>
        <span class="badge" class:plain={!r.listed} title={r.listed ? '' : t('studio.tracks.pending.hint')}>{r.listed ? t('studio.tracks.listed') : t('studio.tracks.pending')}</span>
        <span class="small muted">{parts(r.uri).rkey}</span>
      </li>
    {/each}
  </ul>
{/if}
{#if error}<p class="state err" role="alert">{error}</p>{/if}

<h3>{t('studio.tracks.add')}</h3>
<p class="small muted">{t('studio.tracks.hint', { did: auth.did })}</p>
<form onsubmit={submit}>
  <label for="tt">{t('studio.title')}</label>
  <input id="tt" bind:value={f.title} required />
  <label for="ta">{t('studio.artists')}</label>
  <input id="ta" bind:value={f.artists} required />
  <label for="td">{t('studio.duration')}</label>
  <input id="td" type="number" min="1" bind:value={f.durationMs} required />

  <h3>{t('studio.writers')}</h3>
  {#each f.writers as w, i (i)}
    <div class="row">
      <input bind:value={w.name} placeholder={t('studio.writer.name')} aria-label={t('studio.writer.name')} required={i === 0} />
      <select bind:value={w.role} aria-label={t('studio.writer.role')}><option>composer</option><option>lyricist</option><option>arranger</option></select>
      <input bind:value={w.society} placeholder={t('studio.writer.society')} aria-label={t('studio.writer.society')} />
      {#if f.writers.length > 1}<button type="button" class="icon" aria-label={t('remove')} onclick={() => f.writers.splice(i, 1)}>✕</button>{/if}
    </div>
  {/each}
  <button type="button" onclick={() => f.writers.push({ name: '', role: 'composer', society: '' })}>{t('studio.writer.add')}</button>

  <h3>{t('studio.audio')}</h3>
  <p class="small muted">{t('studio.audio.hint')}</p>
  {#each f.audio as s, i (i)}
    <div class="fieldset">
      <label for="au{i}">{t('studio.audio.url')}</label>
      <input id="au{i}" type="url" bind:value={s.url} onchange={() => checkLength(s)} placeholder="https://" required />
      <div class="row">
        <select bind:value={s.mimeType} aria-label="MIME">{#each MIMES as m (m)}<option>{m}</option>{/each}</select>
        <select bind:value={s.access} aria-label={t('studio.audio.access')}><option value="gated">gated</option><option value="open">open</option></select>
        {#if f.audio.length > 1}<button type="button" class="icon" aria-label={t('remove')} onclick={() => f.audio.splice(i, 1)}>✕</button>{/if}
      </div>
      <label for="af{i}">{t('studio.audio.file')}</label>
      <input id="af{i}" type="file" accept="audio/*" onchange={(e) => pick(s, e.currentTarget.files?.[0])} />
      {#if s.progress > 0 && !s.sha256}<progress value={s.progress}></progress>{/if}
      {#if s.sha256}<p class="small">SHA-256 <code>{s.sha256}</code> · {s.size} B</p>{/if}
      {#if s.check}<p class="small" role="status">{s.check}</p>{/if}
    </div>
  {/each}
  <button type="button" onclick={() => f.audio.push(newSource())}>{t('studio.audio.add')}</button>
  {#if !hasBaseline}<p class="small" role="alert" style="color: var(--accent)">{t('studio.audio.baseline')}</p>{/if}

  <h3>{t('studio.more')}</h3>
  <label for="tg">{t('studio.tags')}</label>
  <input id="tg" bind:value={f.tags} />
  <label for="rd">{t('studio.releaseDate')}</label>
  <input id="rd" type="date" bind:value={f.releaseDate} />
  <label for="is">ISRC</label>
  <input id="is" bind:value={f.isrc} />
  <label for="iw">ISWC</label>
  <input id="iw" bind:value={f.iswc} />
  <label for="aw">{t('studio.artwork')}</label>
  <input id="aw" type="file" accept="image/*" onchange={(e) => (artwork = e.currentTarget.files?.[0])} />
  <label class="check"><input type="checkbox" bind:checked={f.explicit} />{t('studio.explicit')}</label>
  <p><button class="primary" disabled={busy || !hasBaseline || f.audio.some((s) => !/^[0-9a-f]{64}$/.test(s.sha256))}>{t('studio.tracks.publish')}</button></p>
</form>
