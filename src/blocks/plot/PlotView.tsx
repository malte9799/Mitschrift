import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, useBlockBar } from '@/editor/BlockBar';
import { compile, fmt, type Scope } from './expr';
import {
  PALETTE_SIZE,
  defaultView,
  evalAt,
  fnName,
  fromPx,
  fromPy,
  graphPath,
  niceStep,
  pointLabels,
  specialPoints,
  syncParams,
  ticks,
  toPx,
  toPy,
  zoomView,
  type Frame,
  type PlotFn,
  type PlotParam,
  type PlotView as View,
  type SpecialPoint,
} from './geometry';

const HEIGHT = 340;
const sameView = (a: View, b: View) => a.xmin === b.xmin && a.xmax === b.xmax && a.ymin === b.ymin && a.ymax === b.ymax;

export function PlotView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const fns = node.attrs.fns as PlotFn[];
  const params = node.attrs.params as PlotParam[];
  const savedView = node.attrs.view as View;
  const title = node.attrs.title as string;
  const savedPoints = node.attrs.points as boolean;
  const [showPoints, setShowPoints] = useState(savedPoints);
  useEffect(() => setShowPoints(savedPoints), [savedPoints]);
  const [editing, setEditing] = useState(false);

  // Ansicht und Reglerwerte lokal: Im Lernmodus wird damit gespielt, ohne die Notiz zu ändern.
  const [view, setView] = useState(savedView);
  useEffect(() => setView((v) => (sameView(v, savedView) ? v : savedView)), [savedView]);
  const [values, setValues] = useState<Scope>(() => Object.fromEntries(params.map((p) => [p.name, p.value])));
  useEffect(() => {
    setValues((v) => {
      const next = { ...v };
      for (const p of params) if (!(p.name in next) || editable) next[p.name] = p.value;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei geänderten gespeicherten Werten
  }, [params]);

  const compiled = useMemo(() => fns.map((f) => compile(f.expr)), [fns]);
  const usedParams = useMemo(() => [...new Set(compiled.flatMap((c) => (c.ok ? c.params : [])))].sort(), [compiled]);
  const shownParams = useMemo(() => syncParams(usedParams, params), [usedParams, params]);

  function setFns(next: PlotFn[]) {
    const names = [...new Set(next.flatMap((f) => {
      const c = compile(f.expr);
      return c.ok ? c.params : [];
    }))].sort();
    // Parameter, die gerade nicht vorkommen, behalten ihre Einstellungen (Tippfehler sollen sie nicht löschen).
    const merged = [...syncParams(names, params), ...params.filter((p) => !names.includes(p.name))];
    updateAttributes({ fns: next, params: merged });
  }

  // Reglerwerte im Bearbeiten-Modus verzögert speichern (nicht bei jedem Pixel ein Undo-Schritt).
  const commitTimer = useRef<ReturnType<typeof setTimeout>>();
  function setValue(name: string, value: number) {
    setValues((v) => ({ ...v, [name]: value }));
    if (!editable) return;
    clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      updateAttributes({ params: syncParams(usedParams, params).map((p) => (p.name === name ? { ...p, value } : p)).concat(params.filter((p) => !usedParams.includes(p.name))) });
    }, 350);
  }
  function setParamRange(name: string, patch: Partial<PlotParam>) {
    const all = [...syncParams(usedParams, params), ...params.filter((p) => !usedParams.includes(p.name))];
    updateAttributes({ params: all.map((p) => (p.name === name ? { ...p, ...patch } : p)) });
  }

  function commitView(v: View) {
    if (editable && !sameView(v, savedView)) updateAttributes({ view: v });
  }

  return (
    <NodeViewWrapper className="b-block b-plot" data-interactive="">
      {bar.render(
        <>
          <BarButton icon="target" label="Nullstellen, Extrema und Schnittpunkte markieren" text="Punkte" active={showPoints} onClick={() => updateAttributes({ points: !showPoints })} />
          <BarButton icon={editing ? 'check' : 'pencil'} label={editing ? 'Fertig' : 'Sichtbereich und Regler einstellen'} text={editing ? 'Fertig' : 'Bereiche'} active={editing} onClick={() => setEditing((e) => !e)} />
        </>,
      )}
      <div contentEditable={false}>
        <div className="b-block-head">
          <span className="b-block-badge">
            <Icon name="plot" /> Funktionsplotter
          </span>
          {!editable && (
            <div className="b-plot-head-actions">
              <button type="button" className={`b-chip-btn${showPoints ? ' active' : ''}`} onClick={() => setShowPoints(!showPoints)} title="Nullstellen, Extrema und Schnittpunkte markieren">
                <Icon name="target" /> Punkte
              </button>
            </div>
          )}
        </div>

        {editable ? (
          <input className="b-diagram-title-input" value={title} placeholder="Titel (optional)" onChange={(e) => updateAttributes({ title: e.target.value })} />
        ) : (
          title && <h4 className="b-diagram-title">{title}</h4>
        )}

        <PlotStage fns={fns} compiled={compiled} values={values} view={view} setView={setView} commitView={commitView} showPoints={showPoints} resetTo={editable ? defaultView : savedView} />

        <FunctionList fns={fns} compiled={compiled} editable={editable} onChange={setFns} />

        {shownParams.length > 0 && (
          <div className="b-plot-params">
            {shownParams.map((p) => (
              <ParamSlider key={p.name} param={p} value={values[p.name] ?? p.value} editable={editable && editing} onValue={(v) => setValue(p.name, v)} onRange={(patch) => setParamRange(p.name, patch)} />
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {editable && editing && (
            <motion.div className="b-plot-range" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
              <span>Sichtbereich</span>
              {(['xmin', 'xmax', 'ymin', 'ymax'] as const).map((k) => (
                <label key={k}>
                  {k.replace('min', ' min').replace('max', ' max')}
                  <input
                    type="number"
                    step="any"
                    value={+view[k].toPrecision(6)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (e.target.value === '' || !Number.isFinite(n)) return;
                      const next = { ...view, [k]: n };
                      if (next.xmin >= next.xmax || next.ymin >= next.ymax) return;
                      setView(next);
                      commitView(next);
                    }}
                  />
                </label>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NodeViewWrapper>
  );
}

interface StageProps {
  fns: PlotFn[];
  compiled: ReturnType<typeof compile>[];
  values: Scope;
  view: View;
  setView: (v: View) => void;
  commitView: (v: View) => void;
  showPoints: boolean;
  resetTo: View;
}

function PlotStage({ fns, compiled, values, view, setView, commitView, showPoints, resetTo }: StageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<{ px: number; py: number } | null>(null);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(200, Math.round(el.offsetWidth)));
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const frame: Frame = { view, width, height: HEIGHT };
  const active = compiled.map((c, i) => ({ c, i })).filter(({ c, i }) => c.ok && !fns[i].hidden);

  const paths = useMemo(
    () => active.map(({ c, i }) => ({ i, d: c.ok ? graphPath(c.run, values, frame) : '' })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- frame/active leiten sich aus diesen Werten ab
    [compiled, fns, values, view, width],
  );
  const points = useMemo(
    () => (showPoints ? specialPoints(active.map(({ c, i }) => ({ run: (c as { run: (s: Scope) => number }).run, index: i })), values, view) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showPoints, compiled, fns, values, view],
  );

  // ⌘/Strg + Scrollen (bzw. Trackpad-Pinch) zoomt – normales Scrollen bleibt beim Text.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let commitT: ReturnType<typeof setTimeout>;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const f: Frame = { view: viewRef.current, width: r.width, height: r.height };
      const cx = fromPx(f, e.clientX - r.left);
      const cy = fromPy(f, e.clientY - r.top);
      const next = zoomView(viewRef.current, Math.exp(e.deltaY * 0.01), cx, cy);
      setView(next);
      clearTimeout(commitT);
      commitT = setTimeout(() => commitView(next), 400);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      clearTimeout(commitT);
    };
  }, [setView, commitView]);

  /** Mausposition in Zeichenflächen-Pixeln – auch wenn die Folie (Präsentation) skaliert ist. */
  function local(e: React.PointerEvent) {
    const r = stageRef.current!.getBoundingClientRect();
    return { px: ((e.clientX - r.left) / r.width) * width, py: ((e.clientY - r.top) / r.height) * HEIGHT };
  }

  function onDown(e: React.PointerEvent) {
    if (e.button !== 0 || (e.target as Element).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { px, py } = local(e);
    drag.current = { x: px, y: py, view, moved: false };
  }
  function onMove(e: React.PointerEvent) {
    const { px, py } = local(e);
    const d = drag.current;
    if (d) {
      if (!d.moved && Math.hypot(px - d.x, py - d.y) < 3) return;
      d.moved = true;
      const dx = ((px - d.x) / width) * (d.view.xmax - d.view.xmin);
      const dy = ((py - d.y) / HEIGHT) * (d.view.ymax - d.view.ymin);
      setView({ xmin: d.view.xmin - dx, xmax: d.view.xmax - dx, ymin: d.view.ymin + dy, ymax: d.view.ymax + dy });
      setHover(null);
      return;
    }
    setHover({ px, py });
  }
  function onUp() {
    if (drag.current?.moved) commitView(viewRef.current);
    drag.current = null;
  }

  const zoom = (factor: number) => {
    const next = zoomView(view, factor);
    setView(next);
    commitView(next);
  };

  // Gitter und Achsen
  const xs = niceStep(view.xmax - view.xmin, width / 90);
  const ys = niceStep(view.ymax - view.ymin, HEIGHT / 60);
  const xTicks = ticks(view.xmin, view.xmax, xs);
  const yTicks = ticks(view.ymin, view.ymax, ys);
  const minorX = ticks(view.xmin, view.xmax, xs / 5);
  const minorY = ticks(view.ymin, view.ymax, ys / 5);
  const ax = Math.max(0, Math.min(HEIGHT, toPy(frame, 0))); // y-Pixel der x-Achse (am Rand, wenn außerhalb)
  const ay = Math.max(0, Math.min(width, toPx(frame, 0)));
  const labelY = Math.min(HEIGHT - 6, Math.max(14, ax + 15));
  const labelX = ay < 36 ? ay + 6 : ay - 6;

  // Hover: Punkt in der Nähe hat Vorrang, sonst Werte aller Funktionen an der x-Position.
  const near = hover
    ? points.find((p) => Math.hypot(toPx(frame, p.x) - hover.px, toPy(frame, p.y) - hover.py) < 10)
    : undefined;
  const hx = hover ? fromPx(frame, hover.px) : 0;
  const readings = hover && !near
    ? active
        .map(({ c, i }) => ({ i, y: c.ok ? evalAt(c.run, { ...values }, hx) : NaN }))
        .filter((r) => !Number.isNaN(r.y))
    : [];

  return (
    <div
      ref={stageRef}
      className="p-stage"
      data-interactive=""
      data-no-select-bg=""
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={() => !drag.current && setHover(null)}
      onDoubleClick={() => {
        setView(resetTo);
        commitView(resetTo);
      }}
    >
      <svg className="p-svg" viewBox={`0 0 ${width} ${HEIGHT}`} width="100%" height={HEIGHT} aria-label="Funktionsgraph">
        <g className="p-grid-minor">
          {minorX.map((x) => (
            <line key={`x${x}`} x1={toPx(frame, x)} x2={toPx(frame, x)} y1={0} y2={HEIGHT} />
          ))}
          {minorY.map((y) => (
            <line key={`y${y}`} y1={toPy(frame, y)} y2={toPy(frame, y)} x1={0} x2={width} />
          ))}
        </g>
        <g className="p-grid">
          {xTicks.map((x) => (
            <line key={`x${x}`} x1={toPx(frame, x)} x2={toPx(frame, x)} y1={0} y2={HEIGHT} />
          ))}
          {yTicks.map((y) => (
            <line key={`y${y}`} y1={toPy(frame, y)} y2={toPy(frame, y)} x1={0} x2={width} />
          ))}
        </g>
        <g className="p-axes">
          <line x1={0} x2={width} y1={ax} y2={ax} />
          <line x1={ay} x2={ay} y1={0} y2={HEIGHT} />
          <path d={`M${width - 8} ${ax - 4}L${width} ${ax}L${width - 8} ${ax + 4}`} />
          <path d={`M${ay - 4} 8L${ay} 0L${ay + 4} 8`} />
        </g>
        <g className="p-ticks">
          {xTicks.map((x) =>
            // Nicht am Rand – dort würde die Zahl abgeschnitten.
            x === 0 || toPx(frame, x) < 14 || toPx(frame, x) > width - 14 ? null : (
              <text key={`x${x}`} x={toPx(frame, x)} y={labelY} textAnchor="middle">
                {fmt(x)}
              </text>
            ),
          )}
          {yTicks.map((y) =>
            y === 0 || toPy(frame, y) < 10 || toPy(frame, y) > HEIGHT - 8 ? null : (
              <text key={`y${y}`} x={labelX} y={toPy(frame, y) + 4} textAnchor={ay < 36 ? 'start' : 'end'}>
                {fmt(y)}
              </text>
            ),
          )}
          <text x={width - 6} y={ax - 8} textAnchor="end" className="p-axis-name">
            x
          </text>
          <text x={ay + 8} y={12} className="p-axis-name">
            y
          </text>
        </g>

        {hover && !drag.current && <line className="p-cross" x1={hover.px} x2={hover.px} y1={0} y2={HEIGHT} />}

        <g className="p-graphs">
          {paths.map(({ i, d }) => (
            <path key={i} d={d} className={`p-graph p-c${fns[i].color % PALETTE_SIZE}`} />
          ))}
        </g>

        {points.map((p, k) => (
          <circle key={k} cx={toPx(frame, p.x)} cy={toPy(frame, p.y)} r={p === near ? 6 : 4} className={`p-pt p-pt-${p.kind} p-c${fns[p.fns[0]].color % PALETTE_SIZE}`} />
        ))}

        {readings.map((r) => (
          <circle key={r.i} cx={hover!.px} cy={toPy(frame, r.y)} r={4} className={`p-read p-c${fns[r.i].color % PALETTE_SIZE}`} />
        ))}
      </svg>

      {hover && !drag.current && (near || readings.length > 0) && (
        <PlotTip x={near ? toPx(frame, near.x) : hover.px} y={near ? toPy(frame, near.y) : hover.py} width={width} scaleEl={stageRef.current}>
          {near ? (
            <PointInfo p={near} fns={fns} />
          ) : (
            <>
              <span className="p-tip-x">x = {fmt(hx, 2)}</span>
              {readings.map((r) => (
                <span key={r.i} className="p-tip-row">
                  <i className={`p-dot p-c${fns[r.i].color % PALETTE_SIZE}`} />
                  {fnName(r.i)}(x) = {fmt(r.y)}
                </span>
              ))}
            </>
          )}
        </PlotTip>
      )}

      <div className="p-zoom">
        <button type="button" aria-label="Vergrößern" title="Vergrößern (⌘ + Scrollen)" onClick={() => zoom(0.7)}>
          <Icon name="plus" />
        </button>
        <button type="button" aria-label="Verkleinern" title="Verkleinern" onClick={() => zoom(1 / 0.7)}>
          <Icon name="minus" />
        </button>
        <button type="button" aria-label="Ansicht zurücksetzen" title="Zurücksetzen (Doppelklick)" onClick={() => {
          setView(resetTo);
          commitView(resetTo);
        }}>
          <Icon name="home" />
        </button>
      </div>
    </div>
  );
}

function PointInfo({ p, fns }: { p: SpecialPoint; fns: PlotFn[] }) {
  return (
    <>
      <span className="p-tip-kind">
        {pointLabels[p.kind]}
        {p.fns.map((i) => (
          <i key={i} className={`p-dot p-c${fns[i].color % PALETTE_SIZE}`} />
        ))}
      </span>
      <span className="p-tip-row is-mono">
        ({fmt(p.x)} | {fmt(p.y)})
      </span>
    </>
  );
}

/** Tooltip über der Zeichenfläche; bleibt innerhalb des Blocks. */
function PlotTip({ x, y, width, scaleEl, children }: { x: number; y: number; width: number; scaleEl: HTMLElement | null; children: React.ReactNode }) {
  const scale = scaleEl ? scaleEl.offsetWidth / width : 1;
  const right = x > width * 0.65;
  return (
    <div className={`p-tip${right ? ' is-left' : ''}`} style={{ left: x * scale, top: Math.max(8, Math.min(HEIGHT - 60, y - 20)) }}>
      {children}
    </div>
  );
}

function FunctionList({ fns, compiled, editable, onChange }: { fns: PlotFn[]; compiled: ReturnType<typeof compile>[]; editable: boolean; onChange: (f: PlotFn[]) => void }) {
  const set = (i: number, patch: Partial<PlotFn>) => onChange(fns.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const nextColor = () => {
    const used = new Set(fns.map((f) => f.color % PALETTE_SIZE));
    for (let c = 0; c < PALETTE_SIZE; c++) if (!used.has(c)) return c;
    return fns.length % PALETTE_SIZE;
  };

  return (
    <div className="b-plot-fns">
      {fns.map((f, i) => {
        const c = compiled[i];
        const error = !c.ok && f.expr.trim() ? c.error : '';
        return (
          <div key={i} className={`b-plot-fn${f.hidden ? ' is-hidden' : ''}${error ? ' has-error' : ''}`}>
            <button
              type="button"
              className={`b-plot-swatch p-c${f.color % PALETTE_SIZE}`}
              aria-label={f.hidden ? 'Einblenden' : 'Ausblenden'}
              title={f.hidden ? 'Einblenden' : 'Ausblenden'}
              onClick={() => set(i, { hidden: !f.hidden })}
            />
            <span className="b-plot-fname">{fnName(i)}(x) =</span>
            {editable ? (
              <input value={f.expr} spellCheck={false} placeholder="z. B. 2x^2 - 3x + 1" onChange={(e) => set(i, { expr: e.target.value })} />
            ) : (
              <code className="b-plot-expr">{f.expr}</code>
            )}
            {editable && (
              <>
                <button type="button" className="b-chip-btn b-plot-color" title="Farbe wechseln" aria-label="Farbe wechseln" onClick={() => set(i, { color: (f.color + 1) % PALETTE_SIZE })}>
                  <Icon name="palette" />
                </button>
                <button type="button" className="b-icon-btn" aria-label="Funktion entfernen" onClick={() => onChange(fns.filter((_, j) => j !== i))}>
                  <Icon name="x" />
                </button>
              </>
            )}
            {error && <span className="b-plot-error">{error}</span>}
          </div>
        );
      })}
      {editable && (
        <button type="button" className="b-add-btn b-add-btn-sm" onClick={() => onChange([...fns, { expr: '', color: nextColor() }])}>
          <Icon name="plus" /> Funktion
        </button>
      )}
    </div>
  );
}

function ParamSlider({ param, value, editable, onValue, onRange }: { param: PlotParam; value: number; editable: boolean; onValue: (v: number) => void; onRange: (p: Partial<PlotParam>) => void }) {
  const [playing, setPlaying] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Animation: Wert pendelt zwischen min und max – zeigt, was der Parameter bewirkt.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const span = param.max - param.min;
    let phase = Math.acos(Math.max(-1, Math.min(1, 1 - (2 * (valueRef.current - param.min)) / (span || 1))));
    let last = performance.now();
    const tick = (now: number) => {
      phase += ((now - last) / 1000) * 1.2;
      last = now;
      onValue(+(param.min + (span * (1 - Math.cos(phase))) / 2).toFixed(4));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onValue ändert sich bei jedem Render
  }, [playing, param.min, param.max]);

  return (
    <div className="b-plot-param">
      <span className="b-plot-pname">{param.name}</span>
      <button type="button" className="b-plot-play" aria-label={playing ? 'Anhalten' : 'Abspielen'} title={playing ? 'Anhalten' : 'Abspielen'} onClick={() => setPlaying((p) => !p)}>
        <Icon name={playing ? 'pause' : 'play'} />
      </button>
      {editable && <input type="number" className="b-plot-bound" step="any" value={param.min} aria-label="Minimum" onChange={(e) => e.target.value !== '' && Number(e.target.value) < param.max && onRange({ min: Number(e.target.value) })} />}
      <input
        type="range"
        className="b-plot-range-input"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(e) => {
          setPlaying(false);
          onValue(Number(e.target.value));
        }}
      />
      {editable && <input type="number" className="b-plot-bound" step="any" value={param.max} aria-label="Maximum" onChange={(e) => e.target.value !== '' && Number(e.target.value) > param.min && onRange({ max: Number(e.target.value) })} />}
      <input
        type="number"
        className="b-plot-value"
        step={param.step}
        value={+value.toFixed(3)}
        aria-label={`Wert von ${param.name}`}
        onChange={(e) => {
          if (e.target.value === '') return;
          setPlaying(false);
          onValue(Number(e.target.value));
        }}
      />
    </div>
  );
}
