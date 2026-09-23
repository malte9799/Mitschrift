/** Pixel-Arbeit auf dem Canvas: Export mit Bearbeitung und Hintergrund entfernen. */
import { resolveSrc } from './files';
import { fullCrop, isFullCrop, outputSize, val, type ImageEdit } from './model';

/** Lädt ein Bild so, dass seine Pixel lesbar sind (lokal immer, fremde Seiten nur mit CORS). */
export async function loadPixels(src: string): Promise<HTMLImageElement> {
  const url = await resolveSrc(src);
  if (!url) throw new Error('Bild nicht gefunden');
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  return img;
}

export class ForeignImageError extends Error {
  constructor() {
    super('Diese Seite erlaubt keinen Zugriff auf die Bildpunkte. Lade das Bild herunter und füge es als Datei ein, um es so zu bearbeiten.');
  }
}

/** Liest die Pixel; wirft ForeignImageError, wenn der Canvas durch ein fremdes Bild gesperrt ist. */
export function readPixels(canvas: HTMLCanvasElement): ImageData {
  try {
    return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    throw new ForeignImageError();
  }
}

// ---------- Farbfilter wie CSS (Filter Effects Spec), für den Export ----------

type Mat = number[]; // 3×3, zeilenweise

function applyMat(d: Uint8ClampedArray, m: Mat) {
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i] = m[0] * r + m[1] * g + m[2] * b;
    d[i + 1] = m[3] * r + m[4] * g + m[5] * b;
    d[i + 2] = m[6] * r + m[7] * g + m[8] * b;
  }
}

function applyLinear(d: Uint8ClampedArray, slope: number, intercept: number) {
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] * slope + intercept;
    d[i + 1] = d[i + 1] * slope + intercept;
    d[i + 2] = d[i + 2] * slope + intercept;
  }
}

const grayMat = (a: number): Mat => {
  const s = 1 - a;
  return [0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s, 0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s, 0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s];
};
const sepiaMat = (a: number): Mat => {
  const s = 1 - a;
  return [0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s, 0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s, 0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s];
};
const saturateMat = (s: number): Mat => [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
const hueMat = (deg: number): Mat => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
};

/** Wendet die Farbregler in derselben Reihenfolge wie `cssFilter` an (ohne Weichzeichnen). */
export function applyColorFilters(data: ImageData, edit: ImageEdit) {
  const d = data.data;
  const v = (k: Parameters<typeof val>[1]) => val(edit, k);
  if (v('brightness') !== 100) applyLinear(d, v('brightness') / 100, 0);
  if (v('contrast') !== 100) {
    const c = v('contrast') / 100;
    applyLinear(d, c, 127.5 * (1 - c));
  }
  if (v('saturate') !== 100) applyMat(d, saturateMat(v('saturate') / 100));
  if (v('hue')) applyMat(d, hueMat(v('hue')));
  if (v('grayscale')) applyMat(d, grayMat(v('grayscale') / 100));
  if (v('sepia')) applyMat(d, sepiaMat(v('sepia') / 100));
  if (v('invert')) {
    const a = v('invert') / 100;
    applyLinear(d, 1 - 2 * a, 255 * a);
  }
  if (v('opacity') !== 100) {
    const o = v('opacity') / 100;
    for (let i = 3; i < d.length; i += 4) d[i] *= o;
  }
}

/**
 * Zeichnet das Bild mit Zuschnitt, Drehung, Spiegelung und Farben auf einen Canvas.
 * `maxSide` begrenzt die Größe (Export soll nicht riesig werden).
 */
export function renderEdited(img: HTMLImageElement, edit: ImageEdit, maxSide = 2400): HTMLCanvasElement {
  const nat = { w: img.naturalWidth, h: img.naturalHeight };
  const c = edit.crop && !isFullCrop(edit.crop) ? edit.crop : fullCrop;
  const out = outputSize(nat, edit);
  const scale = Math.min(1, maxSide / Math.max(out.w, out.h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(out.w * scale));
  canvas.height = Math.max(1, Math.round(out.h * scale));
  const ctx = canvas.getContext('2d')!;
  const blur = val(edit, 'blur');
  if (blur && 'filter' in ctx) ctx.filter = `blur(${blur * scale}px)`;
  // Ursprung in die Mitte, drehen, spiegeln – dann den Ausschnitt zentriert zeichnen.
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(((edit.rotate ?? 0) * Math.PI) / 180);
  ctx.scale(edit.flipH ? -1 : 1, edit.flipV ? -1 : 1);
  const dw = nat.w * c.w * scale;
  const dh = nat.h * c.h * scale;
  ctx.drawImage(img, nat.w * c.x, nat.h * c.y, nat.w * c.w, nat.h * c.h, -dw / 2, -dh / 2, dw, dh);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';
  const data = readPixels(canvas);
  applyColorFilters(data, edit);
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new ForeignImageError())), type));
}

