import { Node, getMarkRange, mergeAttributes, type Editor } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { noteHref } from '@/app/noteLinks';
import { NoteBlockView } from './NoteBlockView';

/** Darstellung eines Notiz-Verweises: im Text (Link), als Zeile oder als Karte mit Vorschau. */
export type NoteView = 'link' | 'row' | 'card';
export type NoteCardSize = 's' | 'm' | 'l';

export const noteViewLabels: Record<NoteView, string> = { link: 'Link', row: 'Zeile', card: 'Karte' };
export const noteSizeLabels: Record<NoteCardSize, string> = { s: 'Klein', m: 'Mittel', l: 'Groß' };

export interface NoteBlockAttrs {
  id: string;
  view: Exclude<NoteView, 'link'>;
  size: NoteCardSize;
  /** `null` = automatisch (Textanfang der Notiz), `''` = ausgeblendet, sonst eigener Text. */
  subtitle: string | null;
  /** Zuletzt bekannter Titel – für Export/Zwischenablage, die die Notizliste nicht kennen. */
  title: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteBlock: {
      insertNoteBlock: (attrs: Partial<NoteBlockAttrs> & { id: string }) => ReturnType;
    };
  }
}

const str = (name: string, fallback: string | null) => ({
  default: fallback,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) ?? fallback,
  renderHTML: (a: Record<string, unknown>) => (a[name] === null || a[name] === undefined ? {} : { [`data-${name}`]: String(a[name]) }),
});

/** Verweis auf eine andere Notiz als eigener Block. Karten nebeneinander bilden ein Raster. */
export const NoteBlockNode = Node.create({
  name: 'noteBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      id: str('id', ''),
      view: str('view', 'row'),
      size: str('size', 'm'),
      subtitle: str('subtitle', null),
      title: str('title', ''),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-note-block]' }];
  },

  // Außerhalb von Mitschrift (Zwischenablage, andere Apps) bleibt es ein normaler Link.
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-note-block': '' }), ['a', { href: noteHref(node.attrs.id) }, node.attrs.title || 'Ohne Titel']];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteBlockView, {
      // Am äußeren Element, damit CSS Karten im Editor nebeneinander fließen lassen kann.
      attrs: ({ node }) => ({ 'data-note-view': node.attrs.view, 'data-note-size': node.attrs.size }),
    });
  },

  addCommands() {
    return {
      insertNoteBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

/** Wandelt den Link an `pos` in einen Block um. Steht der Link allein im Absatz, ersetzt der Block den Absatz. */
export function linkToBlock(editor: Editor, pos: number, view: NoteBlockAttrs['view'], size: NoteCardSize = 'm') {
  const { state } = editor;
  const $pos = state.doc.resolve(pos);
  const linkType = state.schema.marks.link;
  const range = getMarkRange($pos, linkType) ?? getMarkRange(state.doc.resolve(pos + 1), linkType);
  if (!range) return false;
  const mark = state.doc.resolve(range.from + 1).marks().find((m) => m.type === linkType) ?? $pos.marks().find((m) => m.type === linkType);
  const href = mark?.attrs.href as string | undefined;
  const id = href?.match(/\/n\/([^/?#]+)/)?.[1];
  if (!id) return false;
  const title = state.doc.textBetween(range.from, range.to);
  const para = state.doc.resolve(range.from);
  const block = { type: 'noteBlock', attrs: { id, view, size, title } };
  const parentStart = para.start();
  const parentEnd = para.end();
  const rest = (state.doc.textBetween(parentStart, range.from) + state.doc.textBetween(range.to, parentEnd)).trim();
  // Nur in normalen Absätzen auf oberster Ebene / in Containern, die Blöcke erlauben.
  if (!rest) {
    return editor.chain().focus().insertContentAt({ from: para.before(), to: para.after() }, block).run();
  }
  const after = para.after();
  return editor
    .chain()
    .focus()
    .insertContentAt(after, block)
    .deleteRange(range)
    .run();
}

/** Macht aus dem Block an `pos` wieder einen Absatz mit Link. */
export function blockToLink(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== 'noteBlock') return false;
  return editor
    .chain()
    .focus()
    .insertContentAt(
      { from: pos, to: pos + node.nodeSize },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: node.attrs.title || 'Ohne Titel', marks: [{ type: 'link', attrs: { href: noteHref(node.attrs.id) } }] }],
      },
    )
    .run();
}
