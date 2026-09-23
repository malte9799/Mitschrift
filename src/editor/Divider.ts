import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { TextSelection } from '@tiptap/pm/state';

export type DividerVariant = 'dots' | 'dotted' | 'regular' | 'bold' | 'page';

export const dividerLabels: Record<DividerVariant, string> = {
  dots: 'Extra dünn',
  dotted: 'Dünn',
  regular: 'Regulär',
  bold: 'Fett',
  page: 'Seitenumbruch',
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    divider: {
      setDivider: (variant: DividerVariant) => ReturnType;
    };
  }
}

/** Trennlinie mit Stil: drei Punkte, gepunktet, durchgezogen, fett – oder Seitenumbruch (teilt die Notiz in Seiten-Rahmen). */
export const Divider = HorizontalRule.extend({
  addAttributes() {
    return {
      variant: {
        default: 'regular',
        parseHTML: (el) => el.getAttribute('data-variant') || 'regular',
        renderHTML: (attrs) => (attrs.variant && attrs.variant !== 'regular' ? { 'data-variant': attrs.variant } : {}),
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setDivider:
        (variant) =>
        ({ chain }) =>
          chain()
            .setHorizontalRule()
            // setHorizontalRule setzt den Cursor hinter die neue Linie – dort den Stil nachtragen.
            .command(({ tr }) => {
              const { selection } = tr;
              const at = selection instanceof TextSelection && selection.$from.depth > 0 ? selection.$from.before() : selection.from;
              const hr = tr.doc.resolve(at).nodeBefore;
              if (hr?.type.name === this.name) tr.setNodeMarkup(at - hr.nodeSize, undefined, { variant });
              return true;
            })
            .run(),
    };
  },
});
