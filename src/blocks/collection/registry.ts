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
