import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Icon, type IconName } from '@/ui/Icon';
import { useDarkMode } from '@/hooks/useDarkMode';
import { EditedImage, type NaturalSize } from './EditedImage';
import { storeImage } from './files';
import {
  adjustments,
  cleanEdit,
  cropToSource,
  cropToView,
  fullCrop,
  isFullCrop,
  isQuarter,
  NEUTRAL,
  outputSize,
  presets,
  toSource,
  val,
  type AdjustKey,
  type CropRect,
  type ImageEdit,
  type Rotation,
} from './model';
import { canvasToBlob, loadPixels, readPixels, removeBackground, sourceCanvas, type BgOptions } from './pixels';

export interface ImageEditResult {
  src: string;
  edit: ImageEdit | null;
  alt: string;
}

interface ImageEditorProps {
  src: string;
  edit: ImageEdit | null;
  alt?: string;
  /** Tab beim Öffnen. */
  initialTab?: Tab;
  onSave: (result: ImageEditResult) => void;
  onClose: () => void;
}

type Tab = 'crop' | 'adjust' | 'filter' | 'bg';

const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'crop', label: 'Zuschneiden', icon: 'crop' },
  { id: 'adjust', label: 'Anpassen', icon: 'sliders' },
  { id: 'filter', label: 'Filter', icon: 'palette' },
  { id: 'bg', label: 'Hintergrund', icon: 'wand' },
];

const ratios: { label: string; value: number | 'free' | 'original' }[] = [
  { label: 'Frei', value: 'free' },
  { label: 'Original', value: 'original' },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:2', value: 3 / 2 },
];

