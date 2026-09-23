import { idbAdapter } from './idbAdapter';

export type { Note, NotePatch, Snippet, StorageAdapter, Tag, TagColor, TagPatch } from './types';

/** Aktiver Speicher. Für Desktop (Tauri) später hier umschalten. */
export const storage = idbAdapter;
