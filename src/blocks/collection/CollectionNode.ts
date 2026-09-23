import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { jsonAttr } from '../jsonAttr';
import { CollectionView } from './CollectionView';
import { sampleCollection, type CollectionData } from './model';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collection: {
      insertCollection: () => ReturnType;
    };
  }
}

/**
 * Sammlung: erweiterte Tabelle mit mehreren Tabellenblättern und typisierten Feldern
 * (Text, Nummer, Checkbox, Datum, URL, E-Mail, Telefon, Einzel-/Mehrfachauswahl).
 */
export const CollectionNode = Node.create({
  name: 'collection',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      data: jsonAttr<CollectionData>('data', sampleCollection()),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-collection]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-collection': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CollectionView, {
      stopEvent: ({ event }) => {
        const t = event.target;
        if (event.type.startsWith('drag') || event.type === 'drop') return false;
        // Die Tabelle verwaltet Klicks, Tastatur und Zwischenablage selbst (Zellauswahl).
        if (t instanceof Element && t.closest('.b-coll-scroll')) return true;
        // Sonst wie der Tiptap-Standard: Eingabefelder für sich, Klicks und Zwischenablage an ProseMirror.
        if (t instanceof HTMLElement && (['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(t.tagName) || t.isContentEditable)) return true;
        return !['mousedown', 'copy', 'paste', 'cut'].includes(event.type);
      },
    });
  },

  addCommands() {
    return {
      insertCollection:
        () =>
        ({ commands }) =>
          // Jede neue Sammlung bekommt eigene IDs.
          commands.insertContent({ type: this.name, attrs: { data: sampleCollection() } }),
    };
  },
});
