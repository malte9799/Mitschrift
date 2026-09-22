import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutVariant = 'merke' | 'hint' | 'warn';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant: CalloutVariant) => ReturnType;
    };
  }
}

/** Callout-Block, rendert als .merke/.hint/.warn – dieselben Klassen wie in Content-Seiten. */
export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: { default: 'merke' as CalloutVariant },
    };
  },

  parseHTML() {
    return [
      { tag: 'div.merke', attrs: { variant: 'merke' } },
      { tag: 'div.hint', attrs: { variant: 'hint' } },
      { tag: 'div.warn', attrs: { variant: 'warn' } },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const variant = (node.attrs.variant as CalloutVariant) ?? 'merke';
    return ['div', mergeAttributes(HTMLAttributes, { class: variant }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (variant: CalloutVariant) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
    };
  },
});
