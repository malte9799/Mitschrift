import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { BinaryFiles } from '@excalidraw/excalidraw/types';
import { WhiteboardView } from './WhiteboardView';
import { jsonAttr } from '../jsonAttr';

/** Gespeicherte Zeichnung: Excalidraw-Elemente samt eingefügter Bilder. */
export interface WhiteboardScene {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
}

export const emptyScene: WhiteboardScene = { elements: [], files: {} };

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    whiteboard: {
      insertWhiteboard: () => ReturnType;
    };
  }
}

/** Ein frisch eingefügtes Whiteboard öffnet sofort den Zeichen-Editor. */
let openNextOnMount = false;
export function takeOpenOnMount(): boolean {
  const open = openNextOnMount;
  openNextOnMount = false;
  return open;
}

/**
 * Whiteboard-Block: freie Zeichnung mit Excalidraw. In der Notiz steht eine Vorschau
 * (SVG, beim Schließen des Editors erzeugt), gezeichnet wird in einem eigenen Fenster.
 */
export const WhiteboardNode = Node.create({
  name: 'whiteboard',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      scene: jsonAttr<WhiteboardScene>('scene', emptyScene),
      /** Vorschau als SVG-Text (helles Farbschema, transparenter Hintergrund). */
      svg: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-svg') ?? '',
        renderHTML: (a) => ({ 'data-svg': a.svg }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-whiteboard]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-whiteboard': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WhiteboardView);
  },

  addProseMirrorPlugins() {
    // Sicherheitsnetz: Solange das Zeichenfenster offen ist, gehören alle Tasten Excalidraw.
    const windowOpen = () => !!document.querySelector('.b-whiteboard-window');
    return [new Plugin({ props: { handleKeyDown: windowOpen, handleTextInput: windowOpen } })];
  },

  addCommands() {
    return {
      insertWhiteboard:
        () =>
        ({ commands, dispatch }) => {
          openNextOnMount = !!dispatch;
          const ok = commands.insertContent({ type: this.name });
          if (!ok) openNextOnMount = false;
          return ok;
        },
    };
  },
});
