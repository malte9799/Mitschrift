import { Extension, type Editor } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { InsertMenu, type InsertMenuHandle } from './InsertMenu';
import type { SnippetData } from '@/hooks/useSnippets';

export interface SlashCommandStorage {
  getSnippets: () => SnippetData[];
}

declare module '@tiptap/core' {
  interface Storage {
    slashCommand: SlashCommandStorage;
  }
}

/** Öffnet das InsertMenu, sobald "/" am Zeilenanfang/nach einem Leerzeichen getippt wird. */
export const SlashCommand = Extension.create<{ suggestion: Partial<SuggestionOptions> }, SlashCommandStorage>({
  name: 'slashCommand',

  addOptions() {
    return { suggestion: { char: '/', startOfLine: false } };
  },

  addStorage() {
    return { getSnippets: () => [] };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        command: ({ editor, range, props }) => {
          const ok = editor.chain().focus().deleteRange(range).run();
          if (!ok) return;
          (props as { run: (editor: Editor) => void }).run(editor);
        },
        render: () => {
          let component: ReactRenderer<InsertMenuHandle> | null = null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props) => {
              popup = document.createElement('div');
              popup.className = 'c-insert-menu-popup';
              document.body.appendChild(popup);

              const handle: InsertMenuHandle = {
                editor: props.editor,
                query: props.query,
                apply: (run) => props.command({ run } as never),
              };

              component = new ReactRenderer(InsertMenu, {
                editor: props.editor,
                props: {
                  handle,
                  snippets: storage.getSnippets(),
                  onClose: () => props.editor.chain().focus().deleteRange(props.range).run(),
                },
              });
              popup.appendChild(component.element);
              positionPopup(popup, props.clientRect?.());
              // Nach dem ersten React-Render die echte Höhe verwenden.
              requestAnimationFrame(() => popup && positionPopup(popup, props.clientRect?.()));
            },
            onUpdate: (props) => {
              if (!component || !popup) return;
              const handle: InsertMenuHandle = {
                editor: props.editor,
                query: props.query,
                apply: (run) => props.command({ run } as never),
              };
              component.updateProps({
                handle,
                snippets: storage.getSnippets(),
                onClose: () => props.editor.chain().focus().deleteRange(props.range).run(),
              });
              positionPopup(popup, props.clientRect?.());
            },
            onKeyDown: (props) => props.event.key === 'Escape',
            onExit: () => {
              popup?.remove();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});

function positionPopup(popup: HTMLDivElement, rect?: DOMRect | null) {
  if (!rect) return;
  popup.style.position = 'fixed';
  popup.style.zIndex = '50';
  const height = popup.offsetHeight || 320;
  const width = popup.offsetWidth || 240;
  // Unten kein Platz: Menü über der Zeile öffnen.
  const below = rect.bottom + 6 + height <= window.innerHeight;
  popup.style.top = `${below ? rect.bottom + 6 : Math.max(8, rect.top - height - 6)}px`;
  popup.style.left = `${Math.min(rect.left, window.innerWidth - width - 8)}px`;
  popup.style.transformOrigin = below ? 'top left' : 'bottom left';
}
