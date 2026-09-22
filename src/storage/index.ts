import { idbAdapter } from './idbAdapter';

export type { Note, NotePatch, Snippet, StorageAdapter } from './types';

/** Aktiver Speicher. Für Desktop (Tauri) später hier umschalten. */
export const storage = idbAdapter;
