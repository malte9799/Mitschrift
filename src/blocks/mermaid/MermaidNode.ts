import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MermaidView } from './MermaidView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      insertMermaid: () => ReturnType;
    };
  }
}

/** Beispiel, damit ein neuer Block sofort etwas zeigt. */
export const sampleMermaid = `flowchart LR
  A[Licht] --> B(Chlorophyll)
  B --> C{Fotosynthese}
  C -->|Produkt| D[Glucose]
  C -->|Nebenprodukt| E[Sauerstoff]`;

/** Mermaid-Block: Diagramm aus Text-Code (Flussdiagramm, Sequenz, Mindmap …). */
export const MermaidNode = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-code') ?? el.textContent ?? '',
        renderHTML: (a) => ({ 'data-code': a.code }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-mermaid]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mermaid': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView);
  },

  addCommands() {
    return {
      insertMermaid:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { code: sampleMermaid } }),
    };
  },
});
