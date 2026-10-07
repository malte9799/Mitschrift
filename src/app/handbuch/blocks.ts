/** Gemeinsame TipTap-JSON-Bausteine für alle Handbuch-Seiten (src/app/handbuch/pages/*.ts). */

export const p = (...content: object[]) => ({ type: 'paragraph', content });
export const t = (text: string, marks?: string[]) => ({ type: 'text', text, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) });
export const h1 = (text: string) => ({ type: 'heading', attrs: { level: 1 }, content: [t(text)] });
export const h2 = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [t(text)] });
export const li = (...content: object[]) => ({ type: 'listItem', content: [p(...content)] });
export const note = (...content: object[]) => ({ type: 'callout', attrs: { variant: 'note' }, content: [p(...content)] });
export const tip = (...content: object[]) => ({ type: 'callout', attrs: { variant: 'tip' }, content: [p(...content)] });

/** Pfad einer Handbuch-Seite. */
export const handbuchHref = (key: string) => `/handbuch/${key}`;

/** Textstück, das auf eine andere Handbuch-Seite verlinkt. */
export const noteLink = (key: string, title: string) => ({ type: 'text', text: title, marks: [{ type: 'link', attrs: { href: handbuchHref(key) } }] });

/** Verweis auf eine andere Handbuch-Seite: fett verlinkter Titel, darunter eine kurze Beschreibung. */
export const pageLink = (key: string, title: string, ...description: object[]) => [
  p({ type: 'text', text: title, marks: [{ type: 'link', attrs: { href: handbuchHref(key) } }, { type: 'bold' }] }),
  ...(description.length ? [p(...description)] : []),
];
