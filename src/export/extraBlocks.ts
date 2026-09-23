/** Export-Daten für Plotter, Zeitstrahl und Abkürzungsverzeichnis – von allen Exportern gemeinsam genutzt. */
import { compile, fmt } from '@/blocks/plot/expr';
import { PALETTE_SIZE, fnName, graphPath, niceStep, paletteHex, syncParams, ticks, toPx, toPy, type Frame, type PlotFn, type PlotParam, type PlotView } from '@/blocks/plot/geometry';
import { dateRange, parseEntries, type TimelineEntry } from '@/blocks/timeline/model';
import type { TermLike } from '@/glossary/match';
import type { Assets, PMNode } from './model';

export interface PlotSummary {
  title: string;
  fns: { name: string; expr: string; color: string }[];
  /** „a = 2, b = 1“ */
  params: string;
}

export function plotSummary(n: PMNode): PlotSummary {
  const a = n.attrs ?? {};
  const fns = ((a.fns ?? []) as PlotFn[]).filter((f) => f.expr.trim() && !f.hidden);
  const used = [...new Set(fns.flatMap((f) => {
    const c = compile(f.expr);
    return c.ok ? c.params : [];
  }))].sort();
  const params = syncParams(used, (a.params ?? []) as PlotParam[]);
  return {
    title: String(a.title ?? ''),
    fns: fns.map((f, i) => ({ name: `${fnName(i)}(x)`, expr: f.expr.replace(/^\s*(?:[a-zA-Z]\w*\s*\(\s*x\s*\)|y)\s*=\s*/, ''), color: paletteHex[f.color % PALETTE_SIZE] })),
    params: params.map((p) => `${p.name} = ${fmt(p.value)}`).join(', '),
  };
}

let clipCount = 0;

/** Statisches SVG des Graphen (für HTML/PDF) – Gitter, Achsen, Kurven in den Blockfarben. */
export function plotSvg(n: PMNode, width = 640, height = 340): string {
  const a = n.attrs ?? {};
  const view = (a.view ?? { xmin: -8, xmax: 8, ymin: -5, ymax: 5 }) as PlotView;
  const fns = ((a.fns ?? []) as PlotFn[]).filter((f) => !f.hidden);
  const compiled = fns.map((f) => compile(f.expr));
  const used = [...new Set(compiled.flatMap((c) => (c.ok ? c.params : [])))];
  const scope = Object.fromEntries(syncParams(used, (a.params ?? []) as PlotParam[]).map((p) => [p.name, p.value]));
  const f: Frame = { view, width, height };
  const clip = `plot-clip-${++clipCount}`;
  const xs = niceStep(view.xmax - view.xmin, width / 90);
  const ys = niceStep(view.ymax - view.ymin, height / 60);
  const ax = Math.max(0, Math.min(height, toPy(f, 0)));
  const ay = Math.max(0, Math.min(width, toPx(f, 0)));
  const grid = [
    ...ticks(view.xmin, view.xmax, xs).map((x) => `<line x1="${toPx(f, x).toFixed(1)}" x2="${toPx(f, x).toFixed(1)}" y1="0" y2="${height}"/>`),
    ...ticks(view.ymin, view.ymax, ys).map((y) => `<line y1="${toPy(f, y).toFixed(1)}" y2="${toPy(f, y).toFixed(1)}" x1="0" x2="${width}"/>`),
  ].join('');
  const labelY = Math.min(height - 6, Math.max(14, ax + 15));
  const labels = [
    ...ticks(view.xmin, view.xmax, xs).filter((x) => x !== 0 && toPx(f, x) > 14 && toPx(f, x) < width - 14).map((x) => `<text x="${toPx(f, x).toFixed(1)}" y="${labelY}" text-anchor="middle">${fmt(x)}</text>`),
    ...ticks(view.ymin, view.ymax, ys).filter((y) => y !== 0 && toPy(f, y) > 10 && toPy(f, y) < height - 8).map((y) => `<text x="${ay < 36 ? ay + 6 : ay - 6}" y="${(toPy(f, y) + 4).toFixed(1)}" text-anchor="${ay < 36 ? 'start' : 'end'}">${fmt(y)}</text>`),
  ].join('');
  const curves = compiled
    .map((c, i) => (c.ok ? `<path d="${graphPath(c.run, scope, f)}" fill="none" stroke="${paletteHex[fns[i].color % PALETTE_SIZE]}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>` : ''))
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px;display:block;border:1px solid #E7E7E4;border-radius:10px;background:#fff" font-family="system-ui,sans-serif" font-size="11" fill="#6E6E73">
<clipPath id="${clip}"><rect width="${width}" height="${height}"/></clipPath><g clip-path="url(#${clip})">
<g stroke="#EFEFEC" stroke-width="1">${grid}</g>
<g stroke="#6E6E73" stroke-width="1.2"><line x1="0" x2="${width}" y1="${ax}" y2="${ax}"/><line x1="${ay}" x2="${ay}" y1="0" y2="${height}"/></g>
<g stroke="none">${labels}</g>${curves}</g></svg>`;
}

export interface TimelineRow {
  date: string;
  title: string;
  text: string;
  period: boolean;
}

export function timelineRows(n: PMNode): { title: string; rows: TimelineRow[] } {
  const a = n.attrs ?? {};
  const rows = parseEntries((a.entries ?? []) as TimelineEntry[]).map((e) => ({ date: dateRange(e), title: e.title, text: e.text, period: e.stop !== null }));
  return { title: String(a.title ?? ''), rows };
}

/** Begriffe für ein Abkürzungsverzeichnis im Export (nur vorhanden, wenn der Export das Glossar geladen hat). */
export function glossaryRows(n: PMNode, assets: Assets): { title: string; rows: TermLike[] } | null {
  const g = assets.glossary;
  if (!g) return null;
  return { title: String(n.attrs?.title ?? 'Abkürzungsverzeichnis'), rows: n.attrs?.scope === 'all' ? g.all : g.used };
}
