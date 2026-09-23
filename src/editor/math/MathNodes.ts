import { InputRule, Node, mergeAttributes, type Editor } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { openInlineEditor, openInlineEditorSoon } from '../inlineEdit';
import { renderMath } from './katex';
import { MathBlockView } from './MathBlockView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      insertMathInline: (latex?: string) => ReturnType;
      insertMathBlock: (latex?: string) => ReturnType;
    };
  }
}

const latexAttr = () => ({
  latex: {
    default: '',
    parseHTML: (el: HTMLElement) => el.getAttribute('data-latex') ?? '',
    renderHTML: (a: Record<string, unknown>) => ({ 'data-latex': a.latex }),
  },
});

/**
 * `$…$` wie bei GitHub: direkt nach dem öffnenden und vor dem schließenden `$` kein Leerzeichen,
 * davor kein Wortzeichen – so bleiben Beträge wie „5 $ bis 10 $“ Text.
 */
const INLINE_RULE = /(?:^|[^$\\\w])(\$([^\s$](?:[^$\n]*?[^\s$\\])?)\$)$/;

/** Formel mitten im Text, z. B. $E = mc^2$. Klick öffnet die Bearbeitung. */
export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes: latexAttr,

  parseHTML() {
    return [{ tag: 'span[data-math-inline]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-math-inline': '' }), `$${node.attrs.latex}$`];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('span');
      dom.className = 'math-inline';
      // Klicks gehen an die Formel, nicht an die Block-Auswahl.
      dom.setAttribute('data-interactive', '');
      let latex = node.attrs.latex as string;
      renderMath(dom, latex, false);
      dom.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || !editor.isEditable) return;
        e.preventDefault();
        const pos = getPos();
        if (typeof pos === 'number') openInlineEditor(editor, pos);
      });
      return {
        dom,
        update: (next) => {
          if (next.type !== node.type) return false;
          if (next.attrs.latex !== latex) {
            latex = next.attrs.latex;
            renderMath(dom, latex, false);
          }
          return true;
        },
        stopEvent: (e) => e.type === 'mousedown',
        ignoreMutation: () => true,
      };
    };
  },

  addCommands() {
    return {
      insertMathInline:
        (latex = '') =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { latex } }),
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: INLINE_RULE,
        handler: ({ state, range, match }) => {
          // Das gerade getippte schließende `$` steht noch nicht im Dokument.
          const from = range.to - (match[1].length - 1);
          state.tr.replaceWith(from, range.to, this.type.create({ latex: match[2] }));
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Markierten Text zur Formel machen bzw. eine leere Formel einfügen.
      'Mod-Shift-m': () => insertInlineMath(this.editor),
    };
  },
});

export function insertInlineMath(editor: Editor) {
  const { from, to, empty } = editor.state.selection;
  const latex = empty ? '' : editor.state.doc.textBetween(from, to, ' ');
  if (!editor.chain().focus().insertMathInline(latex).run()) return false;
  if (!latex) openInlineEditorSoon(editor, from);
  return true;
}

/** Abgesetzte Formel als eigener Block, wie `$$ … $$`. */
export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes: latexAttr,

  parseHTML() {
    return [{ tag: 'div[data-math-block]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-math-block': '' }), `$$${node.attrs.latex}$$`];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex = '') =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { latex } }),
    };
  },

  addInputRules() {
    return [
      // „$$“ + Leerzeichen am Anfang einer leeren Zeile wird zum Formel-Block.
      new InputRule({
        find: /^\$\$\s$/,
        handler: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          if ($from.parent.textContent !== '$$' || $from.depth === 0) return null;
          state.tr.replaceRangeWith($from.before(), $from.after(), this.type.create());
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // „$$“ + Enter ebenso.
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parent.type.name !== 'paragraph' || $from.parent.textContent !== '$$' || $from.depth === 0) return false;
        return editor.chain().insertContentAt({ from: $from.before(), to: $from.after() }, { type: this.name }).run();
      },
    };
  },
});
