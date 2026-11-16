export type Lang = 'de' | 'en';

const en = {
  htmlTitle: 'musicstreamer.eu — proposal',
  description: 'A proposed music streaming service on atproto: artists host their own audio, and each listener\'s €5 is split among the tracks that listener streamed.',
  nav: { other: 'Deutsch', otherHref: '/' },
  label: 'Proposal — in development · coming soon',
  h1: 'Music streaming where your €5 goes to the artists you played',
  pitch: [
    'musicstreamer.eu is a proposed streaming service built on atproto. Artists host their own audio files and publish the metadata in their own atproto repository. Listeners pay €5 plus VAT per month by bank transfer. Each listener\'s €5 is split among the tracks that listener streamed.',
    'Nothing here is live yet. This page describes the plan.',
  ],
  flow: {
    h: 'Where your €5 goes',
    p: [
      'You pay €5 plus your country\'s VAT each month by SEPA instant bank transfer. The €5 (net of VAT) is divided among the tracks you streamed, in proportion to your stream count.',
      'A stream counts once you have played 30 seconds of a track, or half the track if it is shorter than 60 seconds. One playback can produce at most one stream.',
    ],
    d: { title: 'Money flow for one listener', listener: 'Listener', pay: '€5 + VAT per month', split: 'The €5 is split by stream count', ex: 'Example: 10 streams this month', tracks: 'Track A ×6 · Track B ×3 · Track C ×1', artist: 'Artist', of: 'of 10' },
    cap: 'Illustrative numbers.',
  },
  diff: {
    h: 'Why it is different',
    p: [
      'In a big-pot model, all subscription money goes into one pool and is shared by total streams. Your money then also pays artists you never played.',
      'Here, your money is divided only among what you played. Listeners who stream little still pay the artists they chose.',
    ],
    d: { title: 'Big pot versus per-listener split', pot: 'One big pot', per: 'Per-listener split', l1: 'Listener 1', l2: 'Listener 2', potBox: 'Pot €10', a: 'Artist X', b: 'Artist Y', note: ['Listener 1 played only X (90 streams),', 'Listener 2 only Y (10 streams).', '€4 of X\'s €9 came from Listener 2.'] },
    cap: 'Illustrative numbers.',
  },
  built: {
    h: 'How it is built',
    p: [
      'Artists host their audio files themselves and publish tracks, releases and a profile as atproto records. The appview indexes these records, checks that the audio matches its declared hash, gates playback, counts streams and settles monthly. Anyone can run another appview on the same lexicons.',
      'To play a track, the player asks the appview for playback. The appview checks the subscription and returns the audio URL with a signed grant valid for 5 minutes. The grant carries no listener identity. The artist\'s host verifies it against a public key published by the appview.',
    ],
    d: { title: 'Architecture', repo: 'Artist\'s atproto repo', repoSub: 'profile, track, release', host: 'Artist\'s audio host', hostSub: 'files, checks the grant', app: 'Appview', appSub: 'index, grants, counts, settles', player: 'Player', playerSub: 'listener\'s app', records: 'records (Jetstream)', ask: 'ask to play', url: 'URL + grant', audio: 'audio + grant' },
  },
  principles: {
    h: 'Principles',
    items: [
      ['Zero cut', 'A non-profit association operates the service and takes no cut. Fixed costs are covered by donations.'],
      ['Open source', 'The code and the lexicons are open source.'],
      ['Public monthly statements', 'Each month\'s totals and per-track stream counts are published as a public atproto record.'],
      ['Humans only', 'Every artist is a verified person or collective.'],
      ['No AI music', 'No generative AI for composition, performance, vocals or lyrics.'],
    ],
  },
  artists: {
    h: 'For artists',
    p: 'What you need:',
    items: [
      'Your own hosting for the audio files, with HTTP Range and CORS support and a check of the playback grant.',
      'A verification transfer of €1 from your bank account. The sender name and IBAN are stored privately and used for payouts.',
      'All writers of every track named with their legal names, and their collecting society if they are in one.',
    ],
    more: 'Payouts happen once your balance reaches €10, one month in arrears so that reports can stop a payout. While there is no society licence, covers and uncleared samples are not allowed.',
  },
  open: {
    h: 'Open questions',
    p: 'These are unresolved.',
    items: [
      ['Society licensing', 'The terms of an ICE licence (small-service terms, per-subscriber minimum, territories) are not known. Until one is signed, only artists outside all collecting societies can be onboarded.'],
      ['Bank integration', 'It is not yet known whether Wise\'s balance statement API works unattended on an EU business account. If not, the plan is to switch to a bank whose API exposes payment references; bunq is the candidate.'],
      ['Legal form', 'The association structure, the royalty model and the artist terms still need legal review.'],
    ],
  },
  follow: {
    h: 'Follow',
    p: 'The plan, lexicons and code are on GitHub. Updates will come from the atproto account',
    gh: 'GitHub repository',
    handle: '@musicstreamer.eu',
    tail: 'There is no email list.',
  },
};

