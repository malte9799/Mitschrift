import { idbAdapter } from './idbAdapter';

export type { MergeResult, Note, NotePatch, Snippet, StorageAdapter, StorageDump, Tag, TagColor, TagPatch, Term, TermPatch } from './types';

/** Aktiver Speicher. Für Desktop (Tauri) später hier umschalten. */
export const storage = idbAdapter;
