/// <reference types="vite/client" />
import { storage } from '@/storage';
import { notifyNotesChanged } from '@/hooks/useNotes';
import { notifyTagsChanged } from '@/hooks/useTags';

/**
 * Test-Ansichten als Standard-Dokumente – nur auf dem Dev-Server.
 *
 * Jede Datei in `src/debug/docs/*.ts` exportiert per `export default` ein {@link DebugDoc}.
 * Neue Dateien werden automatisch eingesammelt (keine zentrale Liste, die man anpassen muss).
 * Beim Start wird jede Notiz einmal angelegt und bekommt das Tag „debug“.
 * `version` erhöhen, um den Inhalt einer bereits angelegten Notiz beim nächsten Laden zu ersetzen.
 */
export interface DebugDoc {
  /** Stabiler Schlüssel, z. B. „code-workspace“. */
  key: string;
  title: string;
  /** Tiptap-JSON (`{ type: 'doc', content: [...] }`). */
  doc: object;
  version?: number;
}

export const DEBUG_TAG = 'debug';
const STATE_KEY = 'mitschrift-debug-docs';

// Nur im Dev-Server einsammeln: Im Produktions-Build ist der Zweig tot und die Dokumente landen in keinem Chunk.
const loaders = import.meta.env.DEV ? import.meta.glob<{ default: DebugDoc }>('./docs/*.ts') : {};

/** Lädt alle Debug-Dokumente (nur Dev), nach Titel sortiert. */
export async function loadDebugDocs(): Promise<DebugDoc[]> {
  const modules = await Promise.all(Object.values(loaders).map((load) => load()));
  return modules.map((m) => m.default).sort((a, b) => a.title.localeCompare(b.title, 'de'));
}

type State = Record<string, { id: string; version: number }>;

function readState(): State {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}') as State;
  } catch {
    return {};
  }
}

let pending: Promise<void> | null = null;

/** Legt fehlende/veraltete Debug-Notizen an. Mehrfachaufrufe (StrictMode) teilen sich einen Durchlauf. */
export function seedDebugDocs(): Promise<void> {
  if (!import.meta.env.DEV) return Promise.resolve();
  pending ??= (async () => {
    const state = readState();
    const todo = (await loadDebugDocs()).filter((d) => state[d.key]?.version !== (d.version ?? 1));
    if (!todo.length) return;

    let tag = (await storage.listTags()).find((t) => t.name === DEBUG_TAG);
    if (!tag) {
      tag = await storage.createTag(DEBUG_TAG, 'red');
      notifyTagsChanged();
    }

    for (const d of todo) {
      const content = JSON.stringify(d.doc);
      const version = d.version ?? 1;
      const existing = state[d.key] ? await storage.getNote(state[d.key].id) : undefined;
      if (existing) {
        await storage.updateNote(existing.id, { title: d.title, content });
        state[d.key] = { id: existing.id, version };
      } else {
        const note = await storage.createNote({ title: d.title, content, tags: [tag.id] });
        state[d.key] = { id: note.id, version };
      }
    }
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      /* Speicher gesperrt – dann beim nächsten Laden erneut */
    }
    notifyNotesChanged();
  })();
  return pending;
}