/** Vollbild-Fenster zum Bearbeiten eines Bildes. Speichert erst bei „Fertig“. */
export function ImageEditor({ src: initialSrc, edit: initialEdit, alt: initialAlt = '', initialTab = 'crop', onSave, onClose }: ImageEditorProps) {
  const dark = useDarkMode();
  const [src, setSrc] = useState(initialSrc);
  const [edit, setEdit] = useState<ImageEdit>(() => ({ ...(initialEdit ?? {}) }));
  const [alt, setAlt] = useState(initialAlt);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [nat, setNat] = useState<NaturalSize | null>(null);
  const patch = (p: Partial<ImageEdit>) => setEdit((e) => ({ ...e, ...p }));

  const save = () => {
    onSave({ src, edit: cleanEdit(edit), alt });
    onClose();
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        saveRef.current();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const dirty = src !== initialSrc || alt !== initialAlt || JSON.stringify(cleanEdit(edit)) !== JSON.stringify(cleanEdit(initialEdit ?? {}));

  return createPortal(
    <motion.div className="ie-window" data-own-keys="" role="dialog" aria-modal="true" aria-label="Bild bearbeiten" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="ie-head">
        <div className="b-seg" role="tablist" aria-label="Werkzeug">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {tab === t.id && <motion.span layoutId="ie-tab-pill" className="b-seg-pill" transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }} />}
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <div className="ie-head-actions">
          <button
            type="button"
            className="b-btn"
            disabled={!cleanEdit({ ...edit, original: null }) && !edit.original}
            onClick={() => {
              if (edit.original) setSrc(edit.original);
              setEdit({});
            }}
            title="Alle Bearbeitungen verwerfen"
          >
            <Icon name="swap" /> Zurücksetzen
          </button>
          <button type="button" className="b-btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="b-btn b-btn-primary" onClick={save} disabled={!dirty}>
            <Icon name="check" /> Fertig
          </button>
        </div>
      </header>

      <div className="ie-body">
        {tab === 'crop' ? (
          <CropStage src={src} edit={edit} dark={dark} nat={nat} onNatural={setNat} onCrop={(crop) => patch({ crop })} />
        ) : tab === 'bg' ? null : (
          <PreviewStage src={src} edit={edit} dark={dark} nat={nat} onNatural={setNat} />
        )}
        {tab === 'bg' && (
          <BackgroundTool
            src={src}
            edit={edit}
            dark={dark}
            nat={nat}
            onNatural={setNat}
            onApply={(next) => {
              patch({ original: edit.original ?? src });
              setSrc(next);
            }}
            onRestore={() => {
              if (!edit.original) return;
              setSrc(edit.original);
              patch({ original: null });
            }}
          />
        )}

        {tab !== 'bg' && (
          <aside className="ie-panel">
            {tab === 'crop' && <CropPanel edit={edit} nat={nat} onPatch={patch} />}
            {tab === 'adjust' && <AdjustPanel edit={edit} onPatch={patch} />}
            {tab === 'filter' && <FilterPanel src={src} edit={edit} onPatch={patch} />}
            <label className="ie-field">
              <span>Beschreibung (Alternativtext)</span>
              <input className="b-pop-input" value={alt} placeholder="Was ist zu sehen?" onChange={(e) => setAlt(e.target.value)} />
            </label>
          </aside>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}

/** Misst die Bühne und berechnet eine Bildbreite, bei der das Bild (Seitenverhältnis `ratio`) vollständig hineinpasst. */
function useFit(ratio: number | null) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const width = ratio && box.w ? Math.max(40, Math.min(box.w, box.h * ratio)) : undefined;
  return { ref, width };
}

interface StageProps {
  src: string;
  edit: ImageEdit;
  dark: boolean;
  nat: NaturalSize | null;
  onNatural: (n: NaturalSize) => void;
}

function PreviewStage({ src, edit, dark, nat, onNatural }: StageProps) {
  const out = nat ? outputSize(nat, edit) : null;
  const { ref, width } = useFit(out ? out.w / out.h : null);
  return (
    <div className="ie-stage" ref={ref}>
      <div className="ie-canvas is-checker" style={{ width }}>
        <EditedImage src={src} edit={edit} dark={dark} onNatural={onNatural} />
      </div>
    </div>
  );
}

// ---------- Zuschneiden ----------

type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN = 0.03;

/** Gewähltes Seitenverhältnis (Breite/Höhe in Pixeln) je Bild – bleibt beim Tab-Wechsel erhalten. */
let lockedRatio: number | null = null;

function CropStage({ src, edit, dark, nat, onNatural, onCrop }: StageProps & { onCrop: (c: CropRect | null) => void }) {
  // Ansichtsgröße: das ganze Bild, gedreht.
  const view = nat ? (isQuarter(edit) ? { w: nat.h, h: nat.w } : nat) : null;
  const { ref, width } = useFit(view ? view.w / view.h : null);
  const rect = cropToView(edit.crop && !isFullCrop(edit.crop) ? edit.crop : fullCrop, edit);
  const boxRef = useRef<HTMLDivElement>(null);

  function start(e: ReactPointerEvent, handle: Handle) {
    if (!view || !boxRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const bounds = boxRef.current.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, r: rect };
    // Verhältnis im Einheitsquadrat: w/h (normiert) = Pixelverhältnis · Höhe/Breite.
    const ratio = lockedRatio ? (lockedRatio * view.h) / view.w : null;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - start.x) / bounds.width;
      const dy = (ev.clientY - start.y) / bounds.height;
      let { x, y, w, h } = start.r;
      if (handle === 'move') {
        x = Math.min(1 - w, Math.max(0, x + dx));
        y = Math.min(1 - h, Math.max(0, y + dy));
      } else {
        let l = x, t = y, r = x + w, b = y + h;
        if (handle.includes('w')) l = Math.min(r - MIN, Math.max(0, l + dx));
        if (handle.includes('e')) r = Math.max(l + MIN, Math.min(1, r + dx));
        if (handle.includes('n')) t = Math.min(b - MIN, Math.max(0, t + dy));
        if (handle.includes('s')) b = Math.max(t + MIN, Math.min(1, b + dy));
        if (ratio) {
          // Seitenverhältnis halten: die gezogene Kante bestimmt, die andere Achse folgt (Anker gegenüber).
          const horizontal = handle === 'e' || handle === 'w';
          let nw = r - l, nh = b - t;
          if (horizontal || (!['n', 's'].includes(handle) && nw / ratio >= nh)) nh = nw / ratio;
          else nw = nh * ratio;
          const ax = handle.includes('w') ? r : handle.includes('e') ? l : (l + r) / 2;
          const ay = handle.includes('n') ? b : handle.includes('s') ? t : (t + b) / 2;
          // Nicht über den Rand hinaus.
          const maxW = handle.includes('w') ? ax : handle.includes('e') ? 1 - ax : 2 * Math.min(ax, 1 - ax);
          const maxH = handle.includes('n') ? ay : handle.includes('s') ? 1 - ay : 2 * Math.min(ay, 1 - ay);
          const k = Math.min(1, maxW / nw, maxH / nh);
          nw *= k;
          nh *= k;
          l = handle.includes('w') ? ax - nw : handle.includes('e') ? ax : ax - nw / 2;
          t = handle.includes('n') ? ay - nh : handle.includes('s') ? ay : ay - nh / 2;
          r = l + nw;
          b = t + nh;
        }
        x = l;
        y = t;
        w = r - l;
        h = b - t;
      }
      onCrop(cropToSource({ x, y, w, h }, edit));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <div className="ie-stage" ref={ref}>
      <div className="ie-canvas is-checker" style={{ width }} ref={boxRef}>
        <EditedImage src={src} edit={edit} dark={dark} ignoreCrop onNatural={onNatural} />
        {view && (
          <div className="ie-crop" aria-label="Ausschnitt">
            <div
              className="ie-crop-box"
              style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}
              onPointerDown={(e) => start(e, 'move')}
            >
              <span className="ie-crop-grid" />
              {HANDLES.map((h) => (
                <span key={h} className={`ie-crop-handle is-${h}`} onPointerDown={(e) => start(e, h)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CropPanel({ edit, nat, onPatch }: { edit: ImageEdit; nat: NaturalSize | null; onPatch: (p: Partial<ImageEdit>) => void }) {
  const [ratioLabel, setRatioLabel] = useState(() => (lockedRatio ? '' : 'Frei'));
  const rot = (edit.rotate ?? 0) as Rotation;
  const view = nat ? (isQuarter(edit) ? { w: nat.h, h: nat.w } : nat) : null;

  function pickRatio(r: (typeof ratios)[number]) {
    setRatioLabel(r.label);
    if (r.value === 'free' || !view) {
      lockedRatio = null;
      return;
    }
    const pxRatio = r.value === 'original' ? view.w / view.h : r.value;
    lockedRatio = pxRatio;
    // Größtmöglicher zentrierter Ausschnitt mit diesem Verhältnis.
    const n = (pxRatio * view.h) / view.w;
    const w = n >= 1 ? 1 : n;
    const h = n >= 1 ? 1 / n : 1;
    onPatch({ crop: cropToSource({ x: (1 - w) / 2, y: (1 - h) / 2, w, h }, edit) });
  }
  useEffect(() => () => void (lockedRatio = null), []);

  const out = nat ? outputSize(nat, edit) : null;
  return (
    <>
      <section className="ie-section">
        <h4>Seitenverhältnis</h4>
        <div className="ie-chips">
          {ratios.map((r) => (
            <button key={r.label} type="button" className={`b-chip-btn${ratioLabel === r.label ? ' active' : ''}`} onClick={() => pickRatio(r)}>
              {r.label}
            </button>
          ))}
        </div>
      </section>
      <section className="ie-section">
        <h4>Drehen &amp; Spiegeln</h4>
        <div className="ie-chips">
          <button type="button" className="b-chip-btn" onClick={() => onPatch({ rotate: (((rot + 270) % 360) as Rotation) })} title="90° nach links">
            <Icon name="rotateLeft" /> Links
          </button>
          <button type="button" className="b-chip-btn" onClick={() => onPatch({ rotate: (((rot + 90) % 360) as Rotation) })} title="90° nach rechts">
            <Icon name="rotateRight" /> Rechts
          </button>
          <button type="button" className={`b-chip-btn${edit.flipH ? ' active' : ''}`} onClick={() => onPatch({ flipH: !edit.flipH })}>
            <Icon name="flipH" /> Horizontal
          </button>
          <button type="button" className={`b-chip-btn${edit.flipV ? ' active' : ''}`} onClick={() => onPatch({ flipV: !edit.flipV })}>
            <Icon name="flipV" /> Vertikal
          </button>
        </div>
      </section>
      <section className="ie-section">
        <div className="ie-row">
          <span className="ie-meta">{out ? `${Math.round(out.w)} × ${Math.round(out.h)} px` : '…'}</span>
          <button type="button" className="b-chip-btn" disabled={isFullCrop(edit.crop)} onClick={() => onPatch({ crop: null })}>
            Ganzes Bild
          </button>
        </div>
      </section>
    </>
  );
}

// ---------- Anpassen & Filter ----------

function AdjustPanel({ edit, onPatch }: { edit: ImageEdit; onPatch: (p: Partial<ImageEdit>) => void }) {
  return (
    <>
      <section className="ie-section">
        {adjustments.map((a) => {
          const v = val(edit, a.key);
          return (
            <label key={a.key} className="ie-slider">
              <span className="ie-slider-head">
                <span>{a.label}</span>
                <button type="button" className="ie-slider-value" onClick={() => onPatch({ [a.key]: NEUTRAL[a.key] })} title="Zurücksetzen" disabled={v === NEUTRAL[a.key]}>
                  {v}
                  {a.unit}
                </button>
              </span>
              <input type="range" min={a.min} max={a.max} value={v} onChange={(e) => onPatch({ [a.key]: Number(e.target.value) })} />
            </label>
          );
        })}
      </section>
      <section className="ie-section">
        <div className="ie-chips">
          <button type="button" className={`b-chip-btn${val(edit, 'invert') === 100 ? ' active' : ''}`} onClick={() => onPatch({ invert: val(edit, 'invert') === 100 ? 0 : 100 })}>
            <Icon name="invert" /> Farben umkehren
          </button>
        </div>
        <DarkInvertToggle edit={edit} onPatch={onPatch} />
      </section>
    </>
  );
}

function DarkInvertToggle({ edit, onPatch }: { edit: ImageEdit; onPatch: (p: Partial<ImageEdit>) => void }) {
  return (
    <label className="ie-check">
      <input type="checkbox" checked={!!edit.darkInvert} onChange={(e) => onPatch({ darkInvert: e.target.checked })} />
      <span>
        Im Dunkelmodus umkehren
        <small>Für Skizzen, Scans und Diagramme auf weißem Grund.</small>
      </span>
    </label>
  );
}

function FilterPanel({ src, edit, onPatch }: { src: string; edit: ImageEdit; onPatch: (p: Partial<ImageEdit>) => void }) {
  const current = presets.find((p) => (Object.keys(NEUTRAL) as AdjustKey[]).every((k) => val(edit, k) === (p.values[k] ?? NEUTRAL[k])))?.id;
  // Vorschaubilder ohne Zuschnitt/Drehung, damit sie klein und schnell bleiben.
  const thumbEdit = (values: Partial<Record<AdjustKey, number>>): ImageEdit => ({ ...values });
  return (
    <>
      <section className="ie-section">
        <div className="ie-presets">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`ie-preset${current === p.id ? ' active' : ''}`}
              onClick={() => onPatch({ ...NEUTRAL, ...p.values })}
            >
              <EditedImage src={src} edit={thumbEdit(p.values)} className="ie-preset-img" />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="ie-section">
        <DarkInvertToggle edit={edit} onPatch={onPatch} />
      </section>
    </>
  );
}

// ---------- Hintergrund ----------

interface BackgroundToolProps extends StageProps {
  onApply: (src: string) => void;
  onRestore: () => void;
}

function BackgroundTool({ src, edit, dark, nat, onNatural, onApply, onRestore }: BackgroundToolProps) {
  const [opts, setOpts] = useState<BgOptions>({ mode: 'edges', tolerance: 12, softness: 10, contiguous: true, point: null });
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const source = useRef<{ src: string; full: HTMLCanvasElement; small: ImageData } | null>(null);

  // Original einmal laden (fremde Bilder nur mit CORS lesbar).
  useEffect(() => {
    let alive = true;
    setError('');
    setPreview(null);
    source.current = null;
    loadPixels(src)
      .then((img) => {
        if (!alive) return;
        const full = sourceCanvas(img);
        const scale = Math.min(1, 900 / Math.max(full.width, full.height));
        const small = document.createElement('canvas');
        small.width = Math.max(1, Math.round(full.width * scale));
        small.height = Math.max(1, Math.round(full.height * scale));
        small.getContext('2d')!.drawImage(full, 0, 0, small.width, small.height);
        source.current = { src, full, small: readPixels(small) };
        setOpts((o) => ({ ...o }));
      })
      .catch((e: Error) => alive && setError(e.message || 'Das Bild konnte nicht gelesen werden.'));
    return () => {
      alive = false;
    };
  }, [src]);

  // Vorschau (verkleinert) bei jeder Änderung neu berechnen.
  useEffect(() => {
    const s = source.current;
    if (!s || (opts.mode === 'color' && !opts.point)) {
      setPreview(null);
      return;
    }
    const t = window.setTimeout(() => {
      const out = removeBackground(s.small, opts);
      const c = document.createElement('canvas');
      c.width = out.width;
      c.height = out.height;
      c.getContext('2d')!.putImageData(out, 0, 0);
      setPreview(c.toDataURL('image/png'));
    }, 120);
    return () => window.clearTimeout(t);
  }, [opts]);

  async function apply() {
    const s = source.current;
    if (!s) return;
    setBusy(true);
    try {
      const out = removeBackground(readPixels(s.full), opts);
      const c = document.createElement('canvas');
      c.width = out.width;
      c.height = out.height;
      c.getContext('2d')!.putImageData(out, 0, 0);
      onApply(await storeImage(await canvasToBlob(c)));
      setOpts((o) => ({ ...o, point: null }));
      setPicking(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Vorschau zeigt das ganze Bild (gedreht/gespiegelt, ohne Zuschnitt) – damit ein Klick eindeutig einem Punkt im Original entspricht.
  const view = nat ? (isQuarter(edit) ? { w: nat.h, h: nat.w } : nat) : null;
  const { ref, width } = useFit(view ? view.w / view.h : null);
  const shownEdit = useMemo(() => ({ ...edit, crop: null }), [edit]);

  return (
    <>
      <div className="ie-stage" ref={ref}>
        <div
          className={`ie-canvas is-checker${picking ? ' is-picking' : ''}`}
          style={{ width }}
          onClick={(e) => {
            if (!picking) return;
            const r = e.currentTarget.getBoundingClientRect();
            const [x, y] = toSource([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height], edit);
            setOpts((o) => ({ ...o, mode: 'color', point: { x, y } }));
          }}
        >
          <EditedImage src={preview ?? src} edit={shownEdit} dark={dark} onNatural={preview ? undefined : onNatural} />
        </div>
      </div>
      <aside className="ie-panel">
        <section className="ie-section">
          <h4>Hintergrund entfernen</h4>
          <p className="ie-hint">Macht einfarbige Hintergründe durchsichtig – ideal für Scans, Skizzen, Logos und Freisteller auf hellem Grund.</p>
          <div className="ie-chips">
            <button type="button" className={`b-chip-btn${opts.mode === 'edges' ? ' active' : ''}`} onClick={() => { setPicking(false); setOpts((o) => ({ ...o, mode: 'edges', point: null })); }}>
              <Icon name="wand" /> Automatisch
            </button>
            <button type="button" className={`b-chip-btn${opts.mode === 'color' ? ' active' : ''}`} onClick={() => { setPicking(true); setOpts((o) => ({ ...o, mode: 'color' })); }}>
              <Icon name="target" /> Farbe anklicken
            </button>
          </div>
          {opts.mode === 'color' && <p className="ie-hint">{opts.point ? 'Anderen Punkt anklicken, um die Farbe zu ändern.' : 'Klicke im Bild auf die Farbe, die verschwinden soll.'}</p>}
        </section>
        <section className="ie-section">
          <label className="ie-slider">
            <span className="ie-slider-head">
              <span>Toleranz</span>
              <span className="ie-slider-value">{opts.tolerance}</span>
            </span>
            <input type="range" min={0} max={60} value={opts.tolerance} onChange={(e) => setOpts((o) => ({ ...o, tolerance: Number(e.target.value) }))} />
          </label>
          <label className="ie-slider">
            <span className="ie-slider-head">
              <span>Weiche Kante</span>
              <span className="ie-slider-value">{opts.softness}</span>
            </span>
            <input type="range" min={0} max={40} value={opts.softness} onChange={(e) => setOpts((o) => ({ ...o, softness: Number(e.target.value) }))} />
          </label>
          <label className="ie-check">
            <input type="checkbox" checked={opts.contiguous} onChange={(e) => setOpts((o) => ({ ...o, contiguous: e.target.checked }))} />
            <span>
              Nur zusammenhängende Fläche
              <small>Aus: Die Farbe wird überall im Bild entfernt (z. B. Papierweiß zwischen Buchstaben).</small>
            </span>
          </label>
        </section>
        <section className="ie-section">
          <div className="ie-chips">
            <button type="button" className="b-btn b-btn-primary" disabled={!preview || busy} onClick={() => void apply()}>
              <Icon name={busy ? 'spinner' : 'check'} /> Übernehmen
            </button>
            {edit.original && (
              <button type="button" className="b-btn" onClick={onRestore}>
                <Icon name="swap" /> Original wiederherstellen
              </button>
            )}
          </div>
          {edit.original && <p className="ie-hint">Das Original bleibt gespeichert und lässt sich jederzeit zurückholen.</p>}
        </section>
        {error && <p className="ie-error">{error}</p>}
      </aside>
    </>
  );
}
