/**
 * Nicht-destruktive Bildbearbeitung: Das Original bleibt unverändert, Zuschnitt, Drehung
 * und Farben liegen als Parameter am Knoten und werden beim Anzeigen per CSS angewendet
 * (beim Export per Canvas). Nur „Hintergrund entfernen“ erzeugt eine neue Bilddatei –
 * das Original steht dann in `original`.
 */

/** Ausschnitt in Anteilen (0–1) des *ungedrehten* Originals. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Rotation = 0 | 90 | 180 | 270;

export interface ImageEdit {
  crop?: CropRect | null;
  rotate?: Rotation;
  flipH?: boolean;
  flipV?: boolean;
  /** Prozent, 100 = unverändert. */
  brightness?: number;
  contrast?: number;
  saturate?: number;
  /** Grad, −180…180. */
  hue?: number;
  /** Prozent, 0 = aus. */
  grayscale?: number;
  sepia?: number;
  invert?: number;
  /** Pixel. */
  blur?: number;
  /** Prozent, 100 = deckend. */
  opacity?: number;
  /** Im Dunkelmodus automatisch invertieren (Skizzen, Scans, Diagramme auf Weiß). */
  darkInvert?: boolean;
  /** Quelle vor „Hintergrund entfernen“, für „Original wiederherstellen“. */
  original?: string | null;
}

export type ImageLayout = 'inline' | 'left' | 'right' | 'front' | 'behind';
export type ImageAlign = 'left' | 'center' | 'right';
export type ImageFrame = 'soft' | 'none' | 'border' | 'round' | 'circle';

export const layoutLabels: Record<ImageLayout, string> = {
  inline: 'Mit Text in Zeile',
  left: 'Links – Text umfließt',
  right: 'Rechts – Text umfließt',
  front: 'Vor dem Text',
  behind: 'Hinter dem Text',
};

export const frameLabels: Record<ImageFrame, string> = {
  soft: 'Weich (Standard)',
  none: 'Ohne Rahmen',
  border: 'Linie',
  round: 'Stark gerundet',
  circle: 'Kreis / Oval',
};

export const NEUTRAL = { brightness: 100, contrast: 100, saturate: 100, hue: 0, grayscale: 0, sepia: 0, invert: 0, blur: 0, opacity: 100 } as const;
export type AdjustKey = keyof typeof NEUTRAL;

