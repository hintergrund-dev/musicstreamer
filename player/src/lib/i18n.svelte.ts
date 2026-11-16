const en = {
  nav: 'Main navigation', 'nav.new': 'New releases', 'nav.search': 'Search', 'nav.library': 'Library', 'nav.account': 'Account', 'nav.studio': 'Studio',
  language: 'Language', loading: 'Loading…', retry: 'Retry', more: 'Load more', save: 'Save', saved: 'Saved.', remove: 'Remove', delete: 'Delete', rename: 'Rename',
  play: 'Play', pause: 'Pause', next: 'Next', previous: 'Previous', seek: 'Seek', queue: 'Queue', player: 'Player', like: 'Like', follow: 'Follow', unfollow: 'Unfollow',
  signout: 'Sign out', 'signin.title': 'Signing in…', 'signin.button': 'Sign in', 'signin.handle': 'Your atproto handle', 'signin.failed': 'Sign-in failed.',
  'signin.browser': 'Your browser opens to sign in and returns here.',
  'err.generic': 'Something went wrong.', 'err.Network': 'The server cannot be reached.', 'err.NotFound': 'Not found.', 'err.AuthRequired': 'Please sign in.',
  'err.NotSubscribed': 'You need an active subscription to play this.', 'err.ArtistNotVerified': 'This artist is not verified.',
  'err.NotLicensedInCountry': 'This track is not licensed in your country.', 'err.TrackUnavailable': 'This track is not available.',
  'err.MediaError': 'The audio could not be played.', 'err.UnsupportedCountry': 'This country is not supported.', 'err.NoProfile': 'Create your artist profile first.',
  'empty.releases': 'No releases yet.', 'empty.artistReleases': 'No releases yet.', 'empty.tracks': 'No playable tracks.', 'empty.playlist': 'This playlist is empty.',
  'empty.playlists': 'No playlists yet.', 'empty.likes': 'Nothing liked yet.', 'empty.follows': 'You follow nobody yet.',
  'search.placeholder': 'Artists, releases, tracks', 'search.hint': 'Search the catalogue.', 'search.empty': 'Nothing found.',
  'search.artists': 'Artists', 'search.releases': 'Releases', 'search.tracks': 'Tracks',
  'artist.verified': 'Verified', 'artist.person': 'person', 'artist.collective': 'collective', 'artist.members': 'Members', 'artist.releases': 'Releases',
  'type.album': 'Album', 'type.ep': 'EP', 'type.single': 'Single', 'release.missing': '{n} track(s) are not available.',
  'playlist.add': 'Add to playlist', 'playlist.new': 'New playlist…', 'playlist.name': 'Playlist name', 'playlist.create': 'Create playlist', 'playlist.by': 'by',
  'playlist.confirmDelete': 'Delete this playlist?',
  'library.signin': 'Sign in to see your likes, follows and playlists.', 'library.likes': 'Likes', 'library.follows': 'Following', 'library.playlists': 'Playlists',
  'account.signin': 'Sign in with your atproto account to manage your subscription.', 'account.subscription': 'Subscription', 'account.none': 'No active subscription.',
  'account.active': 'Active until {date}.', 'account.expired': 'Expired on {date}.', 'account.pay': 'Pay by bank transfer',
  'account.pay.intro': 'The subscription is 5 € plus VAT of your country per month, paid by SEPA transfer. Pick your country to see the amount.',
  'account.country': 'Country', 'account.pay.show': 'Show payment instructions', 'account.manageOnWeb': 'Manage your subscription on the website.',
  'bank.holder': 'Account holder', 'bank.amount': 'Amount', 'bank.reference': 'Reference',
  'bank.reference.hint': 'Use the reference exactly as shown; it identifies you. Each full amount adds one month.', 'bank.qr': 'Scan with your banking app:',
  'studio.signin': 'Sign in with the account that publishes your music.', 'studio.webOnly': 'The studio is only available on the web.',
  'studio.tab.profile': 'Profile', 'studio.tab.tracks': 'Tracks', 'studio.tab.releases': 'Releases', 'studio.tab.verification': 'Verification', 'studio.tab.statements': 'Statements',
  'studio.profile.none': 'You have no artist profile yet. Fill in the form to create one.', 'studio.displayName': 'Name', 'studio.kind': 'Kind', 'studio.members': 'Members (comma separated)',
  'studio.description': 'Description', 'studio.genres': 'Genres (comma separated)', 'studio.links': 'Links (one per line: label | URL)', 'studio.avatar': 'Avatar', 'studio.banner': 'Banner',
  'studio.tracks': 'Your tracks', 'studio.tracks.empty': 'No tracks yet.', 'studio.tracks.add': 'Add a track', 'studio.tracks.listed': 'in catalogue', 'studio.tracks.pending': 'not listed',
  'studio.tracks.pending.hint': 'Not returned by the catalogue: still being checked, or the check failed (hash mismatch, no MP3/AAC source) or you are not verified yet.',
  'studio.tracks.hint': 'Audio is never uploaded here. Host the files yourself and enter their URLs. The record is written to your own repository ({did}).',
  'studio.tracks.publish': 'Publish track', 'studio.title': 'Title', 'studio.artists': 'Artists (comma separated)', 'studio.duration': 'Duration (ms)',
  'studio.writers': 'Writers', 'studio.writer.name': 'Legal name', 'studio.writer.role': 'Role', 'studio.writer.society': 'Society (empty if none)', 'studio.writer.add': 'Add writer',
  'studio.audio': 'Audio sources', 'studio.audio.hint': 'At least one source must be MP3 (audio/mpeg) or AAC (audio/mp4). Pick the local file to compute its SHA-256 here in your browser.',
  'studio.audio.url': 'File URL', 'studio.audio.access': 'Access', 'studio.audio.file': 'Local file (for SHA-256 and size)', 'studio.audio.add': 'Add source',
  'studio.audio.baseline': 'Add an MP3 or AAC source, otherwise the track will not be playable.',
  'studio.check.ok': 'Size matches the URL’s Content-Length.', 'studio.check.mismatch': 'Size differs: the URL reports {remote} bytes, your file has {local}.',
  'studio.check.unknown': 'Could not read Content-Length (gated file or the host blocks cross-origin requests). The appview checks the hash itself.',
  'studio.more': 'More', 'studio.tags': 'Tags (comma separated)', 'studio.releaseDate': 'Release date', 'studio.artwork': 'Artwork', 'studio.explicit': 'Explicit',
  'studio.releases': 'Your releases', 'studio.releases.empty': 'No releases yet.', 'studio.releases.add': 'Create a release', 'studio.releases.needTracks': 'Add tracks first.',
  'studio.releases.pick': 'Tracks, in order', 'studio.releases.publish': 'Publish release', 'studio.type': 'Type',
  'studio.verification': 'Verification', 'studio.verification.intro': 'Every artist is verified once by a 1 € bank transfer, so that each artist is a real person or collective.',
  'studio.verification.start': 'Show transfer instructions', 'studio.verification.banned': 'This account is banned.', 'studio.balance': 'Balance',
  'studio.statements': 'Statements', 'studio.statements.empty': 'No statements yet. They appear after the first monthly settlement.', 'studio.payout': 'payout',
  'studio.track': 'Track', 'studio.streams': 'Streams', 'studio.share': 'Share', 'studio.fee': 'Society fee',
  'update.available': 'Version {version} is available. Install it now?', 'update.installed': 'Update installed. Restart the app to use it.',
};
export type Key = keyof typeof en;

