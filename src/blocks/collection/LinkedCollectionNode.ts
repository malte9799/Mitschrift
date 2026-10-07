import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { jsonAttr } from '../jsonAttr';
import { LinkedCollectionView } from './LinkedCollectionView';
import { collectionStopEvent } from './CollectionNode';
import type { View } from './model';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkedCollection: {
      insertLinkedCollection: () => ReturnType;
    };
  }
}

/**
 * Verknüpfte Sammlung: zeigt eine Sammlung aus dieser oder einer anderen Notiz mit eigenen
 * Ansichten (Filter, Sortierung, Gruppen). Die Zeilen bleiben in der ursprünglichen Sammlung.
 */
export const LinkedCollectionNode = Node.create({
  name: 'linkedCollection',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      noteId: { default: null, parseHTML: (el) => el.getAttribute('data-note-id'), renderHTML: (a) => (a.noteId ? { 'data-note-id': a.noteId } : {}) },
      collectionId: { default: null, parseHTML: (el) => el.getAttribute('data-collection-id'), renderHTML: (a) => (a.collectionId ? { 'data-collection-id': a.collectionId } : {}) },
      /** Eigene Ansichten je Blatt-ID. */
      views: jsonAttr<Record<string, View[]>>('views', {}),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-linked-collection]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-linked-collection': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkedCollectionView, { stopEvent: collectionStopEvent });
  },

  addCommands() {
    return {
      insertLinkedCollection:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