export const adjustments: { key: AdjustKey; label: string; min: number; max: number; unit: string }[] = [
  { key: 'brightness', label: 'Helligkeit', min: 0, max: 200, unit: '%' },
  { key: 'contrast', label: 'Kontrast', min: 0, max: 200, unit: '%' },
  { key: 'saturate', label: 'Sättigung', min: 0, max: 300, unit: '%' },
  { key: 'hue', label: 'Farbton', min: -180, max: 180, unit: '°' },
  { key: 'grayscale', label: 'Schwarz-Weiß', min: 0, max: 100, unit: '%' },
  { key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%' },
  { key: 'invert', label: 'Farben umkehren', min: 0, max: 100, unit: '%' },
  { key: 'blur', label: 'Weichzeichnen', min: 0, max: 20, unit: 'px' },
  { key: 'opacity', label: 'Deckkraft', min: 0, max: 100, unit: '%' },
];

/** Filter-Vorlagen: setzen alle Regler auf einmal. */
export const presets: { id: string; label: string; values: Partial<Record<AdjustKey, number>> }[] = [
  { id: 'original', label: 'Original', values: {} },
  { id: 'scan', label: 'Scan', values: { grayscale: 100, contrast: 170, brightness: 115 } },
  { id: 'bw', label: 'S/W', values: { grayscale: 100, contrast: 110 } },
  { id: 'invert', label: 'Invertiert', values: { invert: 100 } },
  { id: 'vivid', label: 'Kräftig', values: { saturate: 160, contrast: 115 } },
  { id: 'fade', label: 'Blass', values: { saturate: 60, contrast: 85, brightness: 110 } },
  { id: 'sepia', label: 'Sepia', values: { sepia: 80, contrast: 95 } },
  { id: 'warm', label: 'Warm', values: { sepia: 25, saturate: 125, hue: -8 } },
  { id: 'cool', label: 'Kühl', values: { hue: 12, saturate: 90, brightness: 104 } },
  { id: 'noir', label: 'Noir', values: { grayscale: 100, contrast: 150, brightness: 90 } },
];

export const val = (edit: ImageEdit | null | undefined, key: AdjustKey): number => edit?.[key] ?? NEUTRAL[key];

export const fullCrop: CropRect = { x: 0, y: 0, w: 1, h: 1 };

export function isFullCrop(c: CropRect | null | undefined): boolean {
  return !c || (c.x <= 0.0005 && c.y <= 0.0005 && c.w >= 0.9995 && c.h >= 0.9995);
}

/** CSS-Filterkette in fester Reihenfolge (der Export rechnet dieselbe Reihenfolge nach). */
export function cssFilter(edit: ImageEdit | null | undefined, dark = false): string {
  const parts: string[] = [];
  const v = (k: AdjustKey) => val(edit, k);
  if (v('brightness') !== 100) parts.push(`brightness(${v('brightness')}%)`);
  if (v('contrast') !== 100) parts.push(`contrast(${v('contrast')}%)`);
  if (v('saturate') !== 100) parts.push(`saturate(${v('saturate')}%)`);
  if (v('hue') !== 0) parts.push(`hue-rotate(${v('hue')}deg)`);
  if (v('grayscale')) parts.push(`grayscale(${v('grayscale')}%)`);
  if (v('sepia')) parts.push(`sepia(${v('sepia')}%)`);
  if (v('invert')) parts.push(`invert(${v('invert')}%)`);
  if (v('blur')) parts.push(`blur(${v('blur')}px)`);
  if (v('opacity') !== 100) parts.push(`opacity(${v('opacity')}%)`);
  if (dark && edit?.darkInvert) parts.push('invert(92%) hue-rotate(180deg)');
  return parts.join(' ');
}

/** Hat die Bearbeitung sichtbare Auswirkungen (außer dem Dunkelmodus)? */
export function hasVisualEdit(edit: ImageEdit | null | undefined): boolean {
  if (!edit) return false;
  return !isFullCrop(edit.crop) || !!edit.rotate || !!edit.flipH || !!edit.flipV || cssFilter(edit) !== '';
}

/** Nur die Teile, die das Aussehen bestimmen – als stabiler Schlüssel für Export-Assets. */
export function imageKey(src: string, edit: ImageEdit | null | undefined): string {
  if (!hasVisualEdit(edit)) return src;
  const { crop, rotate, flipH, flipV } = edit!;
  return `${src}#${JSON.stringify({ crop: isFullCrop(crop) ? null : crop, rotate, flipH, flipV, f: cssFilter(edit) })}`;
}

/** Entfernt neutrale Werte, damit das gespeicherte JSON klein bleibt. */
export function cleanEdit(edit: ImageEdit): ImageEdit | null {
  const out: ImageEdit = {};
  if (!isFullCrop(edit.crop)) out.crop = edit.crop;
  if (edit.rotate) out.rotate = edit.rotate;
  if (edit.flipH) out.flipH = true;
  if (edit.flipV) out.flipV = true;
  for (const k of Object.keys(NEUTRAL) as AdjustKey[]) {
    const v = edit[k];
    if (v !== undefined && v !== NEUTRAL[k]) out[k] = v;
  }
  if (edit.darkInvert) out.darkInvert = true;
  if (edit.original) out.original = edit.original;
  return Object.keys(out).length ? out : null;
}

// ---------- Geometrie: Original ↔ Ansicht (gespiegelt, dann gedreht) ----------

type Pt = [number, number];

/** Punkt im Einheitsquadrat des Originals → Ansicht (erst spiegeln, dann im Uhrzeigersinn drehen). */
export function toView([u, v]: Pt, edit: ImageEdit): Pt {
  if (edit.flipH) u = 1 - u;
  if (edit.flipV) v = 1 - v;
  for (let k = 0; k < (edit.rotate ?? 0) / 90; k++) [u, v] = [1 - v, u];
  return [u, v];
}

export function toSource([u, v]: Pt, edit: ImageEdit): Pt {
  for (let k = 0; k < (edit.rotate ?? 0) / 90; k++) [u, v] = [v, 1 - u];
  if (edit.flipH) u = 1 - u;
  if (edit.flipV) v = 1 - v;
  return [u, v];
}

function mapRect(r: CropRect, fn: (p: Pt) => Pt): CropRect {
  const [a, b] = [fn([r.x, r.y]), fn([r.x + r.w, r.y + r.h])];
  const x = Math.min(a[0], b[0]);
  const y = Math.min(a[1], b[1]);
  return { x, y, w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) };
}

export const cropToView = (r: CropRect, edit: ImageEdit) => mapRect(r, (p) => toView(p, edit));
export const cropToSource = (r: CropRect, edit: ImageEdit) => mapRect(r, (p) => toSource(p, edit));

export const isQuarter = (edit: ImageEdit | null | undefined) => (edit?.rotate ?? 0) % 180 === 90;

/** Größe des fertigen (zugeschnittenen, gedrehten) Bildes in Pixeln. */
export function outputSize(natural: { w: number; h: number }, edit: ImageEdit | null | undefined): { w: number; h: number } {
  const c = edit?.crop && !isFullCrop(edit.crop) ? edit.crop : fullCrop;
  const w = natural.w * c.w;
  const h = natural.h * c.h;
  return isQuarter(edit) ? { w: h, h: w } : { w, h };
}

/** Bildquelle als Link (nicht lokal gespeichert)? */
export const isRemote = (src: string) => /^https?:\/\//i.test(src);

/** Sieht der Text wie ein direkter Bild-Link aus? */
export function looksLikeImageUrl(text: string): boolean {
  const t = text.trim();
  if (!/^https?:\/\/\S+$/i.test(t)) return false;
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?\S*)?(#\S*)?$/i.test(t) || /^data:image\//i.test(t);
}
