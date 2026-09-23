import type { Scope } from './expr';

export interface PlotFn {
  expr: string;
  /** Index in die Farbpalette. */
  color: number;
  hidden?: boolean;
}

export interface PlotParam {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface PlotView {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

export const defaultView: PlotView = { xmin: -8, xmax: 8, ymin: -5, ymax: 5 };

/** Anzahl Farben; Werte stehen als --plot-N in blocks.css (hell/dunkel) bzw. im Export. */
export const PALETTE_SIZE = 6;
export const paletteHex = ['#5B5BD6', '#D93A2B', '#1F8A4C', '#B8650A', '#1F6FD1', '#8250DF'];

/** Funktionsnamen der Reihe nach: f, g, h, k, p, q … */
export const fnName = (i: number) => 'fghkpqrsuvw'[i] ?? `f${i + 1}`;

/** Schöne Schrittweite (1, 2, 5 · 10^n) für etwa `target` Striche. */
export function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow;
}

export function ticks(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
  return out;
}

export interface Frame {
  view: PlotView;
  width: number;
  height: number;
}

export const toPx = (f: Frame, x: number) => ((x - f.view.xmin) / (f.view.xmax - f.view.xmin)) * f.width;
export const toPy = (f: Frame, y: number) => ((f.view.ymax - y) / (f.view.ymax - f.view.ymin)) * f.height;
export const fromPx = (f: Frame, px: number) => f.view.xmin + (px / f.width) * (f.view.xmax - f.view.xmin);
export const fromPy = (f: Frame, py: number) => f.view.ymax - (py / f.height) * (f.view.ymax - f.view.ymin);

type Run = (s: Scope) => number;

export function evalAt(run: Run, scope: Scope, x: number): number {
  scope.x = x;
  const y = run(scope);
  return Number.isFinite(y) ? y : NaN;
}

/**
 * SVG-Pfad des Graphen in Pixeln. Unterbricht bei Definitionslücken und Polstellen
 * (großer Sprung, bei dem der Mittelwert nicht dazwischen liegt – z. B. tan, 1/x).
 */
export function graphPath(run: Run, params: Scope, f: Frame): string {
  const scope: Scope = { ...params };
  const n = Math.ceil(f.width * 1.5);
  const limit = f.height * 6;
  const clampY = (py: number) => Math.max(-limit, Math.min(f.height + limit, py));
  let d = '';
  let prev: { x: number; y: number } | null = null;
  for (let i = 0; i <= n; i++) {
    const x = f.view.xmin + ((f.view.xmax - f.view.xmin) * i) / n;
    const y = evalAt(run, scope, x);
    if (Number.isNaN(y)) {
      prev = null;
      continue;
    }
    const px = toPx(f, x);
    const py = toPy(f, y);
    let jump = false;
    if (prev && Math.abs(py - toPy(f, prev.y)) > f.height * 0.5) {
      const mid = evalAt(run, scope, (prev.x + x) / 2);
      const lo = Math.min(prev.y, y);
      const hi = Math.max(prev.y, y);
      // Nur steil (z. B. e^x): Der Mittelwert liegt dazwischen. Polstelle: Er schießt darüber hinaus.
      jump = Number.isNaN(mid) || mid < lo || mid > hi;
    }
    d += `${prev && !jump ? 'L' : 'M'}${px.toFixed(1)} ${clampY(py).toFixed(1)}`;
    prev = { x, y };
  }
  return d;
}

export type PointKind = 'root' | 'max' | 'min' | 'yint' | 'cross';

export interface SpecialPoint {
  kind: PointKind;
  x: number;
  y: number;
  /** Beteiligte Funktionen (Index), bei Schnittpunkten zwei. */
  fns: number[];
}

export const pointLabels: Record<PointKind, string> = {
  root: 'Nullstelle',
  max: 'Hochpunkt',
  min: 'Tiefpunkt',
  yint: 'y-Achsenabschnitt',
  cross: 'Schnittpunkt',
};

/** Glättet Rundungsrauschen: 1.9999999997 → 2. */
const tidy = (v: number) => {
  const r = Math.round(v);
  return Math.abs(v - r) < 1e-7 ? r : v;
};

function bisect(h: (x: number) => number, a: number, b: number): number {
  let fa = h(a);
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    const fm = h(m);
    if (fm === 0) return m;
    if (Math.sign(fm) === Math.sign(fa)) {
      a = m;
      fa = fm;
    } else b = m;
  }
  return (a + b) / 2;
}

/** Goldener Schnitt: Extremum von h in [a, b] (dir = 1 Maximum, −1 Minimum). */
function golden(h: (x: number) => number, a: number, b: number, dir: 1 | -1): number {
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  for (let i = 0; i < 60; i++) {
    if (dir * h(c) > dir * h(d)) b = d;
    else a = c;
    c = b - g * (b - a);
    d = a + g * (b - a);
  }
  return (a + b) / 2;
}

