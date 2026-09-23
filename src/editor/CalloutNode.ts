import { Node, mergeAttributes } from '@tiptap/core';

/** Die fünf Hinweis-Arten wie bei GitHub (> [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]). */
export type CalloutVariant = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export const calloutVariants: CalloutVariant[] = ['note', 'tip', 'important', 'warning', 'caution'];

export const calloutLabels: Record<CalloutVariant, string> = {
  note: 'Hinweis',
  tip: 'Tipp',
  important: 'Wichtig',
  warning: 'Warnung',
  caution: 'Vorsicht',
};

/** Frühere Varianten (Merke/Hinweis/Warnung) auf die neuen abbilden. */
const legacy: Record<string, CalloutVariant> = { merke: 'important', hint: 'note', warn: 'warning' };

/** Gespeicherten oder eingelesenen Wert in eine gültige Variante umwandeln. */
export function calloutVariant(raw: unknown): CalloutVariant {
  const v = String(raw ?? '').toLowerCase();
  return (calloutVariants as string[]).includes(v) ? (v as CalloutVariant) : (legacy[v] ?? 'note');
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant: CalloutVariant) => ReturnType;
    };
  }
}

/**
 * Hinweis-Block im GitHub-Stil: farbiger Balken links, Titelzeile mit Symbol, darunter der Inhalt.
 * Die Titelzeile ist nicht bearbeitbar; der Inhalt steckt in .callout-body.
 */
export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: { default: 'note' as CalloutVariant, rendered: false },
    };
  },

  parseHTML() {
    const body = (el: HTMLElement) => el.querySelector<HTMLElement>(':scope > .callout-body') ?? el;
    return [
      { tag: 'div[data-callout]', contentElement: body, getAttrs: (el) => ({ variant: calloutVariant(el.dataset.callout) }) },
      // Ältere Kopien bzw. Seiten mit .merke/.hint/.warn.
      ...Object.keys(legacy).map((cls) => ({ tag: `div.${cls}`, attrs: { variant: legacy[cls] } })),
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const variant = calloutVariant(node.attrs.variant);
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: `callout callout-${variant}`, 'data-callout': variant }),
      ['div', { class: 'callout-title', contenteditable: 'false' }, calloutLabels[variant]],
      ['div', { class: 'callout-body' }, 0],
    ];
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
