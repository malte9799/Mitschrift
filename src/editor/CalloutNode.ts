import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CalloutView } from './CalloutView';

/** Die fünf Vorlagen wie bei GitHub (> [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]). */
export type CalloutVariant = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export const calloutVariants: CalloutVariant[] = ['note', 'tip', 'important', 'warning', 'caution'];

export const calloutLabels: Record<CalloutVariant, string> = {
  note: 'Hinweis',
  tip: 'Tipp',
  important: 'Wichtig',
  warning: 'Warnung',
  caution: 'Vorsicht',
};

/** Symbole als SVG-Inhalt (24er-Raster, Kontur). Die ersten fünf gehören zu den Vorlagen. */
export const calloutIcons = {
  info: `<circle cx="12" cy="12" r="9.5"/><path d="M12 16.5v-5M12 7.5h.01"/>`,
  bulb: `<path d="M9 18h6M10 21.5h4M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.3 1 2.1V17h6v-.8c0-.8.4-1.5 1-2.1a6.5 6.5 0 0 0-4-11.6z"/>`,
  speech: `<path d="M20.5 3.5h-17v13H8v4l4.5-4h8z"/><path d="M12 7v4.5M12 14h.01"/>`,
  triangle: `<path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>`,
  octagon: `<path d="M7.9 2.5h8.2l5.4 5.4v8.2l-5.4 5.4H7.9l-5.4-5.4V7.9z"/><path d="M12 7.5v5M12 16.5h.01"/>`,
  check: `<circle cx="12" cy="12" r="9.5"/><path d="m8 12.5 2.8 2.8L16 9.8"/>`,
  question: `<circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.9M12 17h.01"/>`,
  star: `<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>`,
  heart: `<path d="M12 20.5s-8-4.8-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.1c0 5.6-8 10.4-8 10.4z"/>`,
  bookmark: `<path d="M6 3.5h12v17l-6-4-6 4z"/>`,
  book: `<path d="M4 5.5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2z"/><path d="M4 19.5a2 2 0 0 0 2 2h14v-4"/>`,
  pencil: `<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>`,
  flag: `<path d="M5 21V4h11l-2 4 2 4H5"/>`,
  flame: `<path d="M12 21.5a7 7 0 0 0 7-7c0-4-3-6.5-4-9.5-1.5 2-2 3.5-2 5-1.5-1-2.5-2.5-2.5-4.5C7.5 8 5 11 5 14.5a7 7 0 0 0 7 7z"/>`,
  target: `<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>`,
} as const;
export type CalloutIcon = keyof typeof calloutIcons;

/** Farben: die fünf Vorlagen-Töne plus die Tag-Farben. */
export const calloutColors = {
  blue: { label: 'Blau', css: 'var(--blue)' },
  green: { label: 'Grün', css: 'var(--green)' },
  purple: { label: 'Lila', css: 'var(--purple)' },
  amber: { label: 'Gelb', css: 'var(--amber)' },
  red: { label: 'Rot', css: 'var(--red)' },
  teal: { label: 'Petrol', css: 'var(--tag-teal)' },
  orange: { label: 'Orange', css: 'var(--tag-orange)' },
  pink: { label: 'Pink', css: 'var(--tag-pink)' },
  graphite: { label: 'Grafit', css: 'var(--tag-graphite)' },
} as const;
export type CalloutColor = keyof typeof calloutColors;

export const calloutPresets: Record<CalloutVariant, { icon: CalloutIcon; color: CalloutColor }> = {
  note: { icon: 'info', color: 'blue' },
  tip: { icon: 'bulb', color: 'green' },
  important: { icon: 'speech', color: 'purple' },
  warning: { icon: 'triangle', color: 'amber' },
  caution: { icon: 'octagon', color: 'red' },
};

/** Frühere Varianten (Merke/Hinweis/Warnung) auf die neuen abbilden. */
const legacy: Record<string, CalloutVariant> = { merke: 'important', hint: 'note', warn: 'warning' };

/** Gespeicherten oder eingelesenen Wert in eine gültige Variante umwandeln. */
export function calloutVariant(raw: unknown): CalloutVariant {
  const v = String(raw ?? '').toLowerCase();
  return (calloutVariants as string[]).includes(v) ? (v as CalloutVariant) : (legacy[v] ?? 'note');
}

/** Darstellung: Strich vorne (wie ein Zitat) oder Fläche hinter dem ganzen Block. Strich ist der Standard. */
export type CalloutStyle = 'bar' | 'background';

export interface ResolvedCallout {
  variant: CalloutVariant;
  title: string;
  icon: CalloutIcon;
  color: CalloutColor;
  style: CalloutStyle;
}

/** Vorlage plus eigene Anpassungen (Titel, Symbol, Farbe, Stil) zu den tatsächlich angezeigten Werten auflösen. */
export function resolveCallout(attrs: Record<string, unknown>): ResolvedCallout {
  const variant = calloutVariant(attrs.variant);
  const preset = calloutPresets[variant];
  const title = typeof attrs.title === 'string' && attrs.title.trim() ? attrs.title : calloutLabels[variant];
  const icon = typeof attrs.icon === 'string' && attrs.icon in calloutIcons ? (attrs.icon as CalloutIcon) : preset.icon;
  const color = typeof attrs.color === 'string' && attrs.color in calloutColors ? (attrs.color as CalloutColor) : preset.color;
  const style = attrs.style === 'background' ? 'background' : 'bar';
  return { variant, title, icon, color, style };
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant: CalloutVariant) => ReturnType;
    };
  }
}

const dataAttr = (name: string) => ({
  default: null as string | null,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) || null,
  renderHTML: (attrs: Record<string, unknown>) => (attrs[name] ? { [`data-${name}`]: attrs[name] } : {}),
});

/**
 * Hervorhebung im GitHub-Stil: farbiger Balken links, Titelzeile mit Symbol, darunter der Inhalt.
 * Die fünf Varianten sind Vorlagen; Titel, Symbol und Farbe lassen sich je Block überschreiben.
 */
export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: { default: 'note' as CalloutVariant, rendered: false },
      title: dataAttr('title'),
      icon: dataAttr('icon'),
      color: dataAttr('color'),
      style: dataAttr('style'),
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
    const c = resolveCallout(node.attrs);
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: `callout callout-${c.variant} callout-style-${c.style}`,
        'data-callout': c.variant,
        style: `--tone:${calloutColors[c.color].css}`,
      }),
      ['div', { class: 'callout-title', contenteditable: 'false' }, c.title],
      ['div', { class: 'callout-body' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
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