const de: typeof en = {
  htmlTitle: 'musicstreamer.eu — Vorschlag',
  description: 'Ein vorgeschlagener Musik-Streamingdienst auf atproto: Künstler:innen hosten ihr Audio selbst, und die 5 € jedes Hörers werden auf die Tracks verteilt, die diese Person gehört hat.',
  nav: { other: 'English', otherHref: '/en' },
  label: 'Vorschlag — in Entwicklung · demnächst',
  h1: 'Musikstreaming, bei dem deine 5 € an die Künstler:innen gehen, die du gehört hast',
  pitch: [
    'musicstreamer.eu ist ein vorgeschlagener Streamingdienst auf Basis von atproto. Künstler:innen hosten ihre Audiodateien selbst und veröffentlichen die Metadaten in ihrem eigenen atproto-Repository. Hörer:innen zahlen 5 € zuzüglich Umsatzsteuer pro Monat per Banküberweisung. Die 5 € jeder Person werden auf die Tracks verteilt, die sie gestreamt hat.',
    'Noch ist nichts davon live. Diese Seite beschreibt den Plan.',
  ],
  flow: {
    h: 'Wohin deine 5 € gehen',
    p: [
      'Du zahlst jeden Monat 5 € plus die Umsatzsteuer deines Landes per SEPA-Echtzeitüberweisung. Die 5 € (netto) werden auf die Tracks verteilt, die du gestreamt hast, im Verhältnis zur Anzahl deiner Streams.',
      'Ein Stream zählt, sobald du 30 Sekunden eines Tracks gehört hast, oder die Hälfte des Tracks, wenn er kürzer als 60 Sekunden ist. Eine Wiedergabe ergibt höchstens einen Stream.',
    ],
    d: { title: 'Geldfluss für eine Hörerin oder einen Hörer', listener: 'Hörer:in', pay: '5 € + USt pro Monat', split: 'Die 5 € werden nach Streams geteilt', ex: 'Beispiel: 10 Streams in diesem Monat', tracks: 'Track A ×6 · Track B ×3 · Track C ×1', artist: 'Künstler:in', of: 'von 10' },
    cap: 'Beispielzahlen.',
  },
  diff: {
    h: 'Warum es anders ist',
    p: [
      'Bei einem großen Topf fließt das gesamte Abo-Geld in einen Pool und wird nach Gesamt-Streams verteilt. Dein Geld bezahlt dann auch Künstler:innen, die du nie gehört hast.',
      'Hier wird dein Geld nur auf das verteilt, was du gehört hast. Auch wer wenig streamt, bezahlt die Künstler:innen, die er oder sie gewählt hat.',
    ],
    d: { title: 'Großer Topf gegenüber Aufteilung pro Hörer:in', pot: 'Ein großer Topf', per: 'Aufteilung pro Hörer:in', l1: 'Hörer:in 1', l2: 'Hörer:in 2', potBox: 'Topf 10 €', a: 'Künstler X', b: 'Künstler Y', note: ['Hörer:in 1 hört nur X (90 Streams),', 'Hörer:in 2 nur Y (10 Streams).', '4 € von Xs 9 € stammen von Hörer:in 2.'] },
    cap: 'Beispielzahlen.',
  },
  built: {
    h: 'Wie es gebaut ist',
    p: [
      'Künstler:innen hosten ihre Audiodateien selbst und veröffentlichen Tracks, Releases und ein Profil als atproto-Records. Der Appview indexiert diese Records, prüft, ob das Audio zum angegebenen Hash passt, steuert die Wiedergabe, zählt Streams und rechnet monatlich ab. Jede Person kann einen weiteren Appview auf denselben Lexicons betreiben.',
      'Zum Abspielen fragt der Player den Appview. Der prüft das Abo und liefert die Audio-URL mit einem signierten Grant, der 5 Minuten gültig ist. Der Grant enthält keine Identität der Hörer:in. Der Host der Künstler:in prüft ihn mit einem öffentlichen Schlüssel, den der Appview veröffentlicht.',
    ],
    d: { title: 'Architektur', repo: 'atproto-Repo der Künstler:in', repoSub: 'Profil, Track, Release', host: 'Audio-Host der Künstler:in', hostSub: 'Dateien, prüft den Grant', app: 'Appview', appSub: 'Index, Grants, Zählung, Abrechnung', player: 'Player', playerSub: 'App der Hörer:in', records: 'Records (Jetstream)', ask: 'Abspielen anfragen', url: 'URL + Grant', audio: 'Audio + Grant' },
  },
  principles: {
    h: 'Prinzipien',
    items: [
      ['Kein Abzug', 'Ein nicht gewinnorientierter Verein betreibt den Dienst und behält nichts ein. Die laufenden Kosten werden durch Spenden gedeckt.'],
      ['Open Source', 'Der Code und die Lexicons sind quelloffen.'],
      ['Öffentliche Monatsabrechnung', 'Die Summen jedes Monats und die Streams pro Track werden als öffentlicher atproto-Record veröffentlicht.'],
      ['Nur Menschen', 'Jede Künstler:in ist eine verifizierte Person oder ein verifiziertes Kollektiv.'],
      ['Keine KI-Musik', 'Keine generative KI für Komposition, Interpretation, Gesang oder Texte.'],
    ],
  },
  artists: {
    h: 'Für Künstler:innen',
    p: 'Was du brauchst:',
    items: [
      'Eigenes Hosting für die Audiodateien, mit HTTP-Range- und CORS-Unterstützung und einer Prüfung des Wiedergabe-Grants.',
      'Eine Verifizierungsüberweisung von 1 € von deinem Bankkonto. Name des Absenders und IBAN werden privat gespeichert und für Auszahlungen verwendet.',
      'Alle Urheber:innen jedes Tracks mit ihrem bürgerlichen Namen und, falls vorhanden, ihrer Verwertungsgesellschaft.',
    ],
    more: 'Ausgezahlt wird, sobald dein Guthaben 10 € erreicht, einen Monat nach Periodenende, damit Meldungen eine Auszahlung noch stoppen können. Solange es keine Lizenz einer Verwertungsgesellschaft gibt, sind Coverversionen und nicht geklärte Samples nicht erlaubt.',
  },
  open: {
    h: 'Offene Fragen',
    p: 'Diese Punkte sind ungeklärt.',
    items: [
      ['Lizenzierung durch Verwertungsgesellschaften', 'Die Bedingungen einer ICE-Lizenz (Kleindienst-Konditionen, Mindestbetrag pro Abonnent, Territorien) sind nicht bekannt. Bis eine unterzeichnet ist, können nur Künstler:innen aufgenommen werden, die in keiner Verwertungsgesellschaft sind.'],
      ['Bankanbindung', 'Es ist noch offen, ob die Kontoauszugs-API von Wise auf einem EU-Geschäftskonto ohne manuelle Schritte funktioniert. Falls nicht, wird zu einer Bank gewechselt, deren API Verwendungszwecke liefert; bunq ist der Kandidat.'],
      ['Rechtsform', 'Vereinsstruktur, Vergütungsmodell und Künstlerbedingungen müssen noch juristisch geprüft werden.'],
    ],
  },
  follow: {
    h: 'Folgen',
    p: 'Plan, Lexicons und Code liegen auf GitHub. Neuigkeiten gibt es über den atproto-Account',
    gh: 'GitHub-Repository',
    handle: '@musicstreamer.eu',
    tail: 'Es gibt keinen E-Mail-Verteiler.',
  },
};

export const content = { en, de };
export const GITHUB = 'https://github.com/hintergrund-dev/musicstreamer';
