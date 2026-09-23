import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/ui/Icon';
import { cleanSvg, paletteOfElement, recolorElement, serialize, toHex } from './model';

const SVG_NS = 'http://www.w3.org/2000/svg';

type Tool = 'select' | 'rect' | 'ellipse' | 'line' | 'pen' | 'text';

const tools: { id: Tool; icon: IconName; label: string; key: string }[] = [
  { id: 'select', icon: 'cursor', label: 'Auswählen & verschieben', key: 'v' },
  { id: 'rect', icon: 'shapeRect', label: 'Rechteck', key: 'r' },
  { id: 'ellipse', icon: 'shapeEllipse', label: 'Ellipse', key: 'e' },
  { id: 'line', icon: 'shapeLine', label: 'Linie', key: 'l' },
  { id: 'pen', icon: 'pencil', label: 'Freihand', key: 'p' },
  { id: 'text', icon: 'shapeText', label: 'Text', key: 't' },
];

/** Geometrie-Attribute, die im Inspektor als Zahlenfelder erscheinen. */
const GEOMETRY: Record<string, string[]> = {
  rect: ['x', 'y', 'width', 'height', 'rx'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  text: ['x', 'y'],
  image: ['x', 'y', 'width', 'height'],
  use: ['x', 'y'],
};

/** Nicht sichtbare Hilfselemente – nicht anklickbar, nicht in der Ebenenliste. */
const HIDDEN = new Set(['defs', 'style', 'title', 'desc', 'metadata', 'clipPath', 'mask', 'marker', 'pattern', 'symbol', 'linearGradient', 'radialGradient', 'filter']);

const SHADOW_CSS = `
:host{display:block;width:100%;height:100%}
/* Wie als <img>: Browser-Standardschrift, nicht die der App. */
svg{display:block;width:100%;height:100%;overflow:hidden;user-select:none;-webkit-user-select:none;font:initial}
:host(:not(.tool-select)) svg,:host(:not(.tool-select)) svg *{cursor:crosshair}
:host(.tool-select) svg *{cursor:move}
`;

const r2 = (n: number) => Math.round(n * 100) / 100;

function viewBox(svg: SVGSVGElement): [number, number, number, number] {
  const vb = svg.viewBox.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) return [vb.x, vb.y, vb.width, vb.height];
  return [0, 0, parseFloat(svg.getAttribute('width') ?? '') || 300, parseFloat(svg.getAttribute('height') ?? '') || 150];
}

