import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { jsonAttr } from '../jsonAttr';
import { GalleryView } from './GalleryView';
import type { ImageEdit } from '@/editor/image/model';

export type GalleryLayout = 'grid' | 'masonry' | 'carousel' | 'strip' | 'compare';

export interface GalleryItem {
  id: string;
  src: string;
  caption: string;
  alt?: string;
  edit?: ImageEdit | null;
}

export const galleryLayouts: GalleryLayout[] = ['grid', 'masonry', 'carousel', 'strip', 'compare'];

export const newItemId = () => Math.random().toString(36).slice(2, 10);

/** Bildersammlung mit mehreren Ansichten: Raster, Mosaik, Karussell, Filmstreifen, Vorher/Nachher. */
export const GalleryNode = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      title: { default: '', parseHTML: (el) => el.getAttribute('data-title') ?? '', renderHTML: (a) => ({ 'data-title': a.title }) },
      layout: {
        default: 'grid' as GalleryLayout,
        parseHTML: (el) => {
          const v = el.getAttribute('data-layout') as GalleryLayout;
          return galleryLayouts.includes(v) ? v : 'grid';
        },
        renderHTML: (a) => ({ 'data-layout': a.layout }),
      },
      columns: {
        default: 3,
        parseHTML: (el) => Math.min(6, Math.max(1, Number(el.getAttribute('data-columns')) || 3)),
        renderHTML: (a) => ({ 'data-columns': String(a.columns) }),
      },
      /** Kacheln im Raster: zuschneiden (gleich groß) oder ganz zeigen. */
      fit: {
        default: 'cover' as 'cover' | 'contain',
        parseHTML: (el) => (el.getAttribute('data-fit') === 'contain' ? 'contain' : 'cover'),
        renderHTML: (a) => ({ 'data-fit': a.fit }),
      },
      captions: {
        default: true,
        parseHTML: (el) => el.getAttribute('data-captions') !== 'false',
        renderHTML: (a) => ({ 'data-captions': String(a.captions) }),
      },
      items: jsonAttr<GalleryItem[]>('items', []),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-gallery]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-gallery': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryView, {
      // Ziehen/Ablegen innerhalb der Galerie (Sortieren, Dateien) und der Vergleichs-Regler gehören der Galerie.
      stopEvent: ({ event }) => {
        const t = event.target as Element | null;
        if (!t?.closest) return false;
        if (t.closest('input, textarea, button, .g-compare')) return true;
        return event.type.startsWith('drag') || event.type === 'drop' ? !!t.closest('.g-body') : false;
      },
    });
  },
});
