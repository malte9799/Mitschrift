import type { Note } from '@/storage';

/** Pfad einer Notiz – gleichzeitig das Ziel interner Markdown-Links: `[Titel](/n/<id>)`. */
export const noteHref = (id: string) => `/n/${id}`;

const HREF_RE = /^(?:https?:\/\/[^/]+)?\/n\/([0-9a-f-]{36})\/?(?:[?#].*)?$/i;

/** Notiz-ID aus einem Link, falls er auf eine Notiz zeigt (relativ oder mit eigenem Origin). */
export function noteIdFromHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const m = href.match(HREF_RE);
  if (!m) return null;
  // Absolute Links nur, wenn sie auf diese App zeigen.
  if (/^https?:/i.test(href) && !href.startsWith(location.origin)) return null;
  return m[1];
}

interface PMJson {
  marks?: { type: string; attrs?: { href?: string } }[];
  content?: PMJson[];
}

const linkCache = new Map<string, string[]>();

/** Alle Notizen, auf die `content` (Tiptap-JSON) verlinkt – ohne Duplikate. */
export function linkedNoteIds(content: string): string[] {
  if (!content) return [];
  const cached = linkCache.get(content);
  if (cached) return cached;
  const ids = new Set<string>();
  const walk = (n: PMJson) => {
    for (const m of n.marks ?? []) {
      if (m.type === 'link') {
        const id = noteIdFromHref(m.attrs?.href);
        if (id) ids.add(id);
      }
    }
    n.content?.forEach(walk);
  };
  try {
    walk(JSON.parse(content));
  } catch {
    /* kaputtes JSON: keine Links */
  }
  const out = [...ids];
  if (linkCache.size > 500) linkCache.clear();
  linkCache.set(content, out);
  return out;
}

/** Eltern-ID, bereinigt: fehlende oder gelöschte Eltern zählen als oberste Ebene. */
export function parentOf(note: Note, byId: Map<string, Note>): string | null {
  const p = note.parentId ?? null;
  return p && p !== note.id && byId.has(p) ? p : null;
}

/** Kinder je Eltern-ID (`null` = oberste Ebene), in der Reihenfolge von `notes`. */
export function childrenMap(notes: Note[]): Map<string | null, Note[]> {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const map = new Map<string | null, Note[]>();
  for (const n of notes) {
    const p = parentOf(n, byId);
    const list = map.get(p);
    if (list) list.push(n);
    else map.set(p, [n]);
  }
  return map;
}

/** Vorfahren von `id`, von der obersten Ebene bis zur direkten Eltern-Notiz. */
export function ancestorsOf(id: string, notes: Note[]): Note[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const out: Note[] = [];
  const seen = new Set([id]);
  let cur = byId.get(id);
  while (cur) {
    const p = parentOf(cur, byId);
    if (!p || seen.has(p)) break;
    seen.add(p);
    cur = byId.get(p)!;
    out.unshift(cur);
  }
  return out;
}

/** Darf `id` unter `parentId` gehängt werden? Nicht unter sich selbst oder eigene Nachfahren. */
export function canMoveUnder(id: string, parentId: string | null, notes: Note[]): boolean {
  if (parentId === null) return true;
  if (parentId === id) return false;
  return !ancestorsOf(parentId, notes).some((a) => a.id === id);
}

/** Notizen, die auf `id` verlinken (Backlinks). */
export function backlinksOf(id: string, notes: Note[]): Note[] {
  return notes.filter((n) => n.id !== id && linkedNoteIds(n.content).includes(id));
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: 'link' | 'child';
}

/** Kanten für die Graph-Ansicht: Links zwischen Notizen und Eltern→Kind-Beziehungen. */
export function graphEdges(notes: Note[]): GraphEdge[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const n of notes) {
    const p = parentOf(n, byId);
    if (p) {
      edges.push({ source: p, target: n.id, kind: 'child' });
      seen.add(`${p}|${n.id}`);
    }
  }
  for (const n of notes) {
    for (const t of linkedNoteIds(n.content)) {
      if (t === n.id || !byId.has(t)) continue;
      // Link parallel zu einer Eltern-Kante oder in Gegenrichtung schon vorhanden: nicht doppelt zeichnen.
      if (seen.has(`${n.id}|${t}`) || seen.has(`${t}|${n.id}`)) continue;
      seen.add(`${n.id}|${t}`);
      edges.push({ source: n.id, target: t, kind: 'link' });
    }
  }
  return edges;
}

/** Event, über das Nicht-React-Code (z. B. der Editor) zu einer Route wechselt. */
export const NAVIGATE_EVENT = 'mitschrift:navigate';

export function navigateTo(path: string) {
  window.dispatchEvent(new CustomEvent<string>(NAVIGATE_EVENT, { detail: path }));
}
