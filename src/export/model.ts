import { resolveSrc } from '@/editor/image/files';
import { hasVisualEdit, imageKey, type ImageEdit } from '@/editor/image/model';
import { renderEdited } from '@/editor/image/pixels';
import { renderMermaid } from '@/blocks/mermaid/MermaidView';
import { loadKatex, mathToMathml } from '@/editor/math/katex';
import { isComputedType, type CellValue, type CollectionData, type Field } from '@/blocks/collection/model';
import { displayText } from '@/blocks/collection/compute';
import type { TermLike } from '@/glossary/match';

/** Tiptap-JSON, so wie es in `Note.content` steht. */
export interface PMMark {
  type: string;
  attrs?: Record<string, any>;
}
export interface PMNode {
  type: string;
  attrs?: Record<string, any>;
  content?: PMNode[];
  text?: string;
  marks?: PMMark[];
}

/** Alles, was ein Exporter über die Notiz wissen muss. */
export interface ExportDoc {
  title: string;
  tags: string[];
  doc: PMNode;
  assets: Assets;
}

export interface ImageAsset {
  /** Eigenständige URL: Data-URL für lokal gespeicherte Bilder, sonst die Original-URL. */
  url: string;
  width: number;
  height: number;
  /** PNG-Bytes für RTF; fehlt, wenn das Bild nicht gelesen werden konnte (z. B. fremde Domain). */
  png?: Uint8Array;
}

export interface Assets {
  /** Schlüssel: `imageKey(src, edit)` – bearbeitete Bilder liegen fertig gerendert vor. */
  images: Map<string, ImageAsset>;
  /** Mermaid-Code → gerendertes SVG. */
  mermaid: Map<string, string>;
  /** `${display}:${latex}` → gerendertes MathML (Formeln). */
  math: Map<string, string>;
  /** Glossar für das Abkürzungsverzeichnis: alle Begriffe und die in der Notiz vorkommenden. */
  glossary?: { all: TermLike[]; used: TermLike[] };
}

export { calloutLabels } from '@/editor/CalloutNode';

/** Bild-Asset zu Quelle + Bearbeitung; ohne gerenderte Fassung das unbearbeitete Original. */
export function imageAsset(assets: Assets, src: string, edit?: ImageEdit | null): ImageAsset | undefined {
  return assets.images.get(imageKey(src, edit)) ?? assets.images.get(src);
}

/** Alle Bilder eines Knotens (Bild-Block oder Galerie) mit ihrer Bearbeitung. */
export function nodeImages(n: PMNode): { src: string; edit: ImageEdit | null }[] {
  if (n.type === 'image' && n.attrs?.src) return [{ src: n.attrs.src, edit: n.attrs.edit ?? null }];
  if (n.type === 'gallery') return ((n.attrs?.items ?? []) as { src: string; edit?: ImageEdit | null }[]).filter((i) => i.src).map((i) => ({ src: i.src, edit: i.edit ?? null }));
  return [];
}

export const untitled = (title: string) => title.trim() || 'Ohne Titel';

/** Notiz-Block (Zeile/Karte) für Exporte: ein Absatz mit Markdown-Link `[Titel](/n/<id>)`. */
export function noteBlockAsParagraph(n: PMNode): PMNode {
  const a = n.attrs ?? {};
  return { type: 'paragraph', content: [{ type: 'text', text: untitled(String(a.title ?? '')), marks: [{ type: 'link', attrs: { href: `/n/${a.id}` } }] }] };
}

/** Smart-Link-Block (Karte/Bild/Video/Audio) für Exporte: ein Absatz mit dem externen Link. */
export function smartLinkAsParagraph(n: PMNode): PMNode {
  const a = n.attrs ?? {};
  const href = String(a.href ?? '');
  return { type: 'paragraph', content: [{ type: 'text', text: String(a.title ?? '') || href, marks: [{ type: 'link', attrs: { href } }] }] };
}

export function walk(node: PMNode, fn: (n: PMNode) => void) {
  fn(node);
  node.content?.forEach((c) => walk(c, fn));
}