function toLocal(el: Element, x: number, y: number): { x: number; y: number } {
  const m = (el as SVGGraphicsElement).getScreenCTM?.();
  if (!m) return { x, y };
  const p = new DOMPoint(x, y).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

/** Vorhandenes translate(...) vorne zusammenfassen statt immer neue anzuhängen. */
function withTranslate(orig: string, dx: number, dy: number): string {
  const m = orig.match(/^\s*translate\(\s*(-?[\d.e+-]+)[\s,]*(-?[\d.e+-]+)?\s*\)\s*(.*)$/i);
  if (m) return `translate(${r2(parseFloat(m[1]) + dx)} ${r2(parseFloat(m[2] ?? '0') + dy)})${m[3] ? ` ${m[3]}` : ''}`;
  return `translate(${r2(dx)} ${r2(dy)})${orig ? ` ${orig}` : ''}`;
}

function pathOf(el: Element, root: Element): number[] {
  const path: number[] = [];
  for (let e: Element | null = el; e && e !== root; e = e.parentElement) path.unshift([...(e.parentElement?.children ?? [])].indexOf(e));
  return path;
}

function atPath(root: Element, path: number[]): Element | null {
  let e: Element | null = root;
  for (const i of path) e = e?.children[i] ?? null;
  return e && e !== root ? e : null;
}

function labelOf(el: Element): string {
  const id = el.getAttribute('id');
  const text = el.localName === 'text' ? (el.textContent ?? '').trim().slice(0, 18) : '';
  const names: Record<string, string> = { g: 'Gruppe', path: 'Pfad', rect: 'Rechteck', circle: 'Kreis', ellipse: 'Ellipse', line: 'Linie', polyline: 'Linienzug', polygon: 'Polygon', text: 'Text', image: 'Bild', use: 'Verweis' };
  return `${names[el.localName] ?? el.localName}${text ? ` „${text}“` : ''}${id ? ` #${id}` : ''}`;
}

interface DrawStyle {
  fill: string;
  stroke: string;
  width: number;
}

interface Props {
  initial: string;
  onSave: (svg: string) => void;
  onClose: () => void;
}

/** Vollbild-SVG-Editor: auswählen, verschieben, zeichnen, Eigenschaften, Ebenen und Code. */
export default function SvgEditor({ initial, onSave, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [version, tick] = useReducer((n: number) => n + 1, 0);

  const [tool, setTool] = useState<Tool>('select');
  const [sel, setSel] = useState<Element | null>(null);
  const [hover, setHover] = useState<Element | null>(null);
  const [tab, setTab] = useState<'visual' | 'code'>('visual');
  const [zoom, setZoom] = useState(1);
  const [stage, setStage] = useState({ w: 800, h: 600 });
  const [draw, setDraw] = useState<DrawStyle>({ fill: 'none', stroke: '#1c1c1e', width: 2 });
  // Neu angelegter/doppelgeklickter Text: Eingabefeld im Inspektor fokussieren.
  const [focusText, setFocusText] = useState<Element | null>(null);

  // Aktuelle Werte für die (einmal registrierten) Zeiger-Handler.
  const live = useRef({ tool, sel, draw });
  live.current = { tool, sel, draw };

  // ---------- Verlauf & Speichern ----------
  const hist = useRef({ stack: [initial], index: 0 });
  const saved = useRef(initial);
  const saveTimer = useRef<number>();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  function flush() {
    window.clearTimeout(saveTimer.current);
    const cur = hist.current.stack[hist.current.index];
    if (cur === saved.current) return;
    saved.current = cur;
    onSaveRef.current(cur);
  }

  function commit() {
    const svg = svgRef.current;
    if (!svg) return;
    const s = serialize(svg);
    const h = hist.current;
    if (s !== h.stack[h.index]) {
      h.stack = [...h.stack.slice(Math.max(0, h.index - 199), h.index + 1), s];
      h.index = h.stack.length - 1;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(flush, 500);
    }
    tick();
  }

  const commitTimer = useRef<number>();
  /** Für Regler und Farbwähler: sofort anzeigen, verzögert als ein Verlaufsschritt speichern. */
  function commitSoon() {
    tick();
    window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(commit, 350);
  }

  function mount(src: string, keep?: number[] | null) {
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    if (!shadow.querySelector('style')) {
      const style = document.createElement('style');
      style.textContent = SHADOW_CSS;
      shadow.append(style);
    }
    const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
    const el = document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
    svgRef.current?.remove();
    shadow.append(el);
    svgRef.current = el;
    setSel(keep ? atPath(el, keep) : null);
    setHover(null);
    tick();
  }

  function jump(delta: number) {
    const h = hist.current;
    const next = h.index + delta;
    if (next < 0 || next >= h.stack.length) return;
    const svg = svgRef.current;
    const keep = svg && sel ? pathOf(sel, svg) : null;
    h.index = next;
    mount(h.stack[next], keep);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flush, 500);
  }

  useLayoutEffect(() => {
    mount(initial);
    rootRef.current?.focus();
    return () => flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, []);

  function close() {
    window.clearTimeout(commitTimer.current);
    if (commitTimer.current) commit();
    flush();
    onClose();
  }

  // ---------- Bühne: Größe & Zoom ----------
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStage({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab]);

  const vb = svgRef.current ? viewBox(svgRef.current) : [0, 0, 300, 150];
  const fit = Math.max(0.01, Math.min((stage.w - 64) / vb[2], (stage.h - 64) / vb[3]));
  const paperW = Math.max(40, vb[2] * fit * zoom);
  const paperH = Math.max(40, vb[3] * fit * zoom);

  // Auswahl-/Hover-Rahmen (in Papier-Koordinaten).
  const [boxes, setBoxes] = useState<{ sel: DOMRect | null; hover: DOMRect | null }>({ sel: null, hover: null });
  useLayoutEffect(() => {
    const paper = paperRef.current?.getBoundingClientRect();
    const rel = (el: Element | null) => {
      if (!paper || !el || !el.isConnected) return null;
      const r = el.getBoundingClientRect();
      return new DOMRect(r.x - paper.x, r.y - paper.y, r.width, r.height);
    };
    setBoxes({ sel: rel(sel), hover: hover !== sel ? rel(hover) : null });
  }, [sel, hover, version, paperW, paperH, tab]);

  // ---------- Zeiger ----------
  useEffect(() => {
    const host = hostRef.current;
    const shadow = host?.shadowRoot;
    if (!host || !shadow) return;

    function pick(target: EventTarget | null, top: boolean): Element | null {
      const svg = svgRef.current;
      if (!svg || !(target instanceof Element) || target === svg || !svg.contains(target)) return null;
      let el: Element = target;
      if (el.closest([...HIDDEN].join(','))) return null;
      if (el.localName === 'tspan' || el.localName === 'textPath') el = el.closest('text') ?? el;
      if (top) while (el.parentElement && (el.parentElement as Element) !== svg) el = el.parentElement;
      return el;
    }

    function onDown(e: Event) {
      const ev = e as PointerEvent;
      if (ev.button !== 0) return;
      const svg = svgRef.current;
      if (!svg) return;
      ev.preventDefault();
      rootRef.current?.focus();
      const { tool: t, sel: cur, draw: d } = live.current;

      if (t === 'select') {
        let target = pick(ev.target, ev.altKey);
        // In eine ausgewählte Gruppe klicken: Gruppe bleibt ausgewählt und wird verschoben.
        if (target && cur && cur !== target && cur.contains(target)) target = cur;
        setSel(target);
        if (!target) return;
        const parent = target.parentElement ?? svg;
        const start = toLocal(parent, ev.clientX, ev.clientY);
        const orig = target.getAttribute('transform') ?? '';
        let moved = false;
        const move = (m: PointerEvent) => {
          const p = toLocal(parent, m.clientX, m.clientY);
          let dx = p.x - start.x;
          let dy = p.y - start.y;
          if (m.shiftKey) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0);
          if (!moved && Math.hypot(m.clientX - ev.clientX, m.clientY - ev.clientY) < 3) return;
          moved = true;
          target!.setAttribute('transform', withTranslate(orig, dx, dy));
          tick();
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          if (moved) commit();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return;
      }

      // Zeichnen – immer in Koordinaten der Wurzel.
      const p0 = toLocal(svg, ev.clientX, ev.clientY);
      const [, , vw, vh] = viewBox(svg);
      const el = document.createElementNS(SVG_NS, t === 'rect' ? 'rect' : t === 'ellipse' ? 'ellipse' : t === 'line' ? 'line' : t === 'pen' ? 'path' : 'text');
      const paint = (fill: string) => {
        el.setAttribute('fill', fill);
        if (t !== 'text') {
          el.setAttribute('stroke', d.stroke);
          el.setAttribute('stroke-width', String(d.width));
          if (t === 'pen' || t === 'line') {
            el.setAttribute('stroke-linecap', 'round');
            el.setAttribute('stroke-linejoin', 'round');
          }
        }
      };
      if (t === 'text') {
        el.setAttribute('x', String(r2(p0.x)));
        el.setAttribute('y', String(r2(p0.y)));
        el.setAttribute('font-size', String(r2(Math.max(vw, vh) / 20)));
        el.setAttribute('font-family', 'system-ui, sans-serif');
        paint(d.stroke === 'none' ? '#1c1c1e' : d.stroke);
        el.textContent = 'Text';
        svg.append(el);
        commit();
        setSel(el);
        setTool('select');
        setFocusText(el);
        return;
      }
      paint(t === 'line' || t === 'pen' ? 'none' : d.fill);
      const pts: { x: number; y: number }[] = [p0];
      svg.append(el);

      const shape = (p: { x: number; y: number }, shift: boolean) => {
        let w = p.x - p0.x;
        let h = p.y - p0.y;
        if (shift && t !== 'line') {
          const s = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w || 1) * s;
          h = Math.sign(h || 1) * s;
        }
        if (t === 'rect') {
          el.setAttribute('x', String(r2(Math.min(p0.x, p0.x + w))));
          el.setAttribute('y', String(r2(Math.min(p0.y, p0.y + h))));
          el.setAttribute('width', String(r2(Math.abs(w))));
          el.setAttribute('height', String(r2(Math.abs(h))));
        } else if (t === 'ellipse') {
          el.setAttribute('cx', String(r2(p0.x + w / 2)));
          el.setAttribute('cy', String(r2(p0.y + h / 2)));
          el.setAttribute('rx', String(r2(Math.abs(w / 2))));
          el.setAttribute('ry', String(r2(Math.abs(h / 2))));
        } else if (t === 'line') {
          if (shift) {
            // Auf 45°-Schritte einrasten.
            const a = Math.round(Math.atan2(h, w) / (Math.PI / 4)) * (Math.PI / 4);
            const len = Math.hypot(w, h);
            w = Math.cos(a) * len;
            h = Math.sin(a) * len;
          }
          el.setAttribute('x1', String(r2(p0.x)));
          el.setAttribute('y1', String(r2(p0.y)));
          el.setAttribute('x2', String(r2(p0.x + w)));
          el.setAttribute('y2', String(r2(p0.y + h)));
        } else {
          const last = pts[pts.length - 1];
          if (Math.hypot(p.x - last.x, p.y - last.y) > Math.max(vw, vh) / 600) pts.push(p);
          el.setAttribute('d', `M${pts.map((q) => `${r2(q.x)} ${r2(q.y)}`).join(' L')}`);
        }
      };
      shape(p0, false);
      const move = (m: PointerEvent) => {
        shape(toLocal(svg, m.clientX, m.clientY), m.shiftKey);
        tick();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        const box = (el as SVGGraphicsElement).getBBox();
        if (box.width < 0.5 && box.height < 0.5) {
          el.remove();
          tick();
          return;
        }
        commit();
        setSel(el);
        if (t !== 'pen') setTool('select');
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function onOver(e: Event) {
      if (live.current.tool !== 'select') return;
      setHover(pick(e.target, (e as PointerEvent).altKey));
    }
    const onLeave = () => setHover(null);
    function onDbl(e: Event) {
      // Doppelklick auf Text: direkt den Inhalt bearbeiten.
      const el = pick(e.target, false);
      if (el?.localName === 'text') {
        setSel(el);
        setFocusText(el);
      }
    }

    shadow.addEventListener('pointerdown', onDown);
    shadow.addEventListener('pointerover', onOver);
    shadow.addEventListener('dblclick', onDbl);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      shadow.removeEventListener('pointerdown', onDown);
      shadow.removeEventListener('pointerover', onOver);
      shadow.removeEventListener('dblclick', onDbl);
      host.removeEventListener('pointerleave', onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Handler lesen live.current
  }, [tab]);

  // ---------- Aktionen ----------
  function chooseTool(t: Tool) {
    setTool(t);
    if (t !== 'select') setSel(null);
  }

  function remove() {
    if (!sel) return;
    sel.remove();
    setSel(null);
    commit();
  }

  function duplicate() {
    const svg = svgRef.current;
    if (!sel || !svg) return;
    const copy = sel.cloneNode(true) as Element;
    copy.removeAttribute('id');
    const off = Math.max(viewBox(svg)[2], viewBox(svg)[3]) / 40;
    copy.setAttribute('transform', withTranslate(sel.getAttribute('transform') ?? '', off, off));
    sel.after(copy);
    setSel(copy);
    commit();
  }

  function arrange(where: 'up' | 'down' | 'top' | 'bottom') {
    const parent = sel?.parentElement;
    if (!sel || !parent) return;
    if (where === 'top') parent.append(sel);
    if (where === 'bottom') parent.prepend(sel);
    if (where === 'up') sel.nextElementSibling?.after(sel);
    if (where === 'down') sel.previousElementSibling?.before(sel);
    commit();
  }

  function group() {
    if (!sel) return;
    const g = document.createElementNS(SVG_NS, 'g');
    sel.before(g);
    g.append(sel);
    setSel(g);
    commit();
  }

  function ungroup() {
    if (!sel || sel.localName !== 'g') return;
    const t = sel.getAttribute('transform') ?? '';
    const inherit = ['fill', 'stroke', 'stroke-width', 'opacity', 'font-size', 'font-family'];
    const kids = [...sel.children];
    for (const kid of kids) {
      if (t) kid.setAttribute('transform', `${t} ${kid.getAttribute('transform') ?? ''}`.trim());
      for (const a of inherit) if (sel.hasAttribute(a) && !kid.hasAttribute(a)) kid.setAttribute(a, sel.getAttribute(a)!);
      sel.before(kid);
    }
    sel.remove();
    setSel(kids[0] ?? null);
    commit();
  }

  function nudge(dx: number, dy: number) {
    const svg = svgRef.current;
    if (!sel || !svg) return;
    // Pfeiltaste = 1 Bildschirm-Pixel in Elternkoordinaten (Shift: 10).
    const parent = sel.parentElement ?? svg;
    const a = toLocal(parent, 0, 0);
    const b = toLocal(parent, dx, dy);
    sel.setAttribute('transform', withTranslate(sel.getAttribute('transform') ?? '', b.x - a.x, b.y - a.y));
    commitSoon();
  }

  function cropToContent() {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBBox();
    if (!box.width || !box.height) return;
    const pad = Math.max(box.width, box.height) * 0.02;
    const [, , ow, oh] = viewBox(svg);
    const nw = box.width + pad * 2;
    const nh = box.height + pad * 2;
    svg.setAttribute('viewBox', `${r2(box.x - pad)} ${r2(box.y - pad)} ${r2(nw)} ${r2(nh)}`);
    // Pixelgröße im gleichen Maßstab mitführen.
    const pw = parseFloat(svg.getAttribute('width') ?? '') || ow;
    const ph = parseFloat(svg.getAttribute('height') ?? '') || oh;
    svg.setAttribute('width', String(r2((nw * pw) / ow)));
    svg.setAttribute('height', String(r2((nh * ph) / oh)));
    commit();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
      if (e.key === 'Escape') t.blur();
      return;
    }
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z') {
      e.preventDefault();
      jump(e.shiftKey ? 1 : -1);
    } else if (mod && k === 'y') {
      e.preventDefault();
      jump(1);
    } else if (mod && k === 'd') {
      e.preventDefault();
      duplicate();
    } else if (mod && k === 'g') {
      e.preventDefault();
      e.shiftKey ? ungroup() : group();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove();
    } else if (e.key === 'Escape') {
      if (tool !== 'select') setTool('select');
      else if (sel) setSel(null);
      else close();
    } else if (e.key.startsWith('Arrow') && sel) {
      e.preventDefault();
      const s = e.shiftKey ? 10 : 1;
      nudge(e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0, e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0);
    } else if (!mod && tab === 'visual') {
      const hit = tools.find((x) => x.key === k);
      if (hit) chooseTool(hit.id);
    }
  }

  // ⌘/Strg + Mausrad (und Trackpad-Pinch) zoomt – nicht passiv, sonst zoomt der Browser mit.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => Math.max(0.1, Math.min(16, z * Math.exp(-e.deltaY / 300))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const h = hist.current;
  const svg = svgRef.current;

  return (
    <div ref={rootRef} className="b-svge" tabIndex={-1} onKeyDown={onKeyDown}>
      <header className="b-svge-bar">
        <span className="b-block-badge">
          <Icon name="bezier" /> SVG-Editor
        </span>
        <div className="b-svge-group" role="tablist">
          <button type="button" className={tab === 'visual' ? 'active' : ''} onClick={() => setTab('visual')}>
            Zeichnen
          </button>
          <button
            type="button"
            className={tab === 'code' ? 'active' : ''}
            onClick={() => {
              if (commitTimer.current) commit();
              setTab('code');
            }}
          >
            <Icon name="code" /> Code
          </button>
        </div>
        {tab === 'visual' && (
          <div className="b-svge-group">
            {tools.map((x) => (
              <button key={x.id} type="button" className={tool === x.id ? 'active' : ''} title={`${x.label} (${x.key.toUpperCase()})`} aria-label={x.label} onClick={() => chooseTool(x.id)}>
                <Icon name={x.icon} />
              </button>
            ))}
          </div>
        )}
        <div className="b-svge-group">
          <button type="button" title="Rückgängig (⌘Z)" aria-label="Rückgängig" disabled={h.index === 0} onClick={() => jump(-1)}>
            <Icon name="undo" />
          </button>
          <button type="button" title="Wiederholen (⌘⇧Z)" aria-label="Wiederholen" disabled={h.index >= h.stack.length - 1} onClick={() => jump(1)}>
            <Icon name="redo" />
          </button>
        </div>
        {tab === 'visual' && (
          <div className="b-svge-group">
            <button type="button" aria-label="Verkleinern" onClick={() => setZoom((z) => Math.max(0.1, z / 1.25))}>
              <Icon name="minus" />
            </button>
            <button type="button" className="b-svge-zoom" title="Einpassen" onClick={() => setZoom(1)}>
              {Math.round(zoom * 100)} %
            </button>
            <button type="button" aria-label="Vergrößern" onClick={() => setZoom((z) => Math.min(16, z * 1.25))}>
              <Icon name="plus" />
            </button>
          </div>
        )}
        <span className="b-svge-spacer" />
        <button type="button" className="b-whiteboard-done" onClick={close}>
          <Icon name="check" /> Fertig
        </button>
      </header>

      <div className="b-svge-main">
        <div ref={stageRef} className={`b-svge-stage${tab === 'code' ? ' is-hidden' : ''}`} onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}>
          <div ref={paperRef} className="b-svge-paper" style={{ width: paperW, height: paperH }}>
            <div ref={hostRef} className={`b-svge-host tool-${tool}`} />
            {boxes.hover && <div className="b-svge-box is-hover" style={rectStyle(boxes.hover)} />}
            {boxes.sel && <div className="b-svge-box" style={rectStyle(boxes.sel)} />}
          </div>
        </div>
        {tab === 'code' && svg && (
          <CodePane
            source={serialize(svg)}
            onApply={(src) => {
              mount(src);
              commit();
            }}
          />
        )}

        {tab === 'visual' && (
          <aside className="b-svge-side">
            {svg && sel && sel.isConnected ? (
              <Inspector
                key={pathOf(sel, svg).join('.')}
                el={sel}
                focusText={focusText === sel}
                onTextFocused={() => setFocusText(null)}
                onLive={commitSoon}
                onCommit={commit}
                actions={{ remove, duplicate, arrange, group, ungroup, parent: () => (sel.parentElement as Element | null) !== svg && setSel(sel.parentElement) }}
              />
            ) : svg ? (
              <DocumentPanel svg={svg} version={version} draw={draw} setDraw={setDraw} drawing={tool !== 'select'} onLive={commitSoon} onCommit={commit} onCrop={cropToContent} />
            ) : null}
            {svg && <Layers svg={svg} version={version} sel={sel} onSelect={setSel} onHover={setHover} />}
          </aside>
        )}
      </div>
    </div>
  );
}

const rectStyle = (r: DOMRect) => ({ left: r.x, top: r.y, width: r.width, height: r.height });

// ---------- Seitenleiste ----------

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="b-svge-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Farbe + „keine“ – value ist #rrggbb oder 'none'. */
function PaintInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const none = value === 'none';
  return (
    <Field label={label}>
      <span className="b-svge-paint">
        <input type="color" value={none ? '#000000' : toHex(value)} onChange={(e) => onChange(e.target.value)} className={none ? 'is-none' : ''} />
        <button type="button" className={`b-svg-mini${none ? ' active' : ''}`} onClick={() => onChange(none ? '#1c1c1e' : 'none')}>
          Keine
        </button>
      </span>
    </Field>
  );
}

