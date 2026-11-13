import { Node, getMarkRange, mergeAttributes, type Editor } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { sanitizeHref } from '@/lib/url';
import { SmartLinkView } from './SmartLinkView';
import { analyzeUrl, type SmartLinkKind } from './urlPatterns';

/** Darstellung eines externen Links: im Text, als Zeile (Favicon, Titel, Domain), eingebettetes Bild/Video/Audio. */
export type SmartLinkView_ = 'link' | 'row' | 'image' | 'video' | 'audio';

export const smartLinkViewLabels: Record<SmartLinkView_, string> = {
  link: 'Link',
  row: 'Zeile',
  image: 'Bild',
  video: 'Video',
  audio: 'Audio',
};

export interface SmartLinkAttrs {
  href: string;
  view: Exclude<SmartLinkView_, 'link'>;
  /** Zuletzt bekannter Linktext – für Export/Zwischenablage. */
  title: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smartLink: {
      insertSmartLink: (attrs: Partial<SmartLinkAttrs> & { href: string }) => ReturnType;
    };
  }
}

/** href nur mit erlaubtem Schema – sonst leer (beim Einfügen/Parsen und Rendern). */
const hrefAttr = {
  default: '',
  parseHTML: (el: HTMLElement) => sanitizeHref(el.getAttribute('data-href')) ?? '',
  renderHTML: (a: Record<string, unknown>) => ({ 'data-href': sanitizeHref(a.href) ?? '' }),
};

const str = (name: string, fallback: string | null) => ({
  default: fallback,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) ?? fallback,
  renderHTML: (a: Record<string, unknown>) => (a[name] === null || a[name] === undefined ? {} : { [`data-${name}`]: String(a[name]) }),
});

/** Verweis auf eine externe Seite als eigener Block: Zeile, eingebettetes Bild, Video oder Audio. */
export const SmartLinkNode = Node.create({
  name: 'smartLink',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: hrefAttr,
      view: str('view', 'row'),
      title: str('title', ''),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-smart-link]' }];
  },

  // Außerhalb von Mitschrift (Zwischenablage, andere Apps) bleibt es ein normaler Link.
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-smart-link': '' }), ['a', { href: sanitizeHref(node.attrs.href) ?? '#' }, node.attrs.title || node.attrs.href]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SmartLinkView, {
      attrs: ({ node }) => ({ 'data-smart-view': node.attrs.view }),
    });
  },

  addCommands() {
    return {
      insertSmartLink:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { view: analyzeUrl(attrs.href).kind === 'generic' ? 'row' : analyzeUrl(attrs.href).kind, ...attrs } }),
    };
  },
});

/** Wandelt den Link an `pos` in einen Block um. Steht der Link allein im Absatz, ersetzt der Block den Absatz. */
export function externalLinkToBlock(editor: Editor, pos: number, view: SmartLinkAttrs['view']) {
  const { state } = editor;
  const $pos = state.doc.resolve(pos);
  const linkType = state.schema.marks.link;
  const range = getMarkRange($pos, linkType) ?? getMarkRange(state.doc.resolve(pos + 1), linkType);
  if (!range) return false;
  const mark = state.doc.resolve(range.from + 1).marks().find((m) => m.type === linkType) ?? $pos.marks().find((m) => m.type === linkType);
  const href = mark?.attrs.href as string | undefined;
  if (!href) return false;
  const title = state.doc.textBetween(range.from, range.to);
  const para = state.doc.resolve(range.from);
  const block = { type: 'smartLink', attrs: { href, view, title } };
  const parentStart = para.start();
  const parentEnd = para.end();
  const rest = (state.doc.textBetween(parentStart, range.from) + state.doc.textBetween(range.to, parentEnd)).trim();
  if (!rest) {
    return editor.chain().focus().insertContentAt({ from: para.before(), to: para.after() }, block).run();
  }
  const after = para.after();
  return editor.chain().focus().insertContentAt(after, block).deleteRange(range).run();
}

/** Macht aus dem Block an `pos` wieder einen Absatz mit Link. */
export function smartBlockToLink(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== 'smartLink') return false;
  return editor
    .chain()
    .focus()
    .insertContentAt(
      { from: pos, to: pos + node.nodeSize },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: node.attrs.title || node.attrs.href, marks: [{ type: 'link', attrs: { href: node.attrs.href } }] }],
      },
    )
    .run();
}

export type { SmartLinkKind };
