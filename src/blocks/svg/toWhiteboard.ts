import type { Editor } from '@tiptap/core';
import type { BinaryFileData, DataURL } from '@excalidraw/excalidraw/types';
import type { FileId } from '@excalidraw/excalidraw/element/types';
import { openNextWhiteboard, type WhiteboardScene } from '../whiteboard/WhiteboardNode';
import { sizeOf } from './model';
import { CONFIRMED } from '@/editor/ConfirmDelete';

/** Größte Kantenlänge des eingefügten Bilds auf der Zeichenfläche – größere SVGs werden verkleinert. */
const MAX_SIZE = 800;

/** SVG-Text als Data-URL für Excalidraw (Base64, damit Sonderzeichen sicher durchkommen). */
function svgToDataUrl(svg: string): DataURL {
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}` as DataURL;
}

/**
 * „Bearbeiten“ eines SVG-Blocks: Er wird durch ein Whiteboard ersetzt, das das SVG – so wie es gerade
 * aussieht, also mit Farben/Linien/Drehung aus dem Stil-Menü – als Bild enthält. Excalidraw kann die
 * Pfade eines SVGs nicht selbst bearbeiten; gezeichnet wird darüber und daneben. Das Whiteboard öffnet sich sofort.
 */
export async function convertSvgToWhiteboard(editor: Editor, getPos: () => number | undefined, svg: string) {
  // Excalidraw nur laden, wenn wirklich umgewandelt wird – das Whiteboard braucht es gleich ohnehin.
  const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
  const pos = getPos();
  if (typeof pos !== 'number') return;
  const node = editor.state.doc.nodeAt(pos);
  const type = editor.schema.nodes.whiteboard;
  if (!node || !type) return;

  let scene: WhiteboardScene = { elements: [], files: {} };
  if (svg) {
    const natural = sizeOf(svg);
    const scale = Math.min(1, MAX_SIZE / Math.max(natural.width, natural.height, 1));
    const fileId = crypto.randomUUID() as FileId;
    const file: BinaryFileData = { id: fileId, mimeType: 'image/svg+xml', dataURL: svgToDataUrl(svg), created: Date.now() };
    const elements = convertToExcalidrawElements([
      { type: 'image', x: 0, y: 0, width: natural.width * scale, height: natural.height * scale, fileId, status: 'saved' },
    ]);
    scene = { elements, files: { [fileId]: file } };
  }

  openNextWhiteboard();
  // Vorschau sofort mit dem bisherigen Bild; Excalidraw erzeugt beim Schließen eine neue.
  // Kein Löschen im Sinne der Lösch-Rückfrage: Der Inhalt lebt im Whiteboard weiter.
  const tr = editor.state.tr.replaceWith(pos, pos + node.nodeSize, type.create({ scene, svg })).setMeta(CONFIRMED, true);
  editor.view.dispatch(tr);
}