function computedPaint(v: string): string {
  if (!v || v === 'none') return 'none';
  if (v.startsWith('url')) return 'none';
  return v;
}

interface InspectorProps {
  el: Element;
  focusText: boolean;
  onTextFocused: () => void;
  onLive: () => void;
  onCommit: () => void;
  actions: {
    remove: () => void;
    duplicate: () => void;
    arrange: (w: 'up' | 'down' | 'top' | 'bottom') => void;
    group: () => void;
    ungroup: () => void;
    parent: () => void;
  };
}

function Inspector({ el, focusText, onTextFocused, onLive, onCommit, actions }: InspectorProps) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const cs = getComputedStyle(el);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const isText = el.localName === 'text';
  const isGroup = el.localName === 'g';

  useEffect(() => {
    if (focusText && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
      onTextFocused();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei neuer Anforderung
  }, [focusText]);

  function setStyle(prop: string, value: string) {
    (el as SVGElement).style.setProperty(prop, value);
    // Auf der Gruppe gesetzte Farbe soll auch Kinder mit eigener Farbe erreichen? Nein – nur vererbte.
    rerender();
    onLive();
  }
  function setAttr(name: string, value: string) {
    el.setAttribute(name, value);
    rerender();
    onLive();
  }

  const geometry = GEOMETRY[el.localName] ?? [];

  return (
    <section className="b-svge-panel">
      <div className="b-svge-panel-head">
        <strong>{labelOf(el)}</strong>
        {el.parentElement?.localName !== 'svg' && (
          <button type="button" className="b-svg-link" onClick={actions.parent}>
            Übergeordnet
          </button>
        )}
      </div>

      {isText && (
        <Field label="Text">
          <textarea
            ref={textRef}
            rows={2}
            defaultValue={el.textContent ?? ''}
            onChange={(e) => {
              el.textContent = e.target.value;
              onLive();
            }}
          />
        </Field>
      )}

      <PaintInput label="Füllung" value={computedPaint(cs.fill)} onChange={(v) => setStyle('fill', v)} />
      {!isText && <PaintInput label="Kontur" value={computedPaint(cs.stroke)} onChange={(v) => setStyle('stroke', v)} />}
      {!isText && (
        <Field label="Strichstärke">
          <span className="b-svge-num">
            <input type="range" min={0} max={Math.max(20, parseFloat(cs.strokeWidth) * 2 || 0)} step={0.25} value={parseFloat(cs.strokeWidth) || 0} onChange={(e) => setStyle('stroke-width', e.target.value)} />
            <input type="number" min={0} step={0.5} value={r2(parseFloat(cs.strokeWidth) || 0)} onChange={(e) => setStyle('stroke-width', e.target.value)} />
          </span>
        </Field>
      )}
      {!isText && !isGroup && (
        <Field label="Linienstil">
          <select
            value={cs.strokeDasharray === 'none' || !cs.strokeDasharray ? '' : 'dash'}
            onChange={(e) => {
              const w = parseFloat(cs.strokeWidth) || 1;
              setStyle('stroke-dasharray', e.target.value === 'dash' ? `${r2(w * 4)} ${r2(w * 3)}` : e.target.value === 'dot' ? `0 ${r2(w * 2)}` : 'none');
              if (e.target.value === 'dot') setStyle('stroke-linecap', 'round');
            }}
          >
            <option value="">Durchgezogen</option>
            <option value="dash">Gestrichelt</option>
            <option value="dot">Gepunktet</option>
          </select>
        </Field>
      )}
      {isText && (
        <>
          <Field label="Schriftgröße">
            <input type="number" min={1} value={r2(parseFloat(cs.fontSize) || 16)} onChange={(e) => setStyle('font-size', `${e.target.value}px`)} />
          </Field>
          <Field label="Stil">
            <span className="b-svg-chips">
              <button type="button" className={`b-svg-mini${+cs.fontWeight >= 600 ? ' active' : ''}`} onClick={() => setStyle('font-weight', +cs.fontWeight >= 600 ? '400' : '700')}>
                <b>F</b>
              </button>
              <button type="button" className={`b-svg-mini${cs.fontStyle === 'italic' ? ' active' : ''}`} onClick={() => setStyle('font-style', cs.fontStyle === 'italic' ? 'normal' : 'italic')}>
                <i>K</i>
              </button>
              {(['start', 'middle', 'end'] as const).map((a) => (
                <button key={a} type="button" className={`b-svg-mini${cs.textAnchor === a ? ' active' : ''}`} onClick={() => setStyle('text-anchor', a)}>
                  <Icon name={a === 'start' ? 'alignLeft' : a === 'middle' ? 'alignCenter' : 'alignRight'} />
                </button>
              ))}
            </span>
          </Field>
        </>
      )}
      <Field label="Deckkraft">
        <span className="b-svge-num">
          <input type="range" min={0} max={1} step={0.05} value={parseFloat(cs.opacity)} onChange={(e) => setStyle('opacity', e.target.value)} />
          <span className="b-svg-value">{Math.round(parseFloat(cs.opacity) * 100)} %</span>
        </span>
      </Field>

      {geometry.length > 0 && (
        <div className="b-svge-geo">
          {geometry.map((a) => (
            <label key={a}>
              <span>{a}</span>
              <input type="number" step="any" value={el.getAttribute(a) ?? ''} placeholder="0" onChange={(e) => setAttr(a, e.target.value)} onBlur={onCommit} />
            </label>
          ))}
        </div>
      )}
      {el.hasAttribute('transform') && (
        <button
          type="button"
          className="b-svg-link"
          onClick={() => {
            el.removeAttribute('transform');
            rerender();
            onCommit();
          }}
        >
          Verschiebung/Drehung zurücksetzen
        </button>
      )}

      <div className="b-svge-actions">
        <button type="button" title="Ganz nach hinten" onClick={() => actions.arrange('bottom')}>
          <Icon name="arrowDown" />⁺
        </button>
        <button type="button" title="Eine Ebene nach hinten" onClick={() => actions.arrange('down')}>
          <Icon name="arrowDown" />
        </button>
        <button type="button" title="Eine Ebene nach vorne" onClick={() => actions.arrange('up')}>
          <Icon name="arrowUp" />
        </button>
        <button type="button" title="Ganz nach vorne" onClick={() => actions.arrange('top')}>
          <Icon name="arrowUp" />⁺
        </button>
        <span />
        <button type="button" title="Gruppieren (⌘G)" onClick={actions.group}>
          <Icon name="group" />
        </button>
        {isGroup && (
          <button type="button" title="Gruppe auflösen (⌘⇧G)" onClick={actions.ungroup}>
            <Icon name="ungroup" />
          </button>
        )}
        <button type="button" title="Duplizieren (⌘D)" onClick={actions.duplicate}>
          <Icon name="copy" />
        </button>
        <button type="button" className="is-danger" title="Löschen (Entf)" onClick={actions.remove}>
          <Icon name="trash" />
        </button>
      </div>
    </section>
  );
}

