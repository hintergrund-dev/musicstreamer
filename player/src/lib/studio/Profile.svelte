<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '#lib/i18n.svelte.ts';
  import { getRecord, putRecord, uploadBlob } from '#lib/pds.ts';
  import type { Profile } from '#lib/types.ts';

  let loading = $state(true);
  let error = $state('');
  let saved = $state(false);
  let busy = $state(false);
  let existing = $state<Profile>();
  let f = $state({ displayName: '', description: '', kind: 'person' as Profile['kind'], genres: '', links: '', members: '' });
  let files = $state<{ avatar?: File; banner?: File }>({});

  onMount(async () => {
    try {
      const rec = await getRecord<Profile>('actor.profile', 'self');
      if (rec) {
        existing = rec.value;
        const v = rec.value;
        f = {
          displayName: v.displayName ?? '',
          description: v.description ?? '',
          kind: v.kind ?? 'person',
          genres: (v.genres ?? []).join(', '),
          links: (v.links ?? []).map((l) => `${l.label} | ${l.url}`).join('\n'),
          members: (v.members ?? []).map((m) => m.name).join(', '),
        };
      }
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  });

  const list = (s: string, sep: RegExp) => s.split(sep).map((x) => x.trim()).filter(Boolean);

  async function save(e: Event) {
    e.preventDefault();
    busy = true;
    error = '';
    saved = false;
    try {
      const links = list(f.links, /\n/).map((l) => {
        const [label, url] = l.split('|').map((x) => x.trim());
        return { label, url };
      });
      const record: Profile = {
        ...existing,
        displayName: f.displayName.trim(),
        kind: f.kind,
        description: f.description.trim() || undefined,
        genres: list(f.genres, /,/),
        links,
        members: f.kind === 'collective' ? list(f.members, /,/).map((name) => ({ name })) : undefined,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      if (files.avatar) record.avatar = await uploadBlob(files.avatar);
      if (files.banner) record.banner = await uploadBlob(files.banner);
      await putRecord('actor.profile', 'self', record);
      existing = record;
      saved = true;
    } catch (err) {
      error = (err as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

{#if loading}
  <p class="state" role="status">{t('loading')}</p>
{:else}
  {#if !existing}<p class="state">{t('studio.profile.none')}</p>{/if}
  <form onsubmit={save}>
    <label for="dn">{t('studio.displayName')}</label>
    <input id="dn" bind:value={f.displayName} maxlength="64" required />
    <label for="kind">{t('studio.kind')}</label>
    <select id="kind" bind:value={f.kind}><option value="person">{t('artist.person')}</option><option value="collective">{t('artist.collective')}</option></select>
    {#if f.kind === 'collective'}
      <label for="mem">{t('studio.members')}</label>
      <input id="mem" bind:value={f.members} />
    {/if}
    <label for="desc">{t('studio.description')}</label>
    <textarea id="desc" bind:value={f.description} maxlength="2560"></textarea>
    <label for="gen">{t('studio.genres')}</label>
    <input id="gen" bind:value={f.genres} />
    <label for="links">{t('studio.links')}</label>
    <textarea id="links" bind:value={f.links} placeholder="Bandcamp | https://…"></textarea>
    <label for="av">{t('studio.avatar')}</label>
    <input id="av" type="file" accept="image/*" onchange={(e) => (files.avatar = e.currentTarget.files?.[0])} />
    <label for="ba">{t('studio.banner')}</label>
    <input id="ba" type="file" accept="image/*" onchange={(e) => (files.banner = e.currentTarget.files?.[0])} />
    <p class="row"><button class="primary" disabled={busy}>{t('save')}</button>{#if saved}<span role="status">{t('saved')}</span>{/if}</p>
    {#if error}<p class="state err" role="alert">{error}</p>{/if}
  </form>
{/if}
