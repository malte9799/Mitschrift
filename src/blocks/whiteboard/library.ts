import { openDB } from 'idb';
import type { LibraryItem, LibraryItems } from '@excalidraw/excalidraw/types';
import type { LibraryPersistenceAdapter } from '@excalidraw/excalidraw/data/library';
import { alertDialog, confirmDialog } from '@/ui/Dialog';

/*
 * Excalidraw-Bibliothek (wiederverwendbare Formen) für alle Whiteboards.
 * Bewusst ohne Laufzeit-Import von Excalidraw: Der Import über #addLibrary läuft beim
 * App-Start, das große Excalidraw-Paket soll erst mit dem ersten Whiteboard laden.
 */

const KEY = 'library';
const dbPromise = openDB('mitschrift-whiteboard', 1, {
  upgrade(db) {
    db.createObjectStore('kv');
  },
});

/** Wird ausgelöst, wenn eine Bibliothek importiert wurde – ein offenes Whiteboard lädt dann neu. */
export const LIBRARY_CHANGED_EVENT = 'mitschrift:whiteboard-library';

export async function loadLibrary(): Promise<LibraryItems> {
  const stored = (await (await dbPromise).get('kv', KEY)) as LibraryItems | undefined;
  return stored ?? [];
}

async function saveLibrary(items: LibraryItems) {
  await (await dbPromise).put('kv', items, KEY);
}

export const libraryAdapter: LibraryPersistenceAdapter = {
  async load() {
    return { libraryItems: await loadLibrary() };
  },
  async save({ libraryItems }) {
    await saveLibrary(libraryItems);
  },
};

/** Nur Bibliotheken von der offiziellen Excalidraw-Seite. */
export function isAllowedLibraryUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'libraries.excalidraw.com';
  } catch {
    return false;
  }
}

/** .excalidrawlib in Version 1 (nur Element-Gruppen) oder 2 (mit IDs und Namen) → Version 2. */
function parseLibraryFile(data: unknown): LibraryItems {
  const file = data as { type?: string; libraryItems?: unknown; library?: unknown };
  if (file?.type !== 'excalidrawlib') throw new Error('Keine Excalidraw-Bibliothek');
  if (Array.isArray(file.libraryItems)) {
    return (file.libraryItems as LibraryItem[]).filter((i) => Array.isArray(i?.elements) && i.elements.length);
  }
  if (Array.isArray(file.library)) {
    return (file.library as LibraryItem['elements'][])
      .filter((els) => Array.isArray(els) && els.length)
      .map((elements) => ({ id: crypto.randomUUID(), status: 'published', elements, created: Date.now() }));
  }
  throw new Error('Leere Bibliothek');
}

/** Neue Einträge vorne anfügen, bereits vorhandene (gleiche ID) überspringen. */
function merge(local: LibraryItems, incoming: LibraryItems) {
  const known = new Set(local.map((i) => i.id));
  const added = incoming.filter((i) => !known.has(i.id));
  return { items: [...added, ...local], added: added.length };
}

let importing = false;

/**
 * „Zu Excalidraw hinzufügen“ auf libraries.excalidraw.com leitet mit
 * #addLibrary=<url>&token=… zurück. Die Bibliothek landet dann im Speicher aller Whiteboards.
 */
export async function importLibraryFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const url = params.get('addLibrary');
  if (!url || importing) return;
  // Hash sofort entfernen: kein doppelter Import (auch nicht durch Excalidraw selbst) und kein erneuter beim Neuladen.
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  if (!isAllowedLibraryUrl(url)) {
    await alertDialog('Diese Bibliothek kann nicht hinzugefügt werden: nur Links von libraries.excalidraw.com sind erlaubt.');
    return;
  }

  const name = decodeURIComponent(url.split('/').pop() ?? '').replace(/\.excalidrawlib$/, '').replace(/[-_]+/g, ' ');
  if (!(await confirmDialog(`Bibliothek „${name}“ zu den Whiteboards hinzufügen?`, { confirmLabel: 'Hinzufügen' }))) return;

  importing = true;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const incoming = parseLibraryFile(await res.json());
    const { items, added } = merge(await loadLibrary(), incoming);
    await saveLibrary(items);
    window.dispatchEvent(new Event(LIBRARY_CHANGED_EVENT));
    await alertDialog(
      added
        ? `${added} ${added === 1 ? 'Element' : 'Elemente'} aus „${name}“ hinzugefügt. Du findest sie im Whiteboard unter „Bibliothek“.`
        : `„${name}“ ist bereits in deiner Bibliothek.`,
    );
  } catch (err) {
    await alertDialog(`Die Bibliothek konnte nicht geladen werden (${err instanceof Error ? err.message : String(err)}).`);
  } finally {
    importing = false;
  }
}