interface DocumentPanelProps {
  svg: SVGSVGElement;
  version: number;
  draw: DrawStyle;
  setDraw: (d: DrawStyle) => void;
  drawing: boolean;
  onLive: () => void;
  onCommit: () => void;
  onCrop: () => void;
}

function DocumentPanel({ svg, version, draw, setDraw, drawing, onLive, onCommit, onCrop }: DocumentPanelProps) {
  const palette = useMemo(() => paletteOfElement(svg), [svg, version]);
  const vb = viewBox(svg);

  function setViewBox(i: number, v: number) {
    const next = [...vb];
    next[i] = v;
    if (next[2] <= 0 || next[3] <= 0) return;
    svg.setAttribute('viewBox', next.map(r2).join(' '));
    onLive();
  }

  return (
    <section className="b-svge-panel">
      {drawing && (
        <>
          <div className="b-svge-panel-head">
            <strong>Neue Formen</strong>
          </div>
          <PaintInput label="Füllung" value={draw.fill} onChange={(fill) => setDraw({ ...draw, fill })} />
          <PaintInput label="Kontur" value={draw.stroke} onChange={(stroke) => setDraw({ ...draw, stroke })} />
          <Field label="Strichstärke">
            <input type="number" min={0} step={0.5} value={draw.width} onChange={(e) => setDraw({ ...draw, width: +e.target.value })} />
          </Field>
          <hr className="b-pop-sep" />
        </>
      )}
      <div className="b-svge-panel-head">
        <strong>Dokument</strong>
        <button type="button" className="b-svg-link" onClick={onCrop} title="viewBox eng um alle Elemente legen">
          Auf Inhalt zuschneiden
        </button>
      </div>
      <div className="b-svge-geo">
        {(['x', 'y', 'Breite', 'Höhe'] as const).map((l, i) => (
          <label key={l}>
            <span>{l}</span>
            <input type="number" step="any" value={r2(vb[i])} onChange={(e) => setViewBox(i, +e.target.value)} onBlur={onCommit} />
          </label>
        ))}
      </div>
      {palette.length > 0 && (
        <>
          <span className="b-pop-label">Farben im Dokument</span>
          <div className="b-svg-swatches">
            {palette.slice(0, 30).map((c) => (
              <label key={c} className="b-svg-swatch" title={`${c} überall ersetzen`}>
                <span style={{ background: c }} />
                <input
                  type="color"
                  value={toHex(c)}
                  onChange={(e) => {
                    recolorElement(svg, { [c]: e.target.value });
                    onLive();
                  }}
                />
              </label>
            ))}
          </div>
        </>
      )}
      <p className="b-svge-hint">
        Klicken wählt aus, Ziehen verschiebt (⇧ gerade). ⌥-Klick wählt die ganze Gruppe. Doppelklick auf Text bearbeitet ihn. ⌘/Strg + Mausrad zoomt.
      </p>
    </section>
  );
}