const de: Record<Key, string> = {
  nav: 'Hauptnavigation', 'nav.new': 'Neuheiten', 'nav.search': 'Suche', 'nav.library': 'Bibliothek', 'nav.account': 'Konto', 'nav.studio': 'Studio',
  language: 'Sprache', loading: 'Lädt…', retry: 'Erneut versuchen', more: 'Mehr laden', save: 'Speichern', saved: 'Gespeichert.', remove: 'Entfernen', delete: 'Löschen', rename: 'Umbenennen',
  play: 'Abspielen', pause: 'Pause', next: 'Weiter', previous: 'Zurück', seek: 'Spulen', queue: 'Warteschlange', player: 'Player', like: 'Gefällt mir', follow: 'Folgen', unfollow: 'Entfolgen',
  signout: 'Abmelden', 'signin.title': 'Anmeldung…', 'signin.button': 'Anmelden', 'signin.handle': 'Dein atproto-Handle', 'signin.failed': 'Anmeldung fehlgeschlagen.',
  'signin.browser': 'Zum Anmelden öffnet sich dein Browser und führt dich hierher zurück.',
  'err.generic': 'Etwas ist schiefgegangen.', 'err.Network': 'Der Server ist nicht erreichbar.', 'err.NotFound': 'Nicht gefunden.', 'err.AuthRequired': 'Bitte melde dich an.',
  'err.NotSubscribed': 'Zum Abspielen brauchst du ein aktives Abo.', 'err.ArtistNotVerified': 'Diese Künstler:in ist nicht verifiziert.',
  'err.NotLicensedInCountry': 'Dieser Titel ist in deinem Land nicht lizenziert.', 'err.TrackUnavailable': 'Dieser Titel ist nicht verfügbar.',
  'err.MediaError': 'Das Audio konnte nicht abgespielt werden.', 'err.UnsupportedCountry': 'Dieses Land wird nicht unterstützt.', 'err.NoProfile': 'Lege zuerst dein Künstlerprofil an.',
  'empty.releases': 'Noch keine Veröffentlichungen.', 'empty.artistReleases': 'Noch keine Veröffentlichungen.', 'empty.tracks': 'Keine abspielbaren Titel.', 'empty.playlist': 'Diese Playlist ist leer.',
  'empty.playlists': 'Noch keine Playlists.', 'empty.likes': 'Noch nichts geliked.', 'empty.follows': 'Du folgst noch niemandem.',
  'search.placeholder': 'Künstler:innen, Veröffentlichungen, Titel', 'search.hint': 'Durchsuche den Katalog.', 'search.empty': 'Nichts gefunden.',
  'search.artists': 'Künstler:innen', 'search.releases': 'Veröffentlichungen', 'search.tracks': 'Titel',
  'artist.verified': 'Verifiziert', 'artist.person': 'Person', 'artist.collective': 'Kollektiv', 'artist.members': 'Mitglieder', 'artist.releases': 'Veröffentlichungen',
  'type.album': 'Album', 'type.ep': 'EP', 'type.single': 'Single', 'release.missing': '{n} Titel sind nicht verfügbar.',
  'playlist.add': 'Zur Playlist hinzufügen', 'playlist.new': 'Neue Playlist…', 'playlist.name': 'Name der Playlist', 'playlist.create': 'Playlist anlegen', 'playlist.by': 'von',
  'playlist.confirmDelete': 'Diese Playlist löschen?',
  'library.signin': 'Melde dich an, um Likes, Follows und Playlists zu sehen.', 'library.likes': 'Likes', 'library.follows': 'Folgst du', 'library.playlists': 'Playlists',
  'account.signin': 'Melde dich mit deinem atproto-Konto an, um dein Abo zu verwalten.', 'account.subscription': 'Abo', 'account.none': 'Kein aktives Abo.',
  'account.active': 'Aktiv bis {date}.', 'account.expired': 'Abgelaufen am {date}.', 'account.pay': 'Per Überweisung bezahlen',
  'account.pay.intro': 'Das Abo kostet 5 € zuzüglich Mehrwertsteuer deines Landes pro Monat, bezahlt per SEPA-Überweisung. Wähle dein Land, um den Betrag zu sehen.',
  'account.country': 'Land', 'account.pay.show': 'Zahlungsangaben anzeigen', 'account.manageOnWeb': 'Verwalte dein Abo auf der Website.',
  'bank.holder': 'Kontoinhaber', 'bank.amount': 'Betrag', 'bank.reference': 'Verwendungszweck',
  'bank.reference.hint': 'Gib den Verwendungszweck genau so an; er identifiziert dich. Jeder volle Betrag verlängert um einen Monat.', 'bank.qr': 'Mit der Banking-App scannen:',
  'studio.signin': 'Melde dich mit dem Konto an, über das du deine Musik veröffentlichst.', 'studio.webOnly': 'Das Studio gibt es nur im Web.',
  'studio.tab.profile': 'Profil', 'studio.tab.tracks': 'Titel', 'studio.tab.releases': 'Veröffentlichungen', 'studio.tab.verification': 'Verifizierung', 'studio.tab.statements': 'Abrechnungen',
  'studio.profile.none': 'Du hast noch kein Künstlerprofil. Fülle das Formular aus, um eines anzulegen.', 'studio.displayName': 'Name', 'studio.kind': 'Art', 'studio.members': 'Mitglieder (kommagetrennt)',
  'studio.description': 'Beschreibung', 'studio.genres': 'Genres (kommagetrennt)', 'studio.links': 'Links (eine pro Zeile: Label | URL)', 'studio.avatar': 'Avatar', 'studio.banner': 'Banner',
  'studio.tracks': 'Deine Titel', 'studio.tracks.empty': 'Noch keine Titel.', 'studio.tracks.add': 'Titel hinzufügen', 'studio.tracks.listed': 'im Katalog', 'studio.tracks.pending': 'nicht gelistet',
  'studio.tracks.pending.hint': 'Vom Katalog nicht ausgeliefert: wird noch geprüft, die Prüfung ist fehlgeschlagen (Hash stimmt nicht, keine MP3/AAC-Quelle) oder du bist noch nicht verifiziert.',
  'studio.tracks.hint': 'Audio wird hier nie hochgeladen. Hoste die Dateien selbst und trage ihre URLs ein. Der Eintrag wird in dein eigenes Repository geschrieben ({did}).',
  'studio.tracks.publish': 'Titel veröffentlichen', 'studio.title': 'Titel', 'studio.artists': 'Künstler:innen (kommagetrennt)', 'studio.duration': 'Dauer (ms)',
  'studio.writers': 'Urheber:innen', 'studio.writer.name': 'Bürgerlicher Name', 'studio.writer.role': 'Rolle', 'studio.writer.society': 'Verwertungsgesellschaft (leer, wenn keine)', 'studio.writer.add': 'Urheber:in hinzufügen',
  'studio.audio': 'Audioquellen', 'studio.audio.hint': 'Mindestens eine Quelle muss MP3 (audio/mpeg) oder AAC (audio/mp4) sein. Wähle die lokale Datei, damit ihr SHA-256 hier im Browser berechnet wird.',
  'studio.audio.url': 'Datei-URL', 'studio.audio.access': 'Zugriff', 'studio.audio.file': 'Lokale Datei (für SHA-256 und Größe)', 'studio.audio.add': 'Quelle hinzufügen',
  'studio.audio.baseline': 'Füge eine MP3- oder AAC-Quelle hinzu, sonst ist der Titel nicht abspielbar.',
  'studio.check.ok': 'Die Größe passt zum Content-Length der URL.', 'studio.check.mismatch': 'Die Größe weicht ab: Die URL meldet {remote} Bytes, deine Datei hat {local}.',
  'studio.check.unknown': 'Content-Length nicht lesbar (geschützte Datei oder der Host blockiert Anfragen von anderen Origins). Der Appview prüft den Hash selbst.',
  'studio.more': 'Mehr', 'studio.tags': 'Tags (kommagetrennt)', 'studio.releaseDate': 'Veröffentlichungsdatum', 'studio.artwork': 'Cover', 'studio.explicit': 'Explizit',
  'studio.releases': 'Deine Veröffentlichungen', 'studio.releases.empty': 'Noch keine Veröffentlichungen.', 'studio.releases.add': 'Veröffentlichung anlegen', 'studio.releases.needTracks': 'Füge zuerst Titel hinzu.',
  'studio.releases.pick': 'Titel, in Reihenfolge', 'studio.releases.publish': 'Veröffentlichung veröffentlichen', 'studio.type': 'Typ',
  'studio.verification': 'Verifizierung', 'studio.verification.intro': 'Jede Künstler:in wird einmalig per 1-€-Überweisung verifiziert, damit jede Künstler:in eine echte Person oder ein echtes Kollektiv ist.',
  'studio.verification.start': 'Überweisungsdaten anzeigen', 'studio.verification.banned': 'Dieses Konto ist gesperrt.', 'studio.balance': 'Guthaben',
  'studio.statements': 'Abrechnungen', 'studio.statements.empty': 'Noch keine Abrechnungen. Sie erscheinen nach der ersten monatlichen Abrechnung.', 'studio.payout': 'Auszahlung',
  'studio.track': 'Titel', 'studio.streams': 'Streams', 'studio.share': 'Anteil', 'studio.fee': 'Gesellschaftsgebühr',
  'update.available': 'Version {version} ist verfügbar. Jetzt installieren?', 'update.installed': 'Update installiert. Starte die App neu, um es zu nutzen.',
};

const dict = { en, de };
export type Locale = keyof typeof dict;

const saved = (() => {
  try {
    return localStorage.getItem('ms.locale');
  } catch {
    return null;
  }
})();
export const locale = $state<{ value: Locale }>({ value: saved === 'de' || saved === 'en' ? saved : navigator.language.startsWith('de') ? 'de' : 'en' });

export function setLocale(l: Locale) {
  locale.value = l;
  try {
    localStorage.setItem('ms.locale', l);
  } catch {}
}

export function t(key: Key, vars?: Record<string, string | number>) {
  return dict[locale.value][key].replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ''));
}

/** Message for an appview or network error name. */
export const errText = (code: string) => t(`err.${code}` in en ? (`err.${code}` as Key) : 'err.generic');
