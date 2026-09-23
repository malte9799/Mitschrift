import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import type { Note, Tag } from '@/storage';
import type { LayoutContext } from './AppLayout';
import { graphEdges, noteHref, type GraphEdge } from './noteLinks';

interface SimNode {
  id: string;
  note: Note;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  degree: number;
  /** Beim Ziehen festgehalten. */
  fixed: boolean;
}

interface View {
  x: number;
  y: number;
  k: number;
}

const OPTIONS_KEY = 'mitschrift-graph-options';

interface GraphOptions {
  showChildren: boolean;
  showOrphans: boolean;
  showLabels: boolean;
}

function loadOptions(): GraphOptions {
  const fallback = { showChildren: true, showOrphans: true, showLabels: true };
  try {
    return { ...fallback, ...(JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? '{}') as Partial<GraphOptions>) };
  } catch {
    return fallback;
  }
}

/** Obsidian-artige Übersicht: Notizen als Punkte, Links und Unterseiten als Verbindungen. */
export function GraphPage() {
  const notes = useNotes();
  const tags = useTags();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useOutletContext<LayoutContext>();
  const [options, setOptions] = useState(loadOptions);
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = 'Graph – Mitschrift';
  }, []);

  function toggle(key: keyof GraphOptions) {
    setOptions((o) => {
      const next = { ...o, [key]: !o[key] };
      try {
        localStorage.setItem(OPTIONS_KEY, JSON.stringify(next));
      } catch {
        /* ignorieren */
      }
      return next;
    });
  }

  const data = useMemo(() => {
    if (!notes) return null;
    let edges = graphEdges(notes);
    if (!options.showChildren) edges = edges.filter((e) => e.kind !== 'child');
    const connected = new Set(edges.flatMap((e) => [e.source, e.target]));
    const visible = options.showOrphans ? notes : notes.filter((n) => connected.has(n.id));
    return { notes: visible, edges };
  }, [notes, options.showChildren, options.showOrphans]);

  const linkCount = data?.edges.filter((e) => e.kind === 'link').length ?? 0;
  const childCount = data?.edges.filter((e) => e.kind === 'child').length ?? 0;

  return (
    <div className="graph-screen">
      <header className="note-bar graph-bar">
        <div className="note-bar-left">
          <button type="button" className="icon-btn" onClick={toggleSidebar} aria-label={sidebarOpen ? 'Seitenleiste ausblenden' : 'Seitenleiste einblenden'}>
            <Icon name="menu" />
          </button>
          <h1 className="graph-title">Graph</h1>
          {data && (
            <span className="graph-stats">
              {data.notes.length} Notizen · {linkCount} Links · {childCount} Unterseiten
            </span>
          )}
        </div>
      </header>
      <div className="graph-controls">
        <label className="graph-search">
          <Icon name="search" />
          <input value={query} placeholder="Hervorheben …" onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="graph-toggles">
          <GraphToggle on={options.showChildren} onClick={() => toggle('showChildren')} label="Unterseiten" swatch="child" />
          <GraphToggle on={options.showOrphans} onClick={() => toggle('showOrphans')} label="Ohne Verbindung" />
          <GraphToggle on={options.showLabels} onClick={() => toggle('showLabels')} label="Titel" />
        </div>
      </div>
      {data && data.notes.length === 0 ? (
        <p className="graph-empty">Noch keine verbundenen Notizen. Tippe „[[“ in einer Notiz, um eine andere zu verlinken.</p>
      ) : (
        data && (
          <GraphCanvas
            notes={data.notes}
            edges={data.edges}
            tags={tags ?? []}
            query={query}
            showLabels={options.showLabels}
            onOpen={(id) => navigate(noteHref(id))}
          />
        )
      )}
    </div>
  );
}

function GraphToggle({ on, onClick, label, swatch }: { on: boolean; onClick: () => void; label: string; swatch?: 'child' }) {
  return (
    <button type="button" className={`graph-toggle${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick}>
      {swatch && <span className={`graph-swatch is-${swatch}`} aria-hidden="true" />}
      {label}
    </button>
  );
}

interface CanvasProps {
  notes: Note[];
  edges: GraphEdge[];
  tags: Tag[];
  query: string;
  showLabels: boolean;
  onOpen: (id: string) => void;
}

function GraphCanvas({ notes, edges, tags, query, showLabels, onOpen }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(new Map<string, SimNode>());
  const edgesRef = useRef<GraphEdge[]>([]);
  const viewRef = useRef<View>({ x: 0, y: 0, k: 1 });
  const alphaRef = useRef(1);
  const hoverRef = useRef<string | null>(null);
  const frameRef = useRef(0);
  // Werte, die die Zeichenschleife liest, ohne neu gestartet zu werden.
  const propsRef = useRef({ query, showLabels, tags, onOpen });
  propsRef.current = { query, showLabels, tags, onOpen };
  const [hoverNote, setHoverNote] = useState<Note | null>(null);

  // Daten → Simulationsknoten; bestehende Knoten behalten ihre Position.
  useEffect(() => {
    const prev = nodesRef.current;
    const next = new Map<string, SimNode>();
    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    notes.forEach((note, i) => {
      const d = degree.get(note.id) ?? 0;
      const old = prev.get(note.id);
      // Neue Knoten auf einer Spirale verteilen, damit die Simulation nicht aus einem Punkt explodiert.
      const angle = i * 2.39996;
      const dist = 30 * Math.sqrt(i + 1);
      next.set(note.id, {
        id: note.id,
        note,
        x: old?.x ?? Math.cos(angle) * dist,
        y: old?.y ?? Math.sin(angle) * dist,
        vx: old?.vx ?? 0,
        vy: old?.vy ?? 0,
        r: 4 + Math.sqrt(d) * 2.2,
        degree: d,
        fixed: false,
      });
    });
    nodesRef.current = next;
    const nextEdges = edges.filter((e) => next.has(e.source) && next.has(e.target));
    const signature = (m: Map<string, unknown>, es: GraphEdge[]) => [...m.keys()].sort().join() + '|' + es.map((e) => `${e.source}>${e.target}`).sort().join();
    // Nur wenn sich Knoten oder Kanten wirklich ändern, neu anstoßen – Tippen in einer Notiz soll nichts wackeln lassen.
    if (signature(prev, edgesRef.current) !== signature(next, nextEdges)) alphaRef.current = Math.max(alphaRef.current, prev.size ? 0.4 : 1);
    edgesRef.current = nextEdges;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start ist stabil (liest nur Refs)
  }, [notes, edges]);

  // Hervorhebung/Titel geändert: nur neu zeichnen.
  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, showLabels, tags]);

  // Neu zeichnen, wenn das Farbschema wechselt.
  useEffect(() => {
    const obs = new MutationObserver(() => start());
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => start();
    mq.addEventListener('change', onMq);
    return () => {
      obs.disconnect();
      mq.removeEventListener('change', onMq);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tick() {
    const nodes = [...nodesRef.current.values()];
    const alpha = alphaRef.current;
    const n = nodes.length;
    // Abstoßung zwischen allen Paaren (bei Schul-Notizen reicht O(n²)).
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 === 0) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d2 = dx * dx + dy * dy;
        }
        if (d2 > 640_000) continue;
        // Kraft ∝ 1/d (wie d3-force manyBody).
        const f = (-70 * alpha) / Math.max(d2, 100);
        const fx = dx * f;
        const fy = dy * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }
    // Federn entlang der Verbindungen.
    for (const e of edgesRef.current) {
      const a = nodesRef.current.get(e.source)!;
      const b = nodesRef.current.get(e.target)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const rest = e.kind === 'child' ? 85 : 120;
      const k = ((d - rest) / d) * 0.08 * alpha * (e.kind === 'child' ? 1.3 : 1);
      const bias = a.degree / (a.degree + b.degree || 1);
      b.vx -= dx * k * bias;
      b.vy -= dy * k * bias;
      a.vx += dx * k * (1 - bias);
      a.vy += dy * k * (1 - bias);
    }
    // Leichter Zug zur Mitte, damit lose Notizen nicht davontreiben.
    for (const node of nodes) {
      node.vx -= node.x * 0.004 * alpha;
      node.vy -= node.y * 0.004 * alpha;
      if (node.fixed) {
        node.vx = node.vy = 0;
        continue;
      }
      node.vx *= 0.6;
      node.vy *= 0.6;
      node.x += node.vx;
      node.y += node.vy;
    }
    alphaRef.current = alpha + (0 - alpha) * 0.0228;
  }

  function fit() {
    const canvas = canvasRef.current;
    const nodes = [...nodesRef.current.values()];
    if (!canvas || nodes.length === 0) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    const k = Math.min(1.25, Math.max(0.2, Math.min((w - 120) / (maxX - minX || 1), (h - 120) / (maxY - minY || 1))));
    viewRef.current = { k, x: w / 2 - ((minX + maxX) / 2) * k, y: h / 2 - ((minY + maxY) / 2) * k };
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const css = getComputedStyle(canvas);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const ink = color('--ink');
    const inkSoft = color('--ink-soft');
    const line = color('--graph-edge');
    const accent = color('--accent');
    const nodeFill = color('--graph-node');

    const { query, showLabels, tags } = propsRef.current;
    const tagColor = new Map(tags.map((t) => [t.id, color(`--tag-${t.color}`)]));
    const q = query.trim().toLowerCase();
    const hover = hoverRef.current;
    const neighbors = new Set<string>();
    if (hover) {
      neighbors.add(hover);
      for (const e of edgesRef.current) {
        if (e.source === hover) neighbors.add(e.target);
        if (e.target === hover) neighbors.add(e.source);
      }
    }
    const matches = (n: SimNode) => !q || (n.note.title || 'Ohne Titel').toLowerCase().includes(q);
    const dimmed = (n: SimNode) => (hover ? !neighbors.has(n.id) : !matches(n));

    const { x: vx, y: vy, k } = viewRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.translate(vx, vy);
    ctx.scale(k, k);

    // Kanten
    for (const e of edgesRef.current) {
      const a = nodesRef.current.get(e.source)!;
      const b = nodesRef.current.get(e.target)!;
      const lit = hover && (e.source === hover || e.target === hover);
      const faded = hover ? !lit : q ? !(matches(a) || matches(b)) : false;
      ctx.globalAlpha = faded ? 0.12 : lit ? 1 : 0.55;
      ctx.strokeStyle = lit ? accent : line;
      ctx.lineWidth = (lit ? 1.6 : 1) / Math.sqrt(k);
      ctx.setLineDash(e.kind === 'child' ? [4 / k, 3 / k] : []);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      // Pfeilspitze für Links (Richtung: verlinkende → verlinkte Notiz).
      if (e.kind === 'link' && k > 0.5) {
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const tipX = b.x - Math.cos(ang) * (b.r + 2);
        const tipY = b.y - Math.sin(ang) * (b.r + 2);
        const size = 5 / Math.sqrt(k);
        ctx.setLineDash([]);
        ctx.fillStyle = lit ? accent : line;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - Math.cos(ang - 0.45) * size, tipY - Math.sin(ang - 0.45) * size);
        ctx.lineTo(tipX - Math.cos(ang + 0.45) * size, tipY - Math.sin(ang + 0.45) * size);
        ctx.fill();
      }
    }
    ctx.setLineDash([]);

    // Knoten
    const nodes = [...nodesRef.current.values()];
    for (const n of nodes) {
      const faded = dimmed(n);
      ctx.globalAlpha = faded ? 0.2 : 1;
      const tag = n.note.tags.map((t) => tagColor.get(t)).find(Boolean);
      ctx.fillStyle = n.id === hover ? accent : tag ?? nodeFill;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      if (q && matches(n) && !hover) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2 / k;
        ctx.stroke();
      }
    }

    // Titel: ab einer Zoomstufe alle, sonst nur hervorgehobene.
    const labelAll = showLabels && k > 0.7;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const fontSize = 12 / Math.min(k, 1.4);
    ctx.font = `500 ${fontSize}px ${color('--sans') || 'system-ui'}`;
    for (const n of nodes) {
      const focus = n.id === hover || (hover && neighbors.has(n.id)) || (q && matches(n));
      if (!focus && !labelAll) continue;
      const faded = dimmed(n);
      ctx.globalAlpha = faded ? 0.18 : focus ? 1 : Math.min(1, (k - 0.7) * 3);
      ctx.fillStyle = n.id === hover ? ink : inkSoft;
      const title = n.note.title || 'Ohne Titel';
      ctx.fillText(title.length > 32 ? `${title.slice(0, 30)}…` : title, n.x, n.y + n.r + 4 / k);
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    frameRef.current = 0;
    if (alphaRef.current > 0.005) tick();
    draw();
    if (alphaRef.current > 0.005) frameRef.current = requestAnimationFrame(loop);
  }

  function start() {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(loop);
  }

  // Erstes Layout ohne sichtbares Zappeln vorrechnen, dann einpassen.
  useEffect(() => {
    for (let i = 0; i < 300 && alphaRef.current > 0.02; i++) tick();
    fit();
    start();
    const ro = new ResizeObserver(() => start());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Interaktion: Zoomen, Verschieben, Knoten ziehen, Klicken ----------

  function toWorld(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x, y, k } = viewRef.current;
    return { x: (clientX - rect.left - x) / k, y: (clientY - rect.top - y) / k };
  }

  function nodeAt(clientX: number, clientY: number): SimNode | null {
    const p = toWorld(clientX, clientY);
    const slop = 4 / viewRef.current.k;
    let best: SimNode | null = null;
    let bestD = Infinity;
    for (const n of nodesRef.current.values()) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d <= n.r + slop && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  const drag = useRef<{ node: SimNode | null; startX: number; startY: number; lastX: number; lastY: number; moved: boolean } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const node = nodeAt(e.clientX, e.clientY);
    if (node) node.fixed = true;
    drag.current = { node, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) {
      const node = nodeAt(e.clientX, e.clientY);
      if ((node?.id ?? null) !== hoverRef.current) {
        hoverRef.current = node?.id ?? null;
        setHoverNote(node?.note ?? null);
        start();
      }
      return;
    }
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 3) d.moved = true;
    if (d.node) {
      const p = toWorld(e.clientX, e.clientY);
      d.node.x = p.x;
      d.node.y = p.y;
      alphaRef.current = Math.max(alphaRef.current, 0.3);
    } else {
      viewRef.current.x += e.clientX - d.lastX;
      viewRef.current.y += e.clientY - d.lastY;
    }
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    start();
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.node) d.node.fixed = false;
    if (d.node && !d.moved) propsRef.current.onOpen(d.node.id);
  }

  // Wheel als nativer Listener, damit preventDefault (kein Seiten-Scroll/Browser-Zoom) greift.
  useEffect(() => {
    const canvas = canvasRef.current!;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const v = viewRef.current;
      // Wie in Obsidian: Scrollen zoomt zum Mauszeiger, Verschieben per Ziehen. Trackpad-Pinch kommt als ctrl+wheel.
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const k = Math.min(4, Math.max(0.15, v.k * Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015))));
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      v.x = mx - ((mx - v.x) / v.k) * k;
      v.y = my - ((my - v.y) / v.k) * k;
      v.k = k;
      start();
    }
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function zoomBy(factor: number) {
    const canvas = canvasRef.current!;
    const v = viewRef.current;
    const k = Math.min(4, Math.max(0.15, v.k * factor));
    const mx = canvas.clientWidth / 2;
    const my = canvas.clientHeight / 2;
    v.x = mx - ((mx - v.x) / v.k) * k;
    v.y = my - ((my - v.y) / v.k) * k;
    v.k = k;
    start();
  }

  return (
    <div className="graph-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={`graph-canvas${hoverNote ? ' is-hovering' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          if (drag.current) return;
          hoverRef.current = null;
          setHoverNote(null);
          start();
        }}
        role="img"
        aria-label={`Graph mit ${notes.length} Notizen und ${edges.length} Verbindungen`}
      />
      <div className="graph-zoom">
        <button type="button" aria-label="Vergrößern" onClick={() => zoomBy(1.3)}>
          <Icon name="plus" />
        </button>
        <button type="button" aria-label="Verkleinern" onClick={() => zoomBy(1 / 1.3)}>
          <span className="graph-minus" />
        </button>
        <button
          type="button"
          aria-label="Alles einpassen"
          title="Alles einpassen"
          onClick={() => {
            fit();
            start();
          }}
        >
          <Icon name="expand" />
        </button>
      </div>
      <div className="graph-legend" aria-hidden="true">
        <span>
          <i className="graph-swatch is-link" /> Link
        </span>
        <span>
          <i className="graph-swatch is-child" /> Unterseite
        </span>
      </div>
      {hoverNote && <div className="graph-hover">{hoverNote.title || 'Ohne Titel'}</div>}
      {/* Zugängliche Alternative zum Canvas: alle Notizen als Liste. */}
      <ul className="sr-only">
        {notes.map((n) => (
          <li key={n.id}>
            <a href={noteHref(n.id)} onClick={(e) => (e.preventDefault(), onOpen(n.id))}>
              {n.title || 'Ohne Titel'}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