function Layers({ svg, version, sel, onSelect, onHover }: { svg: SVGSVGElement; version: number; sel: Element | null; onSelect: (el: Element) => void; onHover: (el: Element | null) => void }) {
  const rows = useMemo(() => {
    const out: { el: Element; depth: number }[] = [];
    const walk = (parent: Element, depth: number) => {
      // Oberste Ebene zuerst (wie in Grafikprogrammen).
      for (const el of [...parent.children].reverse()) {
        if (HIDDEN.has(el.localName) || out.length > 400) continue;
        out.push({ el, depth });
        if (el.localName === 'g' || el.localName === 'a') walk(el, depth + 1);
      }
    };
    walk(svg, 0);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version = Inhalt geändert
  }, [svg, version]);

  if (!rows.length) return <p className="b-svge-hint">Noch leer – wähle oben ein Werkzeug und zeichne.</p>;
  return (
    <section className="b-svge-layers">
      <span className="b-pop-label">Ebenen</span>
      <ul onPointerLeave={() => onHover(null)}>
        {rows.map(({ el, depth }, i) => (
          <li key={i}>
            <button type="button" className={el === sel ? 'active' : ''} style={{ paddingLeft: 8 + depth * 14 }} onClick={() => onSelect(el)} onPointerEnter={() => onHover(el)}>
              {labelOf(el)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CodePane({ source, onApply }: { source: string; onApply: (src: string) => void }) {
  const [draft, setDraft] = useState(() => pretty(source));
  const [error, setError] = useState('');
  const dirty = draft !== pretty(source);

  function apply() {
    const clean = cleanSvg(draft);
    if (!clean) return setError('Kein gültiges SVG – Änderungen nicht übernommen.');
    setError('');
    onApply(clean);
    setDraft(pretty(clean));
  }

  return (
    <div className="b-svge-code">
      <textarea
        value={draft}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            apply();
          }
          if (e.key === 'Tab') {
            e.preventDefault();
            const el = e.currentTarget;
            const { selectionStart: s, selectionEnd: end } = el;
            setDraft(draft.slice(0, s) + '  ' + draft.slice(end));
            requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
          }
        }}
      />
      <div className="b-svge-code-bar">
        {error ? <span className="b-svg-error">{error}</span> : <span className="b-svge-hint">⌘↵ übernimmt den Code. Skripte und externe Verweise werden entfernt.</span>}
        <button type="button" className="b-chip-btn" disabled={!dirty} onClick={apply}>
          <Icon name="check" /> Übernehmen
        </button>
      </div>
    </div>
  );
}

/** Einfaches Einrücken, damit der Code lesbar ist. <text>-Elemente bleiben einzeilig – Leerraum zwischen <tspan>s zählt. */
function pretty(src: string): string {
  if (/\n\s*</.test(src)) return src;
  const parts = src.split(/(<text[\s>][\s\S]*?<\/text>)/);
  const lines = parts.map((p, i) => (i % 2 ? p : p.replace(/>\s*</g, '>\n<'))).join('\n').split('\n').filter((l) => l.trim());
  let depth = 0;
  return lines
    .map((line) => {
      if (/^<\//.test(line)) depth = Math.max(0, depth - 1);
      const out = '  '.repeat(depth) + line;
      if (/^<[^/!?][^>]*[^/]>$/.test(line) && !/<\/[^>]+>$/.test(line)) depth++;
      return out;
    })
    .join('\n');
}
