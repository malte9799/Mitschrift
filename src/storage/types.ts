/** Eine Mitschrift. `content` ist das Tiptap-JSON als String. */
export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string | null;
  tags: string[];
  starred: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'folder' | 'tags' | 'starred'>>;

/** Gespeicherter Block-Ausschnitt, einfügbar über das Slash-Menü. */
export interface Snippet {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

/**
 * Speicher-Grenze der App. V1 nutzt IndexedDB, später kann ein Tauri-Adapter
 * (Markdown-Dateien auf Disk) dieselbe Schnittstelle implementieren.
 */
export interface StorageAdapter {
  listNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  createNote(init?: NotePatch): Promise<Note>;
  updateNote(id: string, patch: NotePatch): Promise<Note | undefined>;
  deleteNote(id: string): Promise<void>;

  listSnippets(): Promise<Snippet[]>;
  createSnippet(name: string, content: string): Promise<Snippet>;
  deleteSnippet(id: string): Promise<void>;

  putFile(blob: Blob): Promise<string>;
  getFile(id: string): Promise<Blob | undefined>;
}
