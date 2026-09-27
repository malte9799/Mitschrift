import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AttachmentView } from './AttachmentView';

const str = (name: string) => ({
  default: null as string | null,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`),
  renderHTML: (a: Record<string, unknown>) => (a[name] ? { [`data-${name}`]: a[name] as string } : {}),
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    attachment: {
      /** Leerer Anhang-Block zum Hochladen. */
      insertAttachment: () => ReturnType;
    };
  }
}

/** Beliebige Datei (PDF, ZIP, Dokument …), lokal gespeichert wie ein Bild, mit Download-Link. */
export const AttachmentNode = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      fileId: str('file-id'),
      name: str('name'),
      mimeType: str('mime-type'),
      size: {
        default: null as number | null,
        parseHTML: (el: HTMLElement) => {
          const v = parseInt(el.getAttribute('data-size') ?? '', 10);
          return Number.isFinite(v) ? v : null;
        },
        renderHTML: (a: Record<string, unknown>) => (a.size != null ? { 'data-size': String(a.size) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-attachment]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-attachment': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentView, {
      stopEvent: ({ event }) => event.type.startsWith('drag') || event.type === 'drop',
    });
  },

  addCommands() {
    return {
      insertAttachment:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { fileId: null } }),
    };
  },
});
