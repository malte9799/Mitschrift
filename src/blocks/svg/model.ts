/**
 * SVG-Werkzeuge: Eingefügten Code bereinigen, Farben finden und ersetzen, Linien skalieren, drehen.
 * Alles arbeitet auf dem SVG-Text – dargestellt wird das Ergebnis als <img>, damit fremdes SVG
 * nie Skripte ausführen oder die Seite umstylen kann.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/** Darstellungs-Anpassungen, die den Inhalt des SVG verändern (Rest ist CSS am Rahmen). */
export interface SvgContentStyle {
  /** Ursprüngliche Farbe (normalisiert) → neue Farbe. */
  colors: Record<string, string>;
  /** Faktor für alle Strichstärken (1 = unverändert). */
  strokeScale: number;
  rotate: number;
  flipH: boolean;
  flipV: boolean;
}

/** Inhalts-Stil aus den Attributen des SVG-Blocks. */
export const contentStyleOf = (a: Record<string, unknown>): SvgContentStyle => ({
  colors: (a.colors as Record<string, string>) ?? {},
  strokeScale: (a.strokeScale as number) ?? 1,
  rotate: (a.rotate as number) ?? 0,
  flipH: !!a.flipH,
  flipV: !!a.flipV,
});

// ---------- Erkennen & Bereinigen ----------

/** Sieht der eingefügte Text nach einem SVG aus? (XML-Kopf, Kommentare und Doctype davor sind erlaubt.) */
export function looksLikeSvg(text: string): boolean {
  const t = text.trim();
  return /^(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>]/i.test(t) && /<\/svg>\s*$|\/>\s*$/i.test(t);
}

const FORBIDDEN = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video', 'canvas', 'handler', 'listener', 'set']);

