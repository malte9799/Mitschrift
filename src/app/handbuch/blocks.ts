/**
 * Gemeinsame TipTap-JSON-Bausteine für alle Handbuch-Seiten (src/app/handbuch/pages/*.ts).
 *
 * Inline-Inhalt darf überall als einfacher String oder als fertiger Knoten übergeben werden:
 *   p('Drücke ', kbd('⌘K'), ' und tippe ', b('Kalender'), '.')
 */
import { formatShortcut } from '@/ui/shortcut';

export type Inline = string | object;
/** Ein Listenpunkt bzw. eine Tabellenzelle: ein String, ein Knoten oder mehrere davon. */
export type InlineGroup = Inline | Inline[];

const inline = (content: Inline[]) => content.map((c) => (typeof c === 'string' ? t(c) : c));
const group = (g: InlineGroup) => inline(Array.isArray(g) ? g : [g]);

// ---------- Text ----------

export const t = (text: string, marks?: string[]) => ({ type: 'text', text, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) });
export const b = (text: string) => t(text, ['bold']);
export const i = (text: string) => t(text, ['italic']);
export const code = (text: string) => t(text, ['code']);
/** Tastenkürzel in Mac-Schreibweise – wird auf Windows/Linux automatisch zu „Strg+…“. */
export const kbd = (text: string) => t(formatShortcut(text), ['kbd']);
export const cloze = (text: string) => t(text, ['cloze']);
export const math = (latex: string) => ({ type: 'mathInline', attrs: { latex } });
export const footnote = (text: string) => ({ type: 'footnote', attrs: { text } });
export const ext = (href: string, text = href) => ({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] });

// ---------- Blöcke ----------

export const p = (...content: Inline[]) => (content.length ? { type: 'paragraph', content: inline(content) } : { type: 'paragraph' });
export const lead = (...content: Inline[]) => ({ type: 'paragraph', attrs: { variant: 'strong' }, content: inline(content) });
export const caption = (...content: Inline[]) => ({ type: 'paragraph', attrs: { variant: 'caption' }, content: inline(content) });
const heading = (level: number) => (text: string) => ({ type: 'heading', attrs: { level }, content: [t(text)] });
export const h1 = heading(1);
export const h2 = heading(2);
export const h3 = heading(3);

export const li = (...content: Inline[]) => ({ type: 'listItem', content: [p(...content)] });
export const ul = (...items: InlineGroup[]) => ({ type: 'bulletList', content: items.map((it) => ({ type: 'listItem', content: [{ type: 'paragraph', content: group(it) }] })) });
export const ol = (...items: InlineGroup[]) => ({
  type: 'orderedList',
  attrs: { start: 1 },
  content: items.map((it) => ({ type: 'listItem', content: [{ type: 'paragraph', content: group(it) }] })),
});
export const tasks = (...items: [boolean, InlineGroup][]) => ({
  type: 'taskList',
  content: items.map(([checked, it]) => ({ type: 'taskItem', attrs: { checked }, content: [{ type: 'paragraph', content: group(it) }] })),
});

const callout = (variant: string) => (...content: Inline[]) => ({ type: 'callout', attrs: { variant }, content: [p(...content)] });
export const note = callout('note');
export const tip = callout('tip');
export const important = callout('important');
export const warning = callout('warning');
export const caution = callout('caution');

export const quote = (...content: Inline[]) => ({ type: 'blockquote', content: [p(...content)] });
export const toggle = (summary: string, ...content: object[]) => ({ type: 'toggleBlock', attrs: { summary, open: false }, content });
export const hr = (variant: 'dots' | 'dotted' | 'regular' | 'bold' = 'dots') => ({ type: 'horizontalRule', attrs: { variant } });
export const codeBlock = (language: string, text: string) => ({ type: 'codeBlock', attrs: { language }, content: [{ type: 'text', text }] });
export const mathBlock = (latex: string) => ({ type: 'mathBlock', attrs: { latex } });

/** Tabelle mit Kopfzeile; jede Zelle ist ein String oder eine Liste von Inline-Knoten. */
export const table = (head: InlineGroup[], ...rows: InlineGroup[][]) => ({
  type: 'table',
  content: [
    { type: 'tableRow', content: head.map((c) => ({ type: 'tableHeader', content: [{ type: 'paragraph', content: group(c) }] })) },
    ...rows.map((r) => ({ type: 'tableRow', content: r.map((c) => ({ type: 'tableCell', content: [{ type: 'paragraph', content: group(c) }] })) })),
  ],
});

// ---------- Verweise zwischen Handbuch-Seiten ----------

/** Pfad einer Handbuch-Seite. */
export const handbuchHref = (key: string) => `/handbuch/${key}`;

/** Textstück, das auf eine andere Handbuch-Seite verlinkt. */
export const noteLink = (key: string, title: string) => ({ type: 'text', text: title, marks: [{ type: 'link', attrs: { href: handbuchHref(key) } }] });

/** Verweis auf eine andere Handbuch-Seite: fett verlinkter Titel, darunter eine kurze Beschreibung. */
export const pageLink = (key: string, title: string, ...description: Inline[]) => [
  p({ type: 'text', text: title, marks: [{ type: 'link', attrs: { href: handbuchHref(key) } }, { type: 'bold' }] }),
  ...(description.length ? [p(...description)] : []),
];
