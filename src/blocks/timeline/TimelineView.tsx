import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, BarSep, useBlockBar } from '@/editor/BlockBar';
import { PALETTE_SIZE } from '../plot/geometry';
import { dateRange, parseDate, parseEntries, tickLabel, yearStep, type ParsedEntry, type TimelineEntry, type TimelineLayout } from './model';
import { formatShortcut } from '@/ui/shortcut';

const layoutLabels: Record<TimelineLayout, string> = { axis: 'Achse', list: 'Liste' };

/** „15 Jahre“, „8 Monate“ – Dauer eines Zeitraums. */
function duration(e: ParsedEntry): string {
  if (e.stop === null) return '';
  const years = e.stop - e.start;
  if (years >= 1.5) return `${Math.round(years)} Jahre`;
  if (years >= 0.95) return '1 Jahr';
  const months = Math.max(1, Math.round(years * 12));
  return months === 1 ? '1 Monat' : `${months} Monate`;
}

export function TimelineView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const entries = node.attrs.entries as TimelineEntry[];
  const title = node.attrs.title as string;
  const savedLayout = node.attrs.layout as TimelineLayout;
  const [localLayout, setLocalLayout] = useState(savedLayout);
  useEffect(() => setLocalLayout(savedLayout), [savedLayout]);
  const layout = editable ? savedLayout : localLayout;
  const uid = useId();

  const [editing, setEditing] = useState(false);
  const items = useMemo(() => parseEntries(entries), [entries]);
  const [selected, setSelected] = useState(0);
  const current = items.length ? Math.min(selected, items.length - 1) : -1;

  // Lernmodus: Jahreszahlen verdecken, Klick deckt einzeln auf.
  const [quiz, setQuiz] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (editable) setQuiz(false);
  }, [editable]);
  const hidden = (e: ParsedEntry) => quiz && !revealed.has(e.index);
  const dateOf = (e: ParsedEntry) => (hidden(e) ? '?' : dateRange(e));

  const reveal = (e: ParsedEntry) => setRevealed((r) => new Set(r).add(e.index));
  /** Klick auf einen Eintrag: auswählen; im Abfrage-Modus beim zweiten Klick das Datum aufdecken. */
  function pick(i: number) {
    const e = items[i];
    if (quiz && e && i === current) reveal(e);
    setSelected(i);
  }

  return (
    <NodeViewWrapper className="b-block b-timeline" data-interactive="">
      {bar.render(
        <>
          {(Object.keys(layoutLabels) as TimelineLayout[]).map((k) => (
            <BarButton key={k} icon={k === 'axis' ? 'timelineAxis' : 'timeline'} label={layoutLabels[k]} text={layoutLabels[k]} active={k === layout} onClick={() => updateAttributes({ layout: k })} />
          ))}
          <BarSep />
          <BarButton icon={editing ? 'check' : 'pencil'} label={editing ? 'Fertig' : 'Daten bearbeiten'} text={editing ? 'Fertig' : 'Daten'} active={editing} onClick={() => setEditing((e) => !e)} />
        </>,
      )}
      <div contentEditable={false}>
        {!editable && (
          <div className="b-block-head">
            <div className="b-seg" role="tablist" aria-label="Darstellung">
              {(Object.keys(layoutLabels) as TimelineLayout[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={k === layout}
                  className={k === layout ? 'active' : ''}
                  onClick={() => setLocalLayout(k)}
                >
                  {k === layout && <motion.span layoutId={`tl-seg-${uid}`} className="b-seg-pill" transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }} />}
                  <Icon name={k === 'axis' ? 'timelineAxis' : 'timeline'} />
                  <span>{layoutLabels[k]}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`b-chip-btn${quiz ? ' active' : ''}`}
              onClick={() => {
                setQuiz((q) => !q);
                setRevealed(new Set());
              }}
              title="Jahreszahlen verdecken und selbst abfragen"
            >
              <Icon name={quiz ? 'eye' : 'quiz'} /> {quiz ? 'Aufdecken' : 'Daten verdecken'}
            </button>
          </div>
        )}

        {editable ? (
          <input className="b-diagram-title-input" value={title} placeholder="Titel (optional)" onChange={(e) => updateAttributes({ title: e.target.value })} />
        ) : (
          title && <h4 className="b-diagram-title">{title}</h4>
        )}

        <AnimatePresence initial={false}>
          {editable && editing && (
            <motion.div className="b-diagram-editor" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
              <EntriesEditor entries={entries} onChange={(next) => updateAttributes({ entries: next })} />
            </motion.div>
          )}
        </AnimatePresence>

        {items.length === 0 ? (
          <p className="b-empty">Noch keine Einträge mit gültigem Datum – über „Daten“ welche anlegen.</p>
        ) : layout === 'axis' ? (
          <>
            <AxisTimeline items={items} current={current} onSelect={pick} dateOf={dateOf} hidden={hidden} />
            <DetailCard items={items} current={current} onSelect={setSelected} dateOf={dateOf} hidden={hidden} onReveal={reveal} />
          </>
        ) : (
          <ListTimeline items={items} current={current} onSelect={pick} dateOf={dateOf} hidden={hidden} />
        )}
      </div>
    </NodeViewWrapper>
  );
}

