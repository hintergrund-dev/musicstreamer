<script lang="ts">
  import { content, GITHUB, type Lang } from './content';

  let { lang }: { lang: Lang } = $props();
  const c = $derived(content[lang]);
</script>

<svelte:head>
  <title>{c.htmlTitle}</title>
  <meta name="description" content={c.description} />
</svelte:head>

<main>
  <header class="bar">
    <a class="brand" href={lang === 'de' ? '/' : '/en'}><img src="/favicon.svg" alt="" width="30" height="30" /><span>musicstreamer<i>.eu</i></span></a>
    <a class="lang" href={c.nav.otherHref} hreflang={lang === 'de' ? 'en' : 'de'}>{c.nav.other}</a>
  </header>

  <span class="label">{c.label}</span>
  <h1>{c.h1}</h1>
  {#each c.pitch as p}<p>{p}</p>{/each}

  <h2>{c.flow.h}</h2>
  {#each c.flow.p as p}<p>{p}</p>{/each}
  <figure>
    <img class="diagram" src="/diagrams/flow.{lang}.svg" alt={c.flow.d.title} width="760" height="300" />
    <figcaption>{c.flow.cap}</figcaption>
  </figure>

  <h2>{c.diff.h}</h2>
  {#each c.diff.p as p}<p>{p}</p>{/each}
  <figure>
    <img class="diagram" src="/diagrams/pot.{lang}.svg" alt={c.diff.d.title} width="760" height="330" />
    <figcaption>{c.diff.cap}</figcaption>
  </figure>

  <h2>{c.built.h}</h2>
  {#each c.built.p as p}<p>{p}</p>{/each}
  <figure><img class="diagram" src="/diagrams/architecture.{lang}.svg" alt={c.built.d.title} width="760" height="290" /></figure>

  <h2>{c.principles.h}</h2>
  <ul class="facts">
    {#each c.principles.items as [name, text]}<li><strong>{name}</strong><span>{text}</span></li>{/each}
  </ul>

  <h2>{c.artists.h}</h2>
  <p>{c.artists.p}</p>
  <ul class="plain">
    {#each c.artists.items as item}<li>{item}</li>{/each}
  </ul>
  <p>{c.artists.more}</p>

  <h2>{c.open.h}</h2>
  <p>{c.open.p}</p>
  <ul class="plain">
    {#each c.open.items as [name, text]}<li><strong>{name}.</strong> {text}</li>{/each}
  </ul>

  <h2>{c.follow.h}</h2>
  <p>
    {c.follow.p} <strong>{c.follow.handle}</strong>. <a href={GITHUB}>{c.follow.gh}</a>. {c.follow.tail}
  </p>
</main>
