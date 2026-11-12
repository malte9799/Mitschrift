import { idbAdapter } from './idbAdapter';
import type { StorageAdapter } from './types';

export type {
  CalendarEvent,
  CalendarEventPatch,
  CalendarSource,
  MergeResult,
  Note,
  NotePatch,
  Snippet,
  StorageAdapter,
  StorageDump,
  Tag,
  TagColor,
  TagPatch,
  Term,
  TermPatch,
} from './types';

let active: StorageAdapter = idbAdapter;

/** Wird beim Start gesetzt (siehe `vault/`): Browser-Speicher oder ein gewählter Ordner. */
export function setActiveStorage(adapter: StorageAdapter) {
  active = adapter;
}

/** Aktiver Speicher – leitet jeden Aufruf an den gerade gewählten Adapter weiter. */
export const storage: StorageAdapter = new Proxy({} as StorageAdapter, {
  get: (_target, key) => active[key as keyof StorageAdapter],
});
