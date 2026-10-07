import type { Editor } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { newItemId, type GalleryItem } from '@/blocks/gallery/GalleryNode';
import type { ImageEdit } from '@/editor/image/model';
import { applyStyle, contentStyleOf, svgDataUrl } from '@/blocks/svg/model';
import { CONFIRMED } from './ConfirmDelete';
import { outermost } from './blockUnits';

/** Bild- und SVG-Blöcke, aus denen sich eine Galerie bauen lässt. */
const SOURCE_TYPES = new Set(['image', 'svg']);

function toGalleryItem(node: PMNode): GalleryItem | null {
  if (node.type.name === 'image') {
    const src = node.attrs.src as string;
    if (!src) return null;
    return {
      id: newItemId(),
      src,
      caption: (node.attrs.title as string | null) ?? '',
      alt: (node.attrs.alt as string | null) || undefined,
      edit: node.attrs.edit ?? null,
      filename: (node.attrs.filename as string | null) ?? null,
    };
  }
  if (node.type.name === 'svg') {
    const source = node.attrs.svg as string;
    if (!source) return null;
    const rendered = applyStyle(source, contentStyleOf(node.attrs));
    // Dunkelmodus-Invertierung und Deckkraft haben in der Bildbearbeitung eine Entsprechung –
    // Hintergrund/Rahmen/Innenabstand (reine SVG-Block-Präsentation) gehen beim Umwandeln verloren.
    const edit: ImageEdit = {};
    if (node.attrs.dark === 'invert') edit.darkInvert = true;
    if (typeof node.attrs.opacity === 'number' && node.attrs.opacity !== 1) edit.opacity = Math.round(node.attrs.opacity * 100);
    return {
      id: newItemId(),
      src: svgDataUrl(rendered),
      caption: (node.attrs.caption as string | null) ?? '',
      alt: (node.attrs.alt as string | null) || undefined,
      edit: Object.keys(edit).length ? edit : null,
    };
  }
  return null;
}

/**
 * Fasst alle markierten Bild-/SVG-Blöcke (oder – ohne Markierung – nur den einen an `positions`)
 * zu einer neuen Galerie zusammen, an der Stelle des ersten Blocks. Ist nur ein Block markiert,
 * wird die Galerie um ihn herum gebaut, egal ob Bild oder SVG.
 */
export function convertToGallery(editor: Editor, positions: number[]): boolean {
  const { doc } = editor.state;
  const units = outermost(doc, positions)
    .filter((u) => SOURCE_TYPES.has(u.node.type.name))
    .sort((a, b) => a.pos - b.pos);
  if (!units.length) return false;

  const items = units.map((u) => toGalleryItem(u.node)).filter((i): i is GalleryItem => !!i);
  if (!items.length) return false;

  const tr = editor.state.tr;
  // Von hinten nach vorne löschen, der erste Block wird durch die neue Galerie ersetzt.
  for (let i = units.length - 1; i > 0; i--) {
    const u = units[i];
    tr.deleteRange(u.pos, u.pos + u.node.nodeSize);
  }
  const first = units[0];
  tr.replaceWith(first.pos, first.pos + first.node.nodeSize, editor.schema.nodes.gallery.create({ items }));
  tr.setMeta(CONFIRMED, true);
  editor.view.dispatch(tr);
  return true;
}

/**
 * Führt mehrere markierte Galerien zu einer zusammen: Bilder aller Galerien landen in der
 * ersten, in Dokument-Reihenfolge; deren Einstellungen (Ansicht, Spalten …) bleiben erhalten.
 */
export function mergeGalleries(editor: Editor, positions: number[]): boolean {
  const { doc } = editor.state;
  const units = outermost(doc, positions)
    .filter((u) => u.node.type.name === 'gallery')
    .sort((a, b) => a.pos - b.pos);
  if (units.length < 2) return false;

  const items = units.flatMap((u) => u.node.attrs.items as GalleryItem[]);
  const first = units[0];

  const tr = editor.state.tr;
  for (let i = units.length - 1; i > 0; i--) {
    const u = units[i];
    tr.deleteRange(u.pos, u.pos + u.node.nodeSize);
  }
  tr.setNodeMarkup(first.pos, undefined, { ...first.node.attrs, items });
  tr.setMeta(CONFIRMED, true);
  editor.view.dispatch(tr);
  return true;
}
