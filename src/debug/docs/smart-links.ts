import type { DebugDoc } from '../debugDocs';

const t = (text: string) => ({ type: 'text', text });
const h = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [t(text)] });
const p = (text: string) => ({ type: 'paragraph', content: text ? [t(text)] : [] });
const link = (href: string, textStr: string) => ({ type: 'paragraph', content: [{ type: 'text', text: textStr, marks: [{ type: 'link', attrs: { href } }] }] });
const smart = (href: string, view: string, title: string) => ({ type: 'smartLink', attrs: { href, view, title } });

const doc = {
  type: 'doc',
  content: [
    h('Zeile (generischer Link)'),
    smart('https://github.com/anthropics/claude-code', 'row', 'anthropics/claude-code'),
    h('Bild (Imgur, ohne Endung)'),
    smart('https://i.imgur.com/6EqNoZR.jpeg', 'image', 'Testbild'),
    h('Bild (echtes Foto, i.imgur.com direkt)'),
    smart('https://i.imgur.com/sCjJJry.png', 'image', ''),
    h('Karte, die man manuell zu Bild machen kann (Imgur-Galerie mit Titel-Slug)'),
    smart('https://imgur.com/gallery/doggonne-fnP69sj', 'row', ''),
    h('Video (YouTube)'),
    smart('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video', 'YouTube-Video'),
    h('Audio (Spotify)'),
    smart('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', 'audio', 'Spotify-Track'),
    h('Roher Link im Text – Maus darüber halten'),
    link('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube-Link im Fließtext'),
    link('https://i.imgur.com/6EqNoZR.jpeg', 'Bild-Link im Fließtext'),
    link('https://example.com', 'Generischer Link im Fließtext'),
    link('https://imgur.com/gallery/doggonne-fnP69sj', 'Imgur-Galerie-Link im Fließtext'),
    p(''),
  ],
};

export default { key: 'smart-links', title: 'Debug: Smart Links', doc, version: 3 } satisfies DebugDoc;
