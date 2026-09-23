import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { GlossaryListView } from './GlossaryListView';

export type GlossaryScope = 'note' | 'all';

/** Abkürzungsverzeichnis: listet automatisch alle Glossar-Begriffe, die in der Notiz vorkommen. */
export const GlossaryListNode = Node.create({
  name: 'glossaryList',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      title: { default: 'Abkürzungsverzeichnis', parseHTML: (el) => el.getAttribute('data-title') ?? '', renderHTML: (a) => ({ 'data-title': a.title }) },
      scope: {
        default: 'note' as GlossaryScope,
        parseHTML: (el) => (el.getAttribute('data-scope') === 'all' ? 'all' : 'note'),
        renderHTML: (a) => ({ 'data-scope': a.scope }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-glossary-list]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-glossary-list': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GlossaryListView);
  },
});
