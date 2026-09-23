import { resolveSrc } from '@/editor/StoredImage';
import { renderMermaid } from '@/blocks/mermaid/MermaidView';
import type { CellValue, CollectionData, Field } from '@/blocks/collection/model';

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
  images: Map<string, ImageAsset>;
  /** Mermaid-Code → gerendertes SVG. */
  mermaid: Map<string, string>;
}

export { calloutLabels } from '@/editor/CalloutNode';

export const untitled = (title: string) => title.trim() || 'Ohne Titel';

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

/** Lädt Bilder (lokal → Data-URL) und rendert Mermaid-Diagramme vorab, damit die Exporter synchron bleiben. */
export async function collectAssets(doc: PMNode, opts: { png?: boolean; mermaid?: boolean } = {}): Promise<Assets> {
  const images = new Set<string>();
  const mermaid = new Set<string>();
  walk(doc, (n) => {
    if (n.type === 'image' && n.attrs?.src) images.add(n.attrs.src);
    if (n.type === 'mermaid' && n.attrs?.code?.trim()) mermaid.add(n.attrs.code);
  });

  const assets: Assets = { images: new Map(), mermaid: new Map() };
  await Promise.all([
    ...[...images].map(async (src) => {
      try {
        let url = src;
        if (src.startsWith('file:')) {
          const blobUrl = await resolveSrc(src);
          if (!blobUrl) return;
          url = await blobToDataUrl(await (await fetch(blobUrl)).blob());
        }
        const img = await loadImage(url);
        assets.images.set(src, {
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          png: opts.png ? await toPng(img) : undefined,
        });
      } catch {
        if (!src.startsWith('file:')) assets.images.set(src, { url: src, width: 0, height: 0 });
      }
    }),
    ...(opts.mermaid ? [...mermaid] : []).map(async (code) => {
      const res = await renderMermaid(code, false);
      if ('svg' in res) assets.mermaid.set(code, res.svg);
    }),
  ]);
  return assets;
}

/** Zellwert einer Sammlung als Text. */
export function formatCell(field: Field, value: CellValue | undefined): string {
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
    default:
      return String(value);
  }
}

/** Alle Blätter einer Sammlung als Text-Tabellen (Kopfzeile + Zeilen). */
export function collectionTables(data: CollectionData | undefined): { name: string; rows: string[][] }[] {
  if (!data?.sheets) return [];
  return data.sheets.map((s) => ({
    name: data.sheets.length > 1 ? `${data.title ? `${data.title} – ` : ''}${s.name}` : data.title || s.name,
    rows: [s.fields.map((f) => f.name), ...s.rows.map((r) => s.fields.map((f) => formatCell(f, r.cells[f.id])))],
  }));
}

/** Tiptap-Tabelle als Zeilen von Zellen-Knoten. */
export function tableRows(table: PMNode): PMNode[][] {
  return (table.content ?? []).map((row) => row.content ?? []);
}

export function safeFilename(title: string): string {
  return untitled(title).replace(/[\\/:*?"<>|\n\r]+/g, '-').slice(0, 120);
}
