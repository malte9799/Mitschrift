import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ColumnsView } from './ColumnsView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      /** Fügt ein Spalten-Layout mit `count` leeren Spalten ein. */
      insertColumns: (count?: number) => ReturnType;
    };
  }
}

/** Breitenverteilung bei zwei Spalten; bei mehr Spalten sind alle gleich breit. */
export type ColumnsLayout = 'equal' | 'wide-left' | 'wide-right';
export const MAX_COLUMNS = 4;

const emptyColumn = () => ({ type: 'column', content: [{ type: 'paragraph' }] });

/** Eine Spalte: beliebige Blöcke untereinander. */
export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-column]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-column': '', class: 'cols-col' }), 0];
  },
});

/** Spalten-Layout: zwei bis vier Spalten nebeneinander, auf schmalen Flächen untereinander. */
export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: `column{2,${MAX_COLUMNS}}`,
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      layout: {
        default: 'equal',
        parseHTML: (el) => el.getAttribute('data-layout') ?? 'equal',
        renderHTML: (attrs) => ({ 'data-layout': attrs.layout }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-columns]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-columns': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnsView);
  },

  addCommands() {
    return {
      insertColumns:
        (count = 2) =>
        ({ chain, state }) => {
          const { $from } = state.selection;
          const content = { type: this.name, content: Array.from({ length: Math.max(2, Math.min(count, MAX_COLUMNS)) }, emptyColumn) };
          // Leere Zeile auf oberster Ebene wird ersetzt, sonst kommt das Layout dahinter.
          const emptyLine = $from.depth === 1 && $from.parent.isTextblock && $from.parent.content.size === 0;
          const at = emptyLine ? { from: $from.before(1), to: $from.after(1) } : $from.depth > 0 ? $from.after(1) : $from.pos;
          const start = typeof at === 'number' ? at : at.from;
          // +3: in Layout → erste Spalte → ersten Absatz.
          return chain().insertContentAt(at, content).setTextSelection(start + 3).run();
        },
    };
  },
});
