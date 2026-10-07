import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TocView } from './TocView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toc: {
      insertToc: () => ReturnType;
    };
  }
}

/** Inhaltsverzeichnis: listet die Überschriften der Notiz und springt per Klick dorthin. */
export const TocNode = Node.create({
  name: 'toc',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      /** Tiefste angezeigte Überschriften-Ebene (1–3). */
      depth: { default: 3, parseHTML: (el) => Number(el.getAttribute('data-depth')) || 3, renderHTML: (a) => ({ 'data-depth': a.depth }) },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-toc]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-toc': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TocView);
  },

  addCommands() {
    return {
      insertToc:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
