import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { QuizView } from './QuizView';
import { jsonAttr } from '../jsonAttr';

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  why: string;
}

export const emptyQuestion = (): QuizQuestion => ({ question: '', options: ['', ''], correct: 0, why: '' });

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    quiz: {
      insertQuiz: () => ReturnType;
    };
  }
}

/** Multiple-Choice-Quiz mit Auswertung und Erklärung pro Frage. */
export const QuizNode = Node.create({
  name: 'quiz',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      questions: jsonAttr<QuizQuestion[]>('questions', [emptyQuestion()]),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-quiz]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-quiz': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuizView);
  },

  addCommands() {
    return {
      insertQuiz:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { questions: [emptyQuestion()] } }),
    };
  },
});
