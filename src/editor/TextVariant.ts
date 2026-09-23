import { Extension } from '@tiptap/core';

export type TextVariant = 'strong' | 'caption';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textVariant: {
      /** Macht den Block zum Absatz mit Variante (Fett/Beschriftung); `null` = normaler Text. */
      setTextVariant: (variant: TextVariant | null) => ReturnType;
    };
  }
}

/** Absatz-Varianten „Fett“ und „Beschriftung“ als Attribut statt eigener Überschriften-Ebenen. */
export const TextVariantExtension = Extension.create({
  name: 'textVariant',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          variant: {
            default: null,
            parseHTML: (el) => el.getAttribute('data-variant'),
            renderHTML: (attrs) => (attrs.variant ? { 'data-variant': attrs.variant } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextVariant:
        (variant) =>
        ({ chain }) =>
          chain().setParagraph().updateAttributes('paragraph', { variant }).run(),
    };
  },
});
