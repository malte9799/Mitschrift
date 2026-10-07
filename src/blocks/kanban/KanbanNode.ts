import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { jsonAttr } from '../jsonAttr';
import { KanbanView } from './KanbanView';
import { sampleKanban, type KanbanData } from './model';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    kanban: {
      insertKanban: () => ReturnType;
    };
  }
}

/** Kanban-Board: Spalten mit Karten, per Drag & Drop sortierbar; Karten können eine Notiz und ein Fälligkeitsdatum haben. */
export const KanbanNode = Node.create({
  name: 'kanban',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      data: jsonAttr<KanbanData>('data', sampleKanban()),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-kanban]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-kanban': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(KanbanView, {
      stopEvent: ({ event }) => {
        const t = event.target;
        if (event.type.startsWith('drag') || event.type === 'drop') return false;
        if (t instanceof Element && t.closest('.b-pop')) return true;
        if (t instanceof HTMLElement && (['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(t.tagName) || t.isContentEditable)) return true;
        return !['mousedown', 'copy', 'paste', 'cut'].includes(event.type);
      },
    });
  },

  addCommands() {
    return {
      insertKanban:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { data: sampleKanban() } }),
    };
  },
});