/** Entfernt url(...)-Verweise nach außen – nur interne (#id) und eingebettete Bilder bleiben. */
const cleanCss = (css: string) => css.replace(/url\(\s*(['"]?)(?!#|data:image\/(?:png|jpe?g|gif|webp);)[^)]*\)/gi, 'none').replace(/@import[^;]*;?/gi, '').replace(/expression\s*\(/gi, '(');

function safeHref(v: string): boolean {
  const s = v.trim();
  return s.startsWith('#') || /^data:image\/(png|jpe?g|gif|webp);/i.test(s);
}

function cleanElement(el: Element) {
  for (const child of [...el.children]) {
    const name = child.localName.toLowerCase();
    const foreignNs = child.namespaceURI !== SVG_NS;
    const animatesHref = /^animate/.test(name) && /href/i.test(child.getAttribute('attributeName') ?? '');
    if (FORBIDDEN.has(name) || foreignNs || animatesHref) child.remove();
    else cleanElement(child);
  }
  for (const attr of [...el.attributes]) {
    const n = attr.name.toLowerCase();
    if (n.startsWith('on')) el.removeAttributeNode(attr);
    // Editor-Ballast (Inkscape, Sketch, Illustrator …).
    else if (/^(sodipodi|inkscape|sketch|serif|figma|i|x|a|graph):/.test(n) || (n.startsWith('xmlns:') && !/^xmlns:(xlink|svg)$/.test(n))) el.removeAttributeNode(attr);
    else if ((n === 'href' || n === 'xlink:href') && !safeHref(attr.value)) el.removeAttributeNode(attr);
    else if (n === 'style') attr.value = cleanCss(attr.value);
  }
  if (el.localName === 'style') el.textContent = cleanCss(el.textContent ?? '');
}

function parse(text: string): SVGSVGElement | null {
  const match = text.match(/<svg[\s>][\s\S]*<\/svg>|<svg[^>]*\/>/i);
  if (!match) return null;
  let src = match[0];
  // Aus HTML kopiertes SVG hat oft keinen Namensraum.
  if (!/\sxmlns\s*=/.test(src.slice(0, src.indexOf('>')))) src = src.replace(/^<svg/i, `<svg xmlns="${SVG_NS}"`);
  if (/xlink:/.test(src) && !/xmlns:xlink/.test(src)) src = src.replace(/^<svg/i, `<svg xmlns:xlink="${XLINK_NS}"`);
  const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
  const root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.localName !== 'svg') return null;
  return root as unknown as SVGSVGElement;
}

const num = (v: string | null) => {
  const n = v == null ? NaN : parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function viewBoxOf(root: Element): [number, number, number, number] | null {
  const parts = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  return parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0 ? (parts as [number, number, number, number]) : null;
}

/** Sorgt für viewBox und Pixelmaße – sonst skaliert das SVG als Bild nicht sauber. */
function normalizeSize(root: Element) {
  const w = root.getAttribute('width');
  const h = root.getAttribute('height');
  const plain = (v: string | null) => v != null && /^\s*[\d.]+\s*(px)?\s*$/.test(v);
  let vb = viewBoxOf(root);
  if (!vb) {
    const nw = num(w) ?? 300;
    const nh = num(h) ?? 150;
    vb = [0, 0, nw, nh];
    root.setAttribute('viewBox', vb.join(' '));
  }
  // Prozent, mm, em … → Pixelmaße aus der viewBox (Seitenverhältnis bleibt).
  if (!plain(w) || !plain(h)) {
    const scale = plain(w) ? num(w)! / vb[2] : plain(h) ? num(h)! / vb[3] : 1;
    root.setAttribute('width', String(round(vb[2] * scale)));
    root.setAttribute('height', String(round(vb[3] * scale)));
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Bereinigt SVG-Code (keine Skripte, keine externen Verweise) und liefert ihn als Text – oder null, wenn es kein SVG ist. */
export function cleanSvg(text: string): string | null {
  const root = parse(text);
  if (!root) return null;
  cleanElement(root);
  normalizeSize(root);
  return serialize(root);
}

export const serialize = (root: Element) => new XMLSerializer().serializeToString(root);

// ---------- Farben ----------

const COLOR_PROPS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'];
const DECL = /(^|[;{\s])(fill|stroke|stop-color|flood-color|lighting-color|color)(\s*:\s*)([^;}!]+)/gi;
const SHAPES = 'path,rect,circle,ellipse,polygon,polyline,text,tspan,textPath';

let ctx: CanvasRenderingContext2D | null = null;

/** Farbe in einheitlicher Schreibweise (#rrggbb bzw. rgba(…)) – null für none, url(), currentColor usw. */
export function normColor(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v || /^(none|transparent|inherit|initial|unset|currentcolor|context-fill|context-stroke)$/.test(v) || /^(url|var)\(/.test(v)) return null;
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#010203';
  ctx.fillStyle = v;
  const out = String(ctx.fillStyle);
  return out === '#010203' && v !== '#010203' ? null : out;
}

/** #rrggbb für <input type="color"> (Transparenz geht dabei verloren). */
export function toHex(color: string): string {
  if (color.startsWith('#')) return color.slice(0, 7);
  const m = color.match(/[\d.]+/g);
  if (!m) return '#000000';
  return '#' + m.slice(0, 3).map((c) => Math.round(+c).toString(16).padStart(2, '0')).join('');
}

/** Relative Helligkeit 0 … 1. */
export function luminance(color: string): number {
  const hex = toHex(color);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const hasOwnPaint = (root: Element, prop: string) =>
  root.hasAttribute(prop) || new RegExp(`(^|;)\\s*${prop}\\s*:`, 'i').test(root.getAttribute('style') ?? '');

/**
 * Geht alle Farbwerte durch (Attribute, style-Attribute, <style>-Blöcke). `fn` bekommt die
 * normalisierte Farbe und liefert eine Ersatzfarbe oder undefined (bleibt).
 * Auch das implizite Schwarz (Formen ohne fill, currentColor) zählt als #000000.
 */
function eachColor(root: Element, fn: (color: string) => string | undefined) {
  const sub = (raw: string) => {
    const c = normColor(raw);
    const next = c ? fn(c) : undefined;
    return next ?? raw;
  };
  const subDecls = (css: string) => css.replace(DECL, (_m, pre, prop, colon, val) => `${pre}${prop}${colon}${sub(val)}`);
  const all = [root, ...root.querySelectorAll('*')];
  for (const el of all) {
    for (const prop of COLOR_PROPS) {
      const v = el.getAttribute(prop);
      if (v != null) {
        const next = sub(v);
        if (next !== v) el.setAttribute(prop, next);
      }
    }
    const style = el.getAttribute('style');
    if (style) {
      const next = subDecls(style);
      if (next !== style) el.setAttribute('style', next);
    }
    if (el.localName === 'style' && el.textContent) el.textContent = subDecls(el.textContent);
  }
  // Implizites Schwarz: Formen ohne eigene Füllung erben sie vom Wurzelelement.
  const hasCss = !!root.querySelector('style');
  const inheritsFill = (el: Element) => {
    if (el.closest('clipPath,mask') || (hasCss && el.hasAttribute('class'))) return false;
    for (let e: Element | null = el; e && e !== root; e = e.parentElement) if (hasOwnPaint(e, 'fill')) return false;
    return true;
  };
  const implicitFill = !hasOwnPaint(root, 'fill') && [...root.querySelectorAll(SHAPES)].some(inheritsFill);
  const usesCurrent = /currentcolor/i.test(serialize(root)) && !hasOwnPaint(root, 'color');
  if (implicitFill || usesCurrent) {
    const next = fn('#000000');
    if (next) {
      if (implicitFill) root.setAttribute('fill', next);
      if (usesCurrent) root.setAttribute('color', next);
    }
  }
}

/** Alle Farben im SVG, häufigste zuerst. */
export function paletteOf(svg: string): string[] {
  const root = parse(svg);
  if (!root) return [];
  return paletteOfElement(root);
}

export function paletteOfElement(root: Element): string[] {
  const count = new Map<string, number>();
  eachColor(root.cloneNode(true) as Element, (c) => {
    count.set(c, (count.get(c) ?? 0) + 1);
    return undefined;
  });
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

/** Ersetzt Farben direkt im (lebenden) SVG-Element. */
export function recolorElement(root: Element, colors: Record<string, string>) {
  eachColor(root, (c) => colors[c]);
}

// ---------- Linien ----------

function scaleLength(v: string, f: number): string {
  const m = v.trim().match(/^(-?[\d.]+(?:e-?\d+)?)(.*)$/i);
  return m ? `${round(parseFloat(m[1]) * f)}${m[2]}` : v;
}

export function scaleStrokes(root: Element, f: number) {
  if (f === 1) return;
  const decl = /(^|[;{\s])(stroke-width\s*:\s*)([^;}!]+)/gi;
  const subDecls = (css: string) => css.replace(decl, (_m, pre, head, val) => `${pre}${head}${scaleLength(val, f)}`);
  for (const el of [root, ...root.querySelectorAll('*')]) {
    const w = el.getAttribute('stroke-width');
    if (w != null) el.setAttribute('stroke-width', scaleLength(w, f));
    const style = el.getAttribute('style');
    if (style) el.setAttribute('style', subDecls(style));
    if (el.localName === 'style' && el.textContent) el.textContent = subDecls(el.textContent);
  }
  // Standard ist 1 – geerbt von der Wurzel.
  if (!hasOwnPaint(root, 'stroke-width')) root.setAttribute('stroke-width', String(round(f)));
}

// ---------- Drehen & Spiegeln ----------

function orient(root: Element, rotate: number, flipH: boolean, flipV: boolean) {
  const r = ((Math.round(rotate / 90) * 90) % 360 + 360) % 360;
  if (!r && !flipH && !flipV) return;
  const vb = viewBoxOf(root) ?? [0, 0, num(root.getAttribute('width')) ?? 300, num(root.getAttribute('height')) ?? 150];
  const [x, y, w, h] = vb;
  const swap = r === 90 || r === 270;
  const nw = swap ? h : w;
  const nh = swap ? w : h;
  const g = root.ownerDocument.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${round(nw / 2)} ${round(nh / 2)}) rotate(${r}) scale(${flipH ? -1 : 1} ${flipV ? -1 : 1}) translate(${round(-x - w / 2)} ${round(-y - h / 2)})`);
  for (const child of [...root.childNodes]) {
    // defs und style dürfen außen bleiben, schaden aber auch innen nicht.
    g.append(child);
  }
  root.append(g);
  root.setAttribute('viewBox', `0 0 ${round(nw)} ${round(nh)}`);
  if (swap) {
    const pw = root.getAttribute('width');
    root.setAttribute('width', root.getAttribute('height') ?? String(nw));
    root.setAttribute('height', pw ?? String(nh));
  }
}

// ---------- Zusammen ----------

/** Wendet Farben, Linien und Drehung an und liefert den neuen SVG-Text. */
export function applyStyle(svg: string, style: SvgContentStyle): string {
  const root = parse(svg);
  if (!root) return svg;
  if (Object.keys(style.colors).length) recolorElement(root, style.colors);
  scaleStrokes(root, style.strokeScale || 1);
  orient(root, style.rotate, style.flipH, style.flipV);
  return serialize(root);
}

/** Natürliche Größe in Pixeln (aus width/height). */
export function sizeOf(svg: string): { width: number; height: number } {
  const root = parse(svg);
  const vb = root && viewBoxOf(root);
  return {
    width: (root && num(root.getAttribute('width'))) ?? vb?.[2] ?? 300,
    height: (root && num(root.getAttribute('height'))) ?? vb?.[3] ?? 150,
  };
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Nur dunkle Farben (Strichzeichnung, Icon)? Dann im Dunkelmodus besser invertieren. */
export function prefersInvert(svg: string): boolean {
  const colors = paletteOf(svg);
  return colors.length > 0 && colors.every((c) => luminance(c) < 0.12);
}