/** Reiner Text eines Knotens (für Tabellenzellen, Zusammenfassungen …). */
export function textOf(node: PMNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(textOf).join(node.type === 'tableCell' || node.type === 'tableHeader' ? '\n' : '');
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function toPng(img: HTMLImageElement): Promise<Uint8Array | undefined> {
  const scale = Math.min(1, 1600 / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
  try {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined;
  } catch {
    return undefined; // Canvas durch fremdes Bild „tainted“
  }
}

/** Lädt Bilder (lokal → Data-URL) und rendert Mermaid-Diagramme/Formeln vorab, damit die Exporter synchron bleiben. */
export async function collectAssets(doc: PMNode, opts: { png?: boolean; mermaid?: boolean; math?: boolean } = {}): Promise<Assets> {
  const images = new Map<string, { src: string; edit: ImageEdit | null }>();
  const mermaid = new Set<string>();
  const math = new Map<string, { latex: string; display: boolean }>();
  walk(doc, (n) => {
    for (const img of nodeImages(n)) images.set(imageKey(img.src, img.edit), img);
    if (n.type === 'mermaid' && n.attrs?.code?.trim()) mermaid.add(n.attrs.code);
    if ((n.type === 'mathInline' || n.type === 'mathBlock') && n.attrs?.latex?.trim()) {
      const display = n.type === 'mathBlock';
      math.set(`${display}:${n.attrs.latex}`, { latex: n.attrs.latex, display });
    }
  });

  const assets: Assets = { images: new Map(), mermaid: new Map(), math: new Map() };
  await Promise.all([
    ...[...images].map(async ([key, { src, edit }]) => {
      try {
        let url = src;
        if (src.startsWith('file:')) {
          const blobUrl = await resolveSrc(src);
          if (!blobUrl) return;
          url = await blobToDataUrl(await (await fetch(blobUrl)).blob());
        }
        const img = await loadImage(url);
        if (hasVisualEdit(edit)) {
          // Zuschnitt, Drehung und Farben fest ins Bild rechnen – Exporte kennen kein CSS dafür.
          try {
            const canvas = renderEdited(img, edit!);
            const edited = await loadImage(canvas.toDataURL('image/png'));
            assets.images.set(key, { url: edited.src, width: edited.naturalWidth, height: edited.naturalHeight, png: opts.png ? await toPng(edited) : undefined });
            return;
          } catch {
            // Fremdes Bild ohne Pixelzugriff: unbearbeitet exportieren.
          }
        }
        assets.images.set(key, {
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          png: opts.png ? await toPng(img) : undefined,
        });
      } catch {
        if (!src.startsWith('file:')) assets.images.set(key, { url: src, width: 0, height: 0 });
      }
    }),
    ...(opts.mermaid ? [...mermaid] : []).map(async (code) => {
      const res = await renderMermaid(code, false);
      if ('svg' in res) assets.mermaid.set(code, res.svg);
    }),
    opts.math && math.size
      ? loadKatex().then(() => {
          for (const [key, { latex, display }] of math) {
            const mathml = mathToMathml(latex, display);
            if (mathml) assets.math.set(key, mathml);
          }
        })
      : Promise.resolve(),
  ]);
  return assets;
}

/** Alle Sammlungen in der Notiz (für Verknüpfungsfelder – deren Zielblatt kann in einer anderen Sammlung liegen). */
export function collectCollections(doc: PMNode, out: CollectionData[] = []): CollectionData[] {
  if (doc.type === 'collection' && doc.attrs?.data) out.push(doc.attrs.data as CollectionData);
  for (const child of doc.content ?? []) collectCollections(child, out);
  return out;
}

/** Titel (erstes Feld) einer Zeile in einem bestimmten Blatt – für Verknüpfungsfelder. */
function relationRowTitle(all: CollectionData[], collectionId: string, sheetId: string, rowId: string): string {
  const sheet = all.find((c) => c.id === collectionId)?.sheets.find((s) => s.id === sheetId);
  const row = sheet?.rows.find((r) => r.id === rowId);
  const titleField = sheet?.fields[0];
  if (!row || !titleField) return '';
  return formatCell(titleField, row.cells[titleField.id], all) || '(ohne Titel)';
}

/** Zellwert einer Sammlung als Text. `all`: alle Sammlungen der Notiz, zum Auflösen von Verknüpfungsfeldern. */
export function formatCell(field: Field, value: CellValue | undefined, all: CollectionData[] = []): string {
  if (value === null || value === undefined || value === '') return '';
  switch (field.type) {
    case 'checkbox':
      return value ? '☑' : '☐';
    case 'date': {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('de-DE');
    }
    case 'select':
      return field.options?.find((o) => o.id === value)?.label ?? '';
    case 'multiselect':
      return (Array.isArray(value) ? value : [])
        .map((id) => field.options?.find((o) => o.id === id)?.label)
        .filter(Boolean)
        .join(', ');
    case 'relation': {
      if (!field.relation) return '';
      const ids = Array.isArray(value) ? value : [value as string];
      return ids.map((id) => relationRowTitle(all, field.relation!.collectionId, field.relation!.sheetId, id)).filter(Boolean).join(', ');
    }
    default:
      return String(value);
  }
}

/** Alle Blätter einer Sammlung als Text-Tabellen (Kopfzeile + Zeilen). `all`: alle Sammlungen der Notiz, für Verknüpfungsfelder. */
export function collectionTables(data: CollectionData | undefined, all: CollectionData[] = data ? [data] : []): { name: string; rows: string[][] }[] {
  if (!data?.sheets) return [];
  return data.sheets.map((s) => ({
    name: data.sheets.length > 1 ? `${data.title ? `${data.title} – ` : ''}${s.name}` : data.title || s.name,
    rows: [s.fields.map((f) => f.name), ...s.rows.map((r) => s.fields.map((f) => (isComputedType(f.type) ? displayText(f, r, s, all) : formatCell(f, r.cells[f.id], all))))],
  }));
}

/** Tiptap-Tabelle als Zeilen von Zellen-Knoten. */
/** Beschriftungen einer Whiteboard-Zeichnung, von oben nach unten gelesen. */
export function whiteboardTexts(scene: { elements?: { type: string; text?: string; x: number; y: number; isDeleted?: boolean }[] } | undefined): string[] {
  return (scene?.elements ?? [])
    .filter((e) => e.type === 'text' && !e.isDeleted && e.text?.trim())
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((e) => e.text!.replace(/\s+/g, ' ').trim());
}

export function tableRows(table: PMNode): PMNode[][] {
  return (table.content ?? []).map((row) => row.content ?? []);
}

export function safeFilename(title: string): string {
  return untitled(title).replace(/[\\/:*?"<>|\n\r]+/g, '-').slice(0, 120);
}