/** Nullstellen von h im Sichtbereich; Polstellen mit Vorzeichenwechsel (1/x) fallen durch die Probe. */
function roots(h: (x: number) => number, view: PlotView, n: number, tol: number): number[] {
  const out: number[] = [];
  let x0 = view.xmin;
  let y0 = h(x0);
  for (let i = 1; i <= n; i++) {
    const x1 = view.xmin + ((view.xmax - view.xmin) * i) / n;
    const y1 = h(x1);
    if (y0 === 0) out.push(x0);
    else if (!Number.isNaN(y0) && !Number.isNaN(y1) && y1 !== 0 && Math.sign(y0) !== Math.sign(y1)) {
      const r = bisect(h, x0, x1);
      if (Math.abs(h(r)) < tol) out.push(r);
    }
    x0 = x1;
    y0 = y1;
  }
  return out;
}

/** Nullstellen, Extrema, y-Achsenabschnitte und Schnittpunkte der sichtbaren Funktionen. */
export function specialPoints(fns: { run: Run; index: number }[], params: Scope, view: PlotView): SpecialPoint[] {
  const scope: Scope = { ...params };
  const n = 480;
  const tol = (view.ymax - view.ymin) * 1e-6 + 1e-9;
  const pts: SpecialPoint[] = [];
  const inView = (p: SpecialPoint) => p.x >= view.xmin && p.x <= view.xmax && p.y >= view.ymin && p.y <= view.ymax;
  const push = (p: SpecialPoint) => {
    p = { ...p, x: tidy(p.x), y: tidy(p.y) };
    if (!inView(p)) return;
    const dx = (view.xmax - view.xmin) * 1e-4;
    const dy = (view.ymax - view.ymin) * 1e-4;
    // Doppelte (z. B. Nullstelle = Extremum bei x²) nur einmal, die erste Art gewinnt.
    if (pts.some((q) => Math.abs(q.x - p.x) < dx && Math.abs(q.y - p.y) < dy && q.fns.join() === p.fns.join())) return;
    pts.push(p);
  };

  for (const { run, index } of fns) {
    const h = (x: number) => evalAt(run, scope, x);
    for (const x of roots(h, view, n, tol)) push({ kind: 'root', x, y: 0, fns: [index] });

    // Extrema: Steigung wechselt das Vorzeichen.
    const step = (view.xmax - view.xmin) / n;
    let ya = h(view.xmin);
    let yb = h(view.xmin + step);
    for (let i = 2; i <= n; i++) {
      const x = view.xmin + step * i;
      const yc = h(x);
      if (![ya, yb, yc].some(Number.isNaN)) {
        const d0 = yb - ya;
        const d1 = yc - yb;
        if (d0 > 0 && d1 < 0) {
          const xm = golden(h, x - 2 * step, x, 1);
          push({ kind: 'max', x: xm, y: h(xm), fns: [index] });
        } else if (d0 < 0 && d1 > 0) {
          const xm = golden(h, x - 2 * step, x, -1);
          push({ kind: 'min', x: xm, y: h(xm), fns: [index] });
        }
      }
      ya = yb;
      yb = yc;
    }

    const y0 = h(0);
    if (!Number.isNaN(y0)) push({ kind: 'yint', x: 0, y: y0, fns: [index] });
  }

  for (let i = 0; i < fns.length; i++) {
    for (let j = i + 1; j < fns.length; j++) {
      const a = fns[i];
      const b = fns[j];
      const diff = (x: number) => evalAt(a.run, scope, x) - evalAt(b.run, scope, x);
      for (const x of roots(diff, view, n, tol)) push({ kind: 'cross', x, y: evalAt(a.run, scope, x), fns: [a.index, b.index] });
    }
  }

  // Nicht überladen: Bei sehr vielen Punkten (sin mit hoher Frequenz) nur die markantesten.
  return pts.length > 60 ? pts.filter((p) => p.kind !== 'max' && p.kind !== 'min').slice(0, 60) : pts;
}

/** Zoomt die Ansicht um `factor` um den Punkt (cx, cy). */
export function zoomView(v: PlotView, factor: number, cx = (v.xmin + v.xmax) / 2, cy = (v.ymin + v.ymax) / 2): PlotView {
  return {
    xmin: cx - (cx - v.xmin) * factor,
    xmax: cx + (v.xmax - cx) * factor,
    ymin: cy - (cy - v.ymin) * factor,
    ymax: cy + (v.ymax - cy) * factor,
  };
}

/** Parameter-Namen, die in den Ausdrücken vorkommen, mit bestehenden Werten zusammenführen. */
export function syncParams(names: string[], current: PlotParam[]): PlotParam[] {
  return names.map((name) => current.find((p) => p.name === name) ?? { name, value: 1, min: -5, max: 5, step: 0.1 });
}
