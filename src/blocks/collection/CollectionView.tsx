import { useEffect } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { CollectionBody } from './CollectionBody';
import { migrateCollection, sheetViews, type CollectionData } from './model';
import { currentNoteId, findCollections } from './registry';

/** Sammlung, deren Daten in diesem Block liegen. */
export function CollectionView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const data = migrateCollection(node.attrs.data as CollectionData);
  // Ältere Sammlung ohne ID: einmalig die ergänzte ID speichern, sonst würde bei jedem Rendern eine neue entstehen.
  useEffect(() => {
    if ((node.attrs.data as CollectionData).id !== data.id) updateAttributes({ data });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim ersten Rendern mit fehlender ID
  }, []);

  return (
    <CollectionBody
      editor={editor}
      getPos={getPos}
      nodeSize={node.nodeSize}
      data={data}
      save={(next) => updateAttributes({ data: next })}
      all={findCollections(editor).map((c) => (c.data.id === data.id ? data : c.data))}
      viewsOf={sheetViews}
      // Die alte Sortierung am Blatt steckt ab jetzt in den Ansichten.
      saveViews={(sheetId, views) => updateAttributes({ data: { ...data, sheets: data.sheets.map((s) => (s.id === sheetId ? { ...s, views, sort: undefined } : s)) } })}
      parentNoteId={currentNoteId(editor)}
    />
  );
}
