import { Mark, Node, mergeAttributes, type Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { openInlineEditor, openInlineEditorSoon } from './inlineEdit';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      insertFootnote: (text?: string) => ReturnType;
    };
    kbd: {
      toggleKbd: () => ReturnType;
    };
  }
}

/** Alle Fußnoten in Dokument-Reihenfolge (= ihre Nummer). */
export function listFootnotes(doc: PMNode): { pos: number; text: string }[] {
  const out: { pos: number; text: string }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'footnote') out.push({ pos, text: node.attrs.text as string });
  });
  return out;
}

const numbersKey = new PluginKey<DecorationSet>('footnoteNumbers');

/** Nummeriert die Fußnoten fortlaufend (als data-n am Verweis, die Zahl zeichnet CSS). */
function numberFootnotes(doc: PMNode) {
  return DecorationSet.create(
    doc,
    listFootnotes(doc).map((f, i) => Decoration.node(f.pos, f.pos + 1, { 'data-n': String(i + 1) })),
  );
}

/**
 * Fußnote wie bei GitHub (`Text[^1]` … `[^1]: Quelle`): Im Text steht nur die hochgestellte Nummer,
 * der Fußnotentext hängt am Verweis und wird unter der Notiz gesammelt aufgelistet.
 */
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-footnote') ?? '',
        renderHTML: (a) => ({ 'data-footnote': a.text }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-footnote]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, { class: 'fn-ref' })];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('sup');
      dom.className = 'fn-ref';
      dom.setAttribute('data-interactive', '');
      dom.title = node.attrs.text;
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
          dom.title = next.attrs.text;
          return true;
        },
        stopEvent: (e) => e.type === 'mousedown',
        ignoreMutation: () => true,
      };
    };
  },

  addCommands() {
    return {
      insertFootnote:
        (text = '') =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { text } }),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: numbersKey,
        state: {
          init: (_, state) => numberFootnotes(state.doc),
          apply: (tr, old, _prev, state) => (tr.docChanged ? numberFootnotes(state.doc) : old),
        },
        props: {
          decorations: (state) => numbersKey.getState(state),
        },
      }),
    ];
  },
});

/** Fußnote an der Schreibmarke einfügen und gleich zum Beschreiben öffnen. */
export function insertFootnote(editor: Editor) {
  // Hinter die Auswahl setzen, markierter Text bleibt stehen.
  const at = editor.state.selection.to;
  if (!editor.chain().focus().setTextSelection(at).insertFootnote().run()) return false;
  openInlineEditorSoon(editor, at);
  return true;
}

/** Taste wie bei GitHub: <kbd>⌘</kbd> + <kbd>C</kbd>. */
export const Kbd = Mark.create({
  name: 'kbd',
  excludes: 'code',

  parseHTML() {
    return [{ tag: 'kbd' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['kbd', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleKbd:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return { 'Mod-Shift-k': () => this.editor.commands.toggleKbd() };
  },
});
