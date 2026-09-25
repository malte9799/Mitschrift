import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { jsonAttr } from '@/blocks/jsonAttr';
import { ImageView } from './image/ImageView';
import { imageFiles, storeImageFile } from './image/files';
import { looksLikeImageUrl, type ImageAlign, type ImageEdit, type ImageFrame, type ImageLayout } from './image/model';

export { resolveSrc, pickImage } from './image/files';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    storedImage: {
      /** Leerer Bild-Block zum Hochladen oder Link-Einfügen. */
      insertImagePlaceholder: () => ReturnType;
    };
  }
}

const num = (name: string, fallback: number | null) => ({
  default: fallback,
  parseHTML: (el: HTMLElement) => {
    const v = parseFloat(el.getAttribute(`data-${name}`) ?? '');
    return Number.isFinite(v) ? v : fallback;
  },
  renderHTML: (a: Record<string, unknown>) => (a[name] === fallback || a[name] === null ? {} : { [`data-${name}`]: String(a[name]) }),
});

const choice = <T extends string>(name: string, fallback: T, allowed: readonly T[]) => ({
  default: fallback,
  parseHTML: (el: HTMLElement) => {
    const v = el.getAttribute(`data-${name}`) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  },
  renderHTML: (a: Record<string, unknown>) => (a[name] === fallback ? {} : { [`data-${name}`]: a[name] as string }),
});

/**
 * Bild-Node: lokal gespeicherte Bilder (`file:<id>`) und Bild-Links, frei skalierbar,
 * mit Textumbruch wie in Word (umfließen, vor/hinter dem Text) und nicht-destruktiver Bearbeitung.
 */
export const StoredImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Breite in Prozent der Textbreite; null = Originalgröße (höchstens seitenbreit).
      width: num('width', null),
      layout: choice<ImageLayout>('layout', 'inline', ['inline', 'left', 'right', 'front', 'behind']),
      align: choice<ImageAlign>('align', 'left', ['left', 'center', 'right']),
      frame: choice<ImageFrame>('frame', 'soft', ['soft', 'none', 'border', 'round', 'circle']),
      // Freie Position (vor/hinter dem Text): x in Prozent der Textbreite, y in Pixeln ab dem Anker.
      x: num('x', 0),
      y: num('y', 0),
      edit: jsonAttr<ImageEdit | null>('edit', null),
      // Ursprünglicher Dateiname beim Hochladen (für die Großansicht), sonst null.
      filename: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-filename'),
        renderHTML: (a: Record<string, unknown>) => (a.filename ? { 'data-filename': a.filename } : {}),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView, {
      stopEvent: ({ event }) => {
        const t = event.target as Element | null;
        if (!t?.closest) return false;
        // Eigene Bedienelemente und Eingabefelder behandeln ihre Ereignisse selbst.
        if (t.closest('.c-img-handle, .c-img-anchor, .c-img-ph, input, textarea, button')) return true;
        // Frei platzierte Bilder werden mit der Maus verschoben, nicht als Block gezogen.
        if (t.closest('.c-img.is-editable.is-front .c-img-figure, .c-img.is-editable.is-behind .c-img-figure')) return !event.type.startsWith('key');
        return false;
      },
    });
  },

  addCommands() {
    return {
      ...this.parent?.(),
      insertImagePlaceholder:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { src: '' } }),
    };
  },

  addProseMirrorPlugins() {
    const { editor, name } = this;
    /** Bilddateien ablegen und als Bild-Blöcke an `pos` (sonst an der Auswahl) einfügen. */
    const insertFiles = async (files: File[], pos?: number) => {
      const items = await Promise.all(files.map(storeImageFile));
      const content = items.map(({ src, filename }) => ({ type: name, attrs: { src, filename } }));
      const at = Math.min(pos ?? editor.state.selection.from, editor.state.doc.content.size);
      editor.chain().focus().insertContentAt(at, content).run();
    };
    return [
      new Plugin({
        key: new PluginKey('storedImagePaste'),
        props: {
          handlePaste(view, event) {
            const files = imageFiles(event.clipboardData);
            // Bilder aus Webseiten kommen oft zusätzlich als HTML – dann greift der normale Paste.
            if (files.length && !event.clipboardData?.getData('text/html')) {
              void insertFiles(files);
              return true;
            }
            const text = event.clipboardData?.getData('text/plain') ?? '';
            if (!view.state.selection.$from.parent.type.spec.code && looksLikeImageUrl(text)) {
              view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes[name].create({ src: text.trim() })));
              return true;
            }
            return false;
          },
          handleDrop(view, event, _slice, moved) {
            if (moved) return false;
            const files = imageFiles(event.dataTransfer);
            if (!files.length) return false;
            event.preventDefault();
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
            void insertFiles(files, pos);
            return true;
          },
        },
      }),
    ];
  },
});