interface ViewProps {
  items: ParsedEntry[];
  current: number;
  onSelect: (i: number) => void;
  dateOf: (e: ParsedEntry) => string;
  hidden?: (e: ParsedEntry) => boolean;
  onReveal?: (e: ParsedEntry) => void;
}

const PAD = 28;
const BAR_H = 26;
const BAR_GAP = 6;
const CARD_H = 50;
const CARD_GAP = 8;

/** Horizontale Achse: Zeiträume als Balken darüber, Ereignisse als Punkte mit Karten darunter. */
function AxisTimeline({ items, current, onSelect, dateOf, hidden }: ViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [zoom, setZoom] = useState(1);
  const anchor = useRef<number | null>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const contentW = Math.max(width, width * zoom);
  const start = Math.min(...items.map((e) => e.start));
  const end = Math.max(...items.map((e) => e.stop ?? e.start));
  const span0 = end - start || 2;
  const t0 = start - span0 * 0.03 - (end === start ? 1 : 0);
  const t1 = end + span0 * 0.03 + (end === start ? 1 : 0);
  const x = (t: number) => PAD + ((t - t0) / (t1 - t0)) * (contentW - 2 * PAD);

  // Zeiträume: Spuren, damit sich Balken (samt Beschriftung) nicht überlagern.
  const bars: { e: ParsedEntry; i: number; lane: number; left: number; w: number }[] = [];
  const barEdges: number[] = [];
  items.forEach((e, i) => {
    if (e.stop === null) return;
    const left = x(e.start);
    const w = Math.max(6, x(e.stop) - left);
    const reach = left + Math.max(w, Math.min(220, e.title.length * 7 + 20));
    let lane = barEdges.findIndex((edge) => edge + 4 <= left);
    if (lane < 0) lane = barEdges.push(0) - 1;
    barEdges[lane] = reach;
    bars.push({ e, i, lane, left, w });
  });
  const axisY = barEdges.length * (BAR_H + BAR_GAP) + (barEdges.length ? 10 : 4);

  // Ereignisse: Karten in Spuren unter der Achse.
  const cards: { e: ParsedEntry; i: number; lane: number; left: number; dot: number; w: number }[] = [];
  const cardEdges: number[] = [];
  items.forEach((e, i) => {
    if (e.stop !== null) return;
    const dot = x(e.start);
    const w = Math.max(80, Math.min(200, Math.max(e.title.length * 7.2, dateOf(e).length * 6.8) + 22));
    const left = Math.max(0, Math.min(contentW - w, dot - 14));
    let lane = cardEdges.findIndex((edge) => edge + CARD_GAP <= left);
    if (lane < 0) lane = cardEdges.push(0) - 1;
    cardEdges[lane] = left + w;
    cards.push({ e, i, lane, left, dot, w });
  });
  const cardsTop = axisY + 30;
  const height = cardsTop + cardEdges.length * (CARD_H + CARD_GAP) + 4;

  const step = yearStep(t1 - t0, contentW / 110);
  const tickList: number[] = [];
  for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) tickList.push(+t.toFixed(6));
  const now = new Date();
  const today = now.getFullYear() + (now.getMonth() + (now.getDate() - 1) / 31) / 12;

  // Beim Zoomen die Bildmitte festhalten.
  function changeZoom(next: number) {
    const el = scrollerRef.current;
    if (el) anchor.current = (el.scrollLeft + el.clientWidth / 2) / contentW;
    setZoom(Math.max(1, Math.min(40, next)));
  }
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el || anchor.current === null) return;
    el.scrollLeft = anchor.current * contentW - el.clientWidth / 2;
    anchor.current = null;
  }, [contentW]);

  // Ausgewählten Eintrag ins Bild holen (Weiter/Zurück).
  useEffect(() => {
    const el = scrollerRef.current;
    const e = items[current];
    if (!el || !e) return;
    const px = x(e.start);
    if (px < el.scrollLeft + 40 || px > el.scrollLeft + el.clientWidth - 40) el.scrollTo({ left: px - el.clientWidth / 3, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei neuer Auswahl
  }, [current]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      anchor.current = null;
      const at = (el.scrollLeft + e.clientX - r.left) / (el.scrollWidth || 1);
      setZoom((z) => {
        const next = Math.max(1, Math.min(40, z * Math.exp(-e.deltaY * 0.01)));
        requestAnimationFrame(() => {
          el.scrollLeft = at * el.scrollWidth - (e.clientX - r.left);
        });
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="tl-axis-wrap">
      <div
        ref={scrollerRef}
        className={`tl-scroller${zoom > 1 ? ' can-pan' : ''}`}
        data-no-select-bg=""
        onPointerDown={(e) => {
          if (e.button !== 0 || zoom <= 1) return;
          drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (!d.moved && Math.abs(e.clientX - d.x) < 4) return;
          if (!d.moved) e.currentTarget.setPointerCapture(e.pointerId);
          d.moved = true;
          e.currentTarget.scrollLeft = d.left - (e.clientX - d.x);
        }}
        onPointerUp={() => {
          setTimeout(() => (drag.current = null));
        }}
        onClickCapture={(e) => {
          // Nach dem Ziehen keinen Eintrag auswählen.
          if (drag.current?.moved) e.stopPropagation();
        }}
      >
        <motion.div className="tl-canvas" style={{ width: contentW, height }} initial="hidden" animate="shown" transition={{ staggerChildren: 0.04 }}>
          {tickList.map((t) => (
            <div key={t} className="tl-tick" style={{ left: x(t), top: axisY }}>
              <span>{tickLabel(t, step)}</span>
            </div>
          ))}
          {today > t0 && today < t1 && <div className="tl-today" style={{ left: x(today), height }} title="Heute" />}
          <motion.div className="tl-axis-line" style={{ top: axisY, left: PAD - 8, width: contentW - 2 * PAD + 16 }} variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />

          {bars.map(({ e, i, lane, left, w }) => (
            <motion.button
              key={`b${e.index}`}
              type="button"
              className={`tl-bar p-c${e.color % PALETTE_SIZE}${i === current ? ' is-current' : ''}`}
              style={{ left, width: w, top: lane * (BAR_H + BAR_GAP) + 2, height: BAR_H }}
              variants={{ hidden: { opacity: 0, scaleX: 0.6 }, shown: { opacity: 1, scaleX: 1 } }}
              onClick={() => onSelect(i)}
              title={`${dateOf(e)} · ${e.title}`}
            >
              <span className="tl-bar-label">{e.title}</span>
            </motion.button>
          ))}
          {bars.map(({ e, left, w }) => (
            <span key={`s${e.index}`} className={`tl-axis-seg p-c${e.color % PALETTE_SIZE}`} style={{ left, width: w, top: axisY }} />
          ))}

          {cards.map(({ e, i, lane, left, dot, w }) => {
            const top = cardsTop + lane * (CARD_H + CARD_GAP);
            return (
              <motion.div key={`c${e.index}`} variants={{ hidden: { opacity: 0, y: -6 }, shown: { opacity: 1, y: 0 } }}>
                <span className={`tl-stem p-c${e.color % PALETTE_SIZE}`} style={{ left: dot, top: axisY, height: top - axisY }} />
                <span className={`tl-dot p-c${e.color % PALETTE_SIZE}${i === current ? ' is-current' : ''}`} style={{ left: dot, top: axisY }} />
                <button type="button" className={`tl-card p-c${e.color % PALETTE_SIZE}${i === current ? ' is-current' : ''}`} style={{ left, top, width: w, height: CARD_H }} onClick={() => onSelect(i)}>
                  <span className={`tl-card-date${hidden?.(e) ? ' is-hidden' : ''}`}>{dateOf(e)}</span>
                  <span className="tl-card-title">{e.title || '—'}</span>
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
      <div className="tl-zoom">
        <button type="button" aria-label="Hineinzoomen" title={formatShortcut('Hineinzoomen (⌘ + Scrollen)')} onClick={() => changeZoom(zoom * 1.6)}>
          <Icon name="plus" />
        </button>
        <button type="button" aria-label="Herauszoomen" title="Herauszoomen" disabled={zoom <= 1} onClick={() => changeZoom(zoom / 1.6)}>
          <Icon name="minus" />
        </button>
      </div>
    </div>
  );
}

/** Beschreibung des gewählten Eintrags mit Weiter/Zurück. */
function DetailCard({ items, current, onSelect, dateOf, hidden, onReveal }: ViewProps) {
  const e = items[current];
  if (!e) return null;
  return (
    <div className={`tl-detail p-c${e.color % PALETTE_SIZE}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={e.index} className="tl-detail-body" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
          {hidden?.(e) ? (
            <button type="button" className="tl-detail-reveal" onClick={() => onReveal?.(e)}>
              <Icon name="eye" /> Wann war das? – aufdecken
            </button>
          ) : (
            <span className="tl-detail-date">
              {dateOf(e)}
              {e.stop !== null && <em> · {duration(e)}</em>}
            </span>
          )}
          <strong>{e.title}</strong>
          {e.text && <p>{e.text}</p>}
        </motion.div>
      </AnimatePresence>
      <div className="tl-detail-nav">
        <button type="button" className="b-btn" aria-label="Vorheriger Eintrag" disabled={current <= 0} onClick={() => onSelect(current - 1)}>
          <Icon name="arrowLeft" />
        </button>
        <span>
          {current + 1} / {items.length}
        </span>
        <button type="button" className="b-btn" aria-label="Nächster Eintrag" disabled={current >= items.length - 1} onClick={() => onSelect(current + 1)}>
          <Icon name="arrowRight" />
        </button>
      </div>
    </div>
  );
}

/** Senkrechte Liste – für viel Text oder schmale Fenster. */
function ListTimeline({ items, current, onSelect, dateOf, hidden }: ViewProps) {
  return (
    <motion.ol className="tl-list" initial="hidden" animate="shown" transition={{ staggerChildren: 0.07 }}>
      {items.map((e, i) => (
        <motion.li
          key={e.index}
          className={`tl-li p-c${e.color % PALETTE_SIZE}${e.stop !== null ? ' is-period' : ''}${i === current ? ' is-current' : ''}`}
          variants={{ hidden: { opacity: 0, x: -10 }, shown: { opacity: 1, x: 0 } }}
          onClick={() => onSelect(i)}
        >
          <span className={`tl-li-date${hidden?.(e) ? ' is-hidden' : ''}`}>
            {dateOf(e)}
            {e.stop !== null && dateOf(e) !== '?' && <em>{duration(e)}</em>}
          </span>
          <span className="tl-li-rail">
            <span className="tl-li-dot" />
          </span>
          <span className="tl-li-body">
            <strong>{e.title}</strong>
            {e.text && <span>{e.text}</span>}
          </span>
        </motion.li>
      ))}
    </motion.ol>
  );
}

function EntriesEditor({ entries, onChange }: { entries: TimelineEntry[]; onChange: (e: TimelineEntry[]) => void }) {
  const set = (i: number, patch: Partial<TimelineEntry>) => onChange(entries.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const invalid = (s: string | undefined, optional: boolean) => (s?.trim() ? parseDate(s) === null && !/[–—]|\s-\s|^\d{3,4}-\d{3,4}$|\bbis\b/.test(s) : !optional);

  return (
    <div className="b-diagram-items tl-edit">
      <p className="tl-edit-hint">
        Datum z. B. <code>1492</code>, <code>14.07.1789</code>, <code>März 2024</code>, <code>44 v. Chr.</code> · mit „bis“ wird es ein Zeitraum.
      </p>
      {entries.map((e, i) => (
        <div key={i} className="tl-edit-row">
          <button type="button" className={`b-plot-swatch p-c${e.color % PALETTE_SIZE}`} aria-label="Farbe wechseln" title="Farbe wechseln" onClick={() => set(i, { color: (e.color + 1) % PALETTE_SIZE })} />
          <input className={invalid(e.date, false) ? 'is-invalid' : ''} value={e.date} placeholder="Datum" title={invalid(e.date, false) ? 'Datum nicht erkannt' : undefined} onChange={(ev) => set(i, { date: ev.target.value })} />
          <input className={invalid(e.end, true) ? 'is-invalid' : ''} value={e.end ?? ''} placeholder="bis (optional)" onChange={(ev) => set(i, { end: ev.target.value })} />
          <input value={e.title} placeholder="Titel" onChange={(ev) => set(i, { title: ev.target.value })} />
          <button type="button" className="b-icon-btn" aria-label="Eintrag entfernen" onClick={() => onChange(entries.filter((_, j) => j !== i))}>
            <Icon name="x" />
          </button>
          <input className="tl-edit-text" value={e.text} placeholder="Beschreibung (optional)" onChange={(ev) => set(i, { text: ev.target.value })} />
        </div>
      ))}
      <div className="tl-edit-actions">
        <button type="button" className="b-add-btn" onClick={() => onChange([...entries, { date: '', title: '', text: '', color: entries.length % PALETTE_SIZE }])}>
          <Icon name="plus" /> Eintrag hinzufügen
        </button>
        <button
          type="button"
          className="b-chip-btn"
          onClick={() => onChange([...entries].sort((a, b) => (parseDate(a.date) ?? Infinity) - (parseDate(b.date) ?? Infinity)))}
        >
          <Icon name="sortAsc" /> Nach Datum sortieren
        </button>
      </div>
    </div>
  );
}
