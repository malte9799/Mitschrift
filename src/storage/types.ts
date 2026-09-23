/** Eine Mitschrift. `content` ist das Tiptap-JSON als String. */
export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string | null;
  /** Übergeordnete Notiz (Verschachtelung); `null`/fehlend = oberste Ebene. */
  parentId?: string | null;
  tags: string[];
  starred: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'folder' | 'parentId' | 'tags' | 'starred'>>;

/** Farbton eines Tags; die konkreten Werte (hell/dunkel) stehen in tokens.css. */
export type TagColor = 'teal' | 'blue' | 'green' | 'orange' | 'purple' | 'graphite' | 'red' | 'pink' | 'amber';

/** Tag für Notizen, z. B. ein Schulfach. Notizen speichern die Tag-IDs in `tags`. */
export interface Tag {
  id: string;
  name: string;
  color: TagColor;
  createdAt: number;
}

export type TagPatch = Partial<Pick<Tag, 'name' | 'color'>>;

/** Gespeicherter Block-Ausschnitt, einfügbar über das Slash-Menü. */
export interface Snippet {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

/** Glossar-Eintrag, z. B. eine Abkürzung („DNS“ → „Domain Name System“). Wird in allen Notizen erkannt. */
export interface Term {
  id: string;
  /** Wie er im Text steht: „DNS“, „TCP/IP“, „Firewall“. */
  term: string;
  /** Ausgeschrieben bzw. Kurzbedeutung. */
  expansion: string;
  /** Längere Erklärung (optional). */
  definition: string;
  /** Fächer (Tag-IDs). */
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export type TermPatch = Partial<Pick<Term, 'term' | 'expansion' | 'definition' | 'tags'>>;

/**
 * Speicher-Grenze der App. V1 nutzt IndexedDB, später kann ein Tauri-Adapter
 * (Markdown-Dateien auf Disk) dieselbe Schnittstelle implementieren.
 */
export interface StorageAdapter {
  listNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  createNote(init?: NotePatch): Promise<Note>;
  updateNote(id: string, patch: NotePatch): Promise<Note | undefined>;
  /** Löscht die Notiz; ihre Unterseiten rücken eine Ebene nach oben. */
  deleteNote(id: string): Promise<void>;

  listTags(): Promise<Tag[]>;
  createTag(name: string, color: TagColor): Promise<Tag>;
  updateTag(id: string, patch: TagPatch): Promise<Tag | undefined>;
  /** Löscht das Tag und entfernt es aus allen Notizen. */
  deleteTag(id: string): Promise<void>;

  listSnippets(): Promise<Snippet[]>;
  createSnippet(name: string, content: string): Promise<Snippet>;
  deleteSnippet(id: string): Promise<void>;

  listTerms(): Promise<Term[]>;
  createTerm(init: TermPatch & { term: string }): Promise<Term>;
  updateTerm(id: string, patch: TermPatch): Promise<Term | undefined>;
  deleteTerm(id: string): Promise<void>;

  putFile(blob: Blob): Promise<string>;
  getFile(id: string): Promise<Blob | undefined>;

  /** Kompletter Inhalt des Speichers, z. B. für ein Backup. */
  dumpAll(): Promise<StorageDump>;
  /**
   * Führt einen Dump mit dem Bestand zusammen: Notizen gewinnen bei gleicher ID die
   * jüngere Fassung, alles andere wird nur ergänzt. Es wird nie etwas gelöscht.
   */
  mergeAll(dump: StorageDump): Promise<MergeResult>;
}

export interface StorageDump {
  notes: Note[];
  tags: Tag[];
  snippets: Snippet[];
  files: { id: string; blob: Blob }[];
}

export interface MergeResult {
  added: number;
  updated: number;
  skipped: number;
}
