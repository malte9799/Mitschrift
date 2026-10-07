import type { Editor } from '@tiptap/react';
import { migrateCollection, type CollectionData, type Sheet } from './model';

/** Eine im Dokument gefundene Sammlung samt Position (für Verknüpfungsfelder aus anderen Sammlungen). */
export interface CollectionRef {
  pos: number;
  data: CollectionData;
}

/** Alle Sammlungs-Blöcke im Dokument, in Dokumentreihenfolge. */
export function findCollections(editor: Editor): CollectionRef[] {
  const refs: CollectionRef[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'collection') refs.push({ pos, data: migrateCollection(node.attrs.data as CollectionData) });
  });
  return refs;
}

/** Sammlung anhand ihrer ID finden (irgendwo im Dokument). */
export function findCollectionById(editor: Editor, collectionId: string): CollectionRef | undefined {
  return findCollections(editor).find((c) => c.data.id === collectionId);
}

/** Blatt (Sammlung + Sheet) anhand ihrer IDs finden. */
export function findSheet(editor: Editor, collectionId: string, sheetId: string): { collection: CollectionData; sheet: Sheet } | undefined {
  const ref = findCollectionById(editor, collectionId);
  const sheet = ref?.data.sheets.find((s) => s.id === sheetId);
  return ref && sheet ? { collection: ref.data, sheet } : undefined;
}

/** ID der Notiz, die dieser Editor zeigt (fehlt z. B. in Vorschauen). */
export function currentNoteId(editor: Editor): string | null {
  return (editor.storage as { noteLink?: { currentId?: string | null } }).noteLink?.currentId ?? null;
}

interface JsonNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
}

/** Alle Sammlungen im gespeicherten Notiz-JSON (für verknüpfte Sammlungen aus anderen Notizen). */
export function collectionsInJson(doc: JsonNode, out: CollectionData[] = []): CollectionData[] {
  if (doc.type === 'collection' && doc.attrs?.data) out.push(doc.attrs.data as CollectionData);
  for (const child of doc.content ?? []) collectionsInJson(child, out);
  return out;
}

/** Ersetzt im Notiz-JSON die Daten der Sammlung mit derselben ID. Gibt zurück, ob sie gefunden wurde. */
export function replaceCollectionInJson(doc: JsonNode, next: CollectionData): boolean {
  if (doc.type === 'collection' && (doc.attrs?.data as CollectionData | undefined)?.id === next.id) {
    doc.attrs = { ...doc.attrs, data: next };
    return true;
  }
  return (doc.content ?? []).some((child) => replaceCollectionInJson(child, next));
}
