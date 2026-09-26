/**
 * Erkennung, was eine externe URL „ist“ – rein aus dem Link selbst, ohne Server-Anfrage
 * (die App läuft ohne eigenes Backend). Bestimmt, welche Darstellungen sinnvoll sind
 * und wie eine Einbettung (YouTube-Player, Bild, …) aus der URL gebaut wird.
 */

export type SmartLinkKind = 'image' | 'video' | 'audio' | 'generic';

export interface SmartLinkInfo {
  kind: SmartLinkKind;
  /** Domain für Anzeige, z. B. „github.com“. */
  domain: string;
  /** Direkte Bild-URL – für `kind: 'image'`. */
  imageSrc?: string;
  /** URL für ein `<iframe>` – für `kind: 'video'` und manche `audio`-Quellen. */
  embedSrc?: string;
  /** Seitenverhältnis der Einbettung (Breite/Höhe), sonst 16:9. */
  embedRatio?: number;
}

function safeUrl(href: string): URL | null {
  try {
    return new URL(href);
  } catch {
    return null;
  }
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i;

/** youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID, /live/ID */
function youTubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/?#]+)/);
    if (m) return m[2];
  }
  return null;
}

function vimeoId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
  const m = u.pathname.match(/\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

/** Spotify: Track/Album/Playlist/Episode als kompakter Player. */
function spotifyEmbed(u: URL): string | null {
  if (u.hostname.replace(/^www\./, '') !== 'open.spotify.com') return null;
  const m = u.pathname.match(/^\/(track|album|playlist|episode|show|artist)\/([^/?#]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}

/** SoundCloud lässt sich nur über die oEmbed-API einbetten (kein Server hier) – daher nur als Karte. */

/**
 * imgur.com/abc123 oder imgur.com/a|gallery/irgendein-titel-abc123 → direkter Bildlink
 * (die ID steckt als letzter Block nach einem „-“, oder ist der ganze Pfad).
 * i.imgur.com/*.ext ist ohnehin schon eine direkte Bild-URL.
 */
function imgurImage(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'i.imgur.com') return u.href;
  if (host !== 'imgur.com') return null;
  const m = u.pathname.match(/^\/(?:a\/|gallery\/)?([a-zA-Z0-9-]+)$/);
  if (!m) return null;
  const id = m[1].split('-').pop() || '';
  return /^[a-zA-Z0-9]{5,7}$/.test(id) ? `https://i.imgur.com/${id}.jpg` : null;
}

/** Erkennt Art und Einbettung einer externen URL. */
export function analyzeUrl(href: string): SmartLinkInfo {
  const u = safeUrl(href);
  const domain = u ? u.hostname.replace(/^www\./, '') : href.replace(/^https?:\/\//i, '').split('/')[0];
  if (!u || !/^https?:$/.test(u.protocol)) return { kind: 'generic', domain };

  const yt = youTubeId(u);
  if (yt) return { kind: 'video', domain, embedSrc: `https://www.youtube-nocookie.com/embed/${yt}`, embedRatio: 16 / 9 };

  const vimeo = vimeoId(u);
  if (vimeo) return { kind: 'video', domain, embedSrc: `https://player.vimeo.com/video/${vimeo}`, embedRatio: 16 / 9 };

  const spotify = spotifyEmbed(u);
  if (spotify) {
    const isTrack = /\/track\//.test(spotify) || /\/episode\//.test(spotify);
    return { kind: 'audio', domain, embedSrc: spotify, embedRatio: isTrack ? 3.6 : 1 };
  }

  const imgur = imgurImage(u);
  if (imgur) return { kind: 'image', domain, imageSrc: imgur };

  if (IMAGE_EXT.test(u.pathname)) return { kind: 'image', domain, imageSrc: u.href };

  return { kind: 'generic', domain };
}

/** Welche Darstellungen für diese URL sinnvoll sind – Grundlage für das Auswahlmenü. */
export function availableSmartViews(href: string): SmartLinkKind[] {
  const info = analyzeUrl(href);
  return info.kind === 'generic' ? [] : [info.kind];
}

/** Öffentlicher Favicon-Dienst – kein eigener Server nötig, funktioniert ohne CORS-Probleme als `<img>`. */
export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;
}
