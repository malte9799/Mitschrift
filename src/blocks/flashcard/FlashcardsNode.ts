import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FlashcardsView } from './FlashcardsView';
import { jsonAttr } from '../jsonAttr';

export interface Flashcard {
  front: string;
  back: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    flashcards: {
      insertFlashcards: () => ReturnType;
    };
  }
}

/** Karteikarten-Stapel: im Lernmodus umdrehen, als gewusst/nochmal sortieren. */
export const FlashcardsNode = Node.create({
  name: 'flashcards',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      title: { default: '', rendered: false },
      cards: jsonAttr<Flashcard[]>('cards', [{ front: '', back: '' }]),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-flashcards]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-flashcards': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FlashcardsView);
  },

  addCommands() {
    return {
      insertFlashcards:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { cards: [{ front: '', back: '' }] } }),
    };
  },
});