// ---------- Hintergrund entfernen ----------

export type BgMode = 'edges' | 'color';

export interface BgOptions {
  mode: BgMode;
  /** Farbabstand 0–100, bis zu dem ein Pixel als Hintergrund gilt. */
  tolerance: number;
  /** Weicher Übergang 0–100 (zusätzlicher Abstand mit halbtransparenten Pixeln). */
  softness: number;
  /** Nur mit dem Rand bzw. dem angeklickten Punkt verbundene Flächen entfernen. */
  contiguous: boolean;
  /** Angeklickter Punkt (Anteile 0–1 im Original) für den Modus „Farbe“. */
  point?: { x: number; y: number } | null;
}

const MAX_WORK = 3000;

/** Canvas mit dem Original (höchstens MAX_WORK Pixel lang). */
export function sourceCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const scale = Math.min(1, MAX_WORK / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Häufigste Randfarbe (grob gerastert) – meist der Hintergrund. */
function dominantEdgeColor(d: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
  const add = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 128) return;
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const e = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += d[i];
    e.g += d[i + 1];
    e.b += d[i + 2];
    counts.set(key, e);
  };
  for (let x = 0; x < w; x++) {
    add(x, 0);
    add(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    add(0, y);
    add(w - 1, y);
  }
  let best = { n: 0, r: 255, g: 255, b: 255 };
  for (const e of counts.values()) if (e.n > best.n) best = e;
  return best.n ? [best.r / best.n, best.g / best.n, best.b / best.n] : [255, 255, 255];
}

/**
 * Macht den Hintergrund transparent. Arbeitet auf `data` (Original-Pixel) und gibt eine Kopie zurück.
 * Abstand ist der euklidische RGB-Abstand, auf 0–100 normiert.
 */
export function removeBackground(data: ImageData, opts: BgOptions): ImageData {
  const { width: w, height: h } = data;
  const src = data.data;
  const out = new ImageData(new Uint8ClampedArray(src), w, h);
  const d = out.data;

  let ref: [number, number, number];
  if (opts.mode === 'color' && opts.point) {
    const px = Math.min(w - 1, Math.max(0, Math.round(opts.point.x * (w - 1))));
    const py = Math.min(h - 1, Math.max(0, Math.round(opts.point.y * (h - 1))));
    const i = (py * w + px) * 4;
    ref = [src[i], src[i + 1], src[i + 2]];
  } else {
    ref = dominantEdgeColor(src, w, h);
  }

  const MAXD = Math.sqrt(3 * 255 * 255);
  const tol = (opts.tolerance / 100) * MAXD;
  const soft = Math.max(1, (opts.softness / 100) * MAXD * 0.5);
  const limit = tol + soft;
  const dist = (p: number) => {
    const i = p * 4;
    const dr = src[i] - ref[0], dg = src[i + 1] - ref[1], db = src[i + 2] - ref[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  /** Alpha-Faktor 0 (Hintergrund) … 1 (bleibt). */
  const factor = (dd: number) => (dd <= tol ? 0 : dd >= limit ? 1 : (dd - tol) / soft);

  if (!opts.contiguous) {
    for (let p = 0; p < w * h; p++) {
      const f = factor(dist(p));
      if (f < 1) d[p * 4 + 3] = src[p * 4 + 3] * f;
    }
    return out;
  }

  // Flutfüllung von den Startpunkten aus; der weiche Rand wird mit erfasst, aber nicht überschritten.
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  const push = (p: number) => {
    if (seen[p]) return;
    seen[p] = 1;
    if (dist(p) <= limit) stack[top++] = p;
  };
  if (opts.mode === 'color' && opts.point) {
    push(Math.round(opts.point.y * (h - 1)) * w + Math.round(opts.point.x * (w - 1)));
  } else {
    for (let x = 0; x < w; x++) {
      push(x);
      push((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      push(y * w);
      push(y * w + w - 1);
    }
  }
  while (top) {
    const p = stack[--top];
    d[p * 4 + 3] = src[p * 4 + 3] * factor(dist(p));
    // Nur innerhalb der eigentlichen Toleranz weiterwachsen – sonst frisst der weiche Rand ins Motiv.
    if (dist(p) > tol) continue;
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * (h - 1)) push(p + w);
  }
  return out;
}
