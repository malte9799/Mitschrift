import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ToggleView } from './ToggleView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleBlock: {
      insertToggle: () => ReturnType;
    };
  }
}

/**
 * Aufklapp-Block: sichtbarer Titel (z. B. eine Frage) + verborgener Inhalt.
 * Im Lernmodus startet er immer zugeklappt – zum Selbst-Abfragen.
 */
export const ToggleNode = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      summary: {
        default: '',
        parseHTML: (el) => el.querySelector(':scope > summary')?.textContent ?? '',
        rendered: false,
      },
      open: { default: true, rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: 'details[data-toggle]', contentElement: 'div' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['details', mergeAttributes(HTMLAttributes, { 'data-toggle': '' }), ['summary', {}, node.attrs.summary], ['div', 0]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },

  addCommands() {
    return {
      insertToggle:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { summary: '' }, content: [{ type: 'paragraph' }] }),
    };
  },
});
