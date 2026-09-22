import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cloze: {
      toggleCloze: () => ReturnType;
      insertCloze: () => ReturnType;
    };
  }
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Eingabefeld, das im Lernmodus an die Stelle des markierten Worts tritt. */
function createClozeSlot(answer: string): HTMLElement {
  const slot = document.createElement('span');
  slot.className = 'b-cloze-slot';

  const input = document.createElement('input');
  input.className = 'b-cloze-input';
  input.setAttribute('aria-label', 'Lücke ausfüllen');
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.style.width = `${Math.max(answer.length, 4) + 2}ch`;

  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'b-cloze-reveal';
  reveal.textContent = '?';
  reveal.title = 'Lösung zeigen';

  const check = () => {
    if (!input.value.trim()) return;
    const ok = normalize(input.value) === normalize(answer);
    slot.classList.remove('is-wrong', 'is-correct');
    void slot.offsetWidth; // Animation neu starten
    slot.classList.add(ok ? 'is-correct' : 'is-wrong');
    if (ok) input.readOnly = true;
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      check();
    }
  });
  input.addEventListener('blur', check);
  input.addEventListener('input', () => slot.classList.remove('is-wrong'));
  reveal.addEventListener('mousedown', (e) => e.preventDefault());
  reveal.addEventListener('click', () => {
    input.value = answer;
    input.readOnly = true;
    slot.classList.remove('is-wrong');
    slot.classList.add('is-revealed');
  });

  slot.append(input, reveal);
  return slot;
}

/**
 * Lückentext als Inline-Markierung: Im Bearbeiten-Modus ist das Wort nur
 * hervorgehoben, im Lernmodus wird es durch ein Eingabefeld ersetzt.
 */
export const ClozeMark = Mark.create({
  name: 'cloze',
  inclusive: false,

  parseHTML() {
    return [{ tag: 'span[data-cloze]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-cloze': '', class: 'b-cloze' }), 0];
  },

  addCommands() {
    return {
      toggleCloze:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      insertCloze:
        () =>
        ({ state, chain }) => {
          if (!state.selection.empty) return chain().setMark(this.name).run();
          return chain()
            .insertContent([{ type: 'text', text: 'Lösung', marks: [{ type: this.name }] }, { type: 'text', text: ' ' }])
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return { 'Mod-Shift-l': () => this.editor.commands.toggleCloze() };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const type = this.type;
    return [
      new Plugin({
        key: new PluginKey('clozeLearn'),
        props: {
          decorations(state) {
            if (editor.isEditable) return null;
            const decos: Decoration[] = [];
            const push = (from: number, to: number, text: string) => {
              decos.push(
                Decoration.widget(from, () => createClozeSlot(text), {
                  key: `cloze-${from}-${text}`,
                  side: -1,
                  stopEvent: () => true,
                  ignoreSelection: true,
                }),
                Decoration.inline(from, to, { class: 'b-cloze-hidden' }),
              );
            };
            state.doc.descendants((node, pos) => {
              if (!node.isTextblock) return true;
              let start = -1;
              let text = '';
              node.forEach((child, offset) => {
                const abs = pos + 1 + offset;
                if (child.isText && type.isInSet(child.marks)) {
                  if (start < 0) {
                    start = abs;
                    text = '';
                  }
                  text += child.text;
                } else if (start >= 0) {
                  push(start, abs, text);
                  start = -1;
                }
              });
              if (start >= 0) push(start, pos + 1 + node.content.size, text);
              return false;
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
