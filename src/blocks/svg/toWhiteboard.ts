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
 * Excalidraw-Szene mit dem SVG als Bild darin. Excalidraw kann die Pfade eines SVGs nicht selbst
 * bearbeiten – gezeichnet wird darüber und daneben. Leeres SVG → leere Zeichenfläche.
 */
async function sceneFromSvg(svg: string): Promise<WhiteboardScene> {
  if (!svg) return { elements: [], files: {} };
  // Excalidraw nur laden, wenn wirklich gezeichnet wird.
  const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
  const natural = sizeOf(svg);
  const scale = Math.min(1, MAX_SIZE / Math.max(natural.width, natural.height, 1));
  const fileId = crypto.randomUUID() as FileId;
  const file: BinaryFileData = { id: fileId, mimeType: 'image/svg+xml', dataURL: svgToDataUrl(svg), created: Date.now() };
  const elements = convertToExcalidrawElements([
    { type: 'image', x: 0, y: 0, width: natural.width * scale, height: natural.height * scale, fileId, status: 'saved' },
  ]);
  return { elements, files: { [fileId]: file } };
}

/**
 * „Umwandeln in → Whiteboard“: Der SVG-Block wird durch einen Whiteboard-Block ersetzt, in dem das SVG
 * (so, wie es gerade aussieht, also mit dem Stil aus dem Stil-Menü) als Bild liegt. Das Whiteboard öffnet sich sofort.
 */
export async function convertSvgToWhiteboard(editor: Editor, getPos: () => number | undefined, rendered: string) {
  const type = editor.schema.nodes.whiteboard;
  if (!type) return;
  const scene = await sceneFromSvg(rendered);

  // Zwischendurch könnte sich das Dokument geändert haben – Position frisch holen.
  const at = getPos();
  const current = typeof at === 'number' ? editor.state.doc.nodeAt(at) : null;
  if (typeof at !== 'number' || current?.type.name !== 'svg') return;
  openNextWhiteboard();
  // Kein Löschen im Sinne der Lösch-Rückfrage: Der Inhalt lebt im Whiteboard weiter.
  const tr = editor.state.tr.replaceWith(at, at + current.nodeSize, type.create({ scene, svg: rendered })).setMeta(CONFIRMED, true);
  editor.view.dispatch(tr);
}
