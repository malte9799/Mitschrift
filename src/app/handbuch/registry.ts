/**
 * Registriert alle Handbuch-Seiten (statischer Inhalt, keine echten Notizen im Speicher).
 * Jede Datei in `src/app/handbuch/pages/*.ts` exportiert eine {@link HandbuchPage}; sie werden
 * automatisch eingesammelt und über ihren `key` unter `/handbuch/<key>` angezeigt (siehe
 * `HandbuchPage.tsx`, `HandbuchNav.tsx`). Handbuch-Seiten tauchen bewusst nicht in der normalen
 * Notizliste, Sidebar, Suche oder Graph-Ansicht auf – dafür siehe „Als eigene Notiz öffnen“
 * (`toNoteInit` in `HandbuchPage.tsx`).
 */

export interface PageIds {
  [key: string]: string;
}

export interface HandbuchPage {
  /** Stabiler Schlüssel, z. B. „bloecke“ – zugleich das URL-Segment unter `/handbuch/<key>`. */
  key: string;
  title: string;
  /** null = Hauptseite (`/handbuch`), sonst Schlüssel der Elternseite. */
  parent: string | null;
  /** Baut das Tiptap-JSON-Dokument; `ids` bildet jeden Seiten-Schlüssel auf sich selbst ab (für `noteLink`/`noteRow`). */
  doc: (ids: PageIds) => object;
}

const modules = import.meta.glob<{ default: HandbuchPage }>('./pages/*.ts', { eager: true });
export const handbuchPages: HandbuchPage[] = Object.values(modules).map((m) => m.default);

/** Jeder Seiten-Schlüssel bildet auf sich selbst ab – `noteLink(ids.bloecke, …)` verlinkt also auf `/handbuch/bloecke`. */
export const pageIds: PageIds = Object.fromEntries(handbuchPages.map((p) => [p.key, p.key]));

export function getHandbuchPage(key: string): HandbuchPage | undefined {
  return handbuchPages.find((p) => p.key === key);
}

export function childPagesOf(key: string | null): HandbuchPage[] {
  return handbuchPages.filter((p) => p.parent === key);
}

/** Seiten von der Hauptseite bis zur Elternseite von `key` (ohne `key` selbst). */
export function ancestorsOf(key: string): HandbuchPage[] {
  const byKey = new Map(handbuchPages.map((p) => [p.key, p]));
  const chain: HandbuchPage[] = [];
  let cur = byKey.get(key)?.parent ?? null;
  while (cur) {
    const page = byKey.get(cur);
    if (!page) break;
    chain.unshift(page);
    cur = page.parent;
  }
  return chain;
}
