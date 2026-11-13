import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon, type IconName } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, BarSep, useBarSubmenu, useBlockBar } from '@/editor/BlockBar';
import { getBlockSelection } from '@/editor/BlockSelection';
import { convertToGallery } from '@/editor/convertToGallery';
import { useDarkMode } from '@/hooks/useDarkMode';
import { applyStyle, cleanSvg, contentStyleOf, paletteOf, sizeOf, svgDataUrl, toHex } from './model';
import { svgAttrs, type SvgAlign } from './SvgNode';
import { convertSvgToWhiteboard } from './toWhiteboard';


const aligns: { id: SvgAlign; icon: IconName; label: string }[] = [
  { id: 'floatLeft', icon: 'floatLeft', label: 'Links, Text umfließt' },
  { id: 'left', icon: 'alignLeft', label: 'Links' },
  { id: 'center', icon: 'alignCenter', label: 'Zentriert' },
  { id: 'right', icon: 'alignRight', label: 'Rechts' },
  { id: 'floatRight', icon: 'floatRight', label: 'Rechts, Text umfließt' },
];

const backgrounds: { id: string; label: string }[] = [
  { id: '', label: 'Keiner' },
  { id: 'card', label: 'Karte' },
  { id: 'grid', label: 'Kariert' },
  { id: 'dots', label: 'Punkte' },
  { id: '#ffffff', label: 'Weiß' },
];

/** Schnellfarben – Theme-Töne in fester Form, damit sie im SVG (als Bild) funktionieren. */
const quickColors = ['#1c1c1e', '#6e6e73', '#5b5bd6', '#1f6fd1', '#1f8a4c', '#b8650a', '#d93a2b', '#8250df', '#ffffff'];

const isColor = (bg: string) => bg.startsWith('#');

export function SvgView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const dark = useDarkMode();
  const a = node.attrs;
  const source = a.svg as string;
  const align = a.align as SvgAlign;
  const width = a.width as number | null;
  const background = a.background as string;
  const caption = a.caption as string | null;
  const style = contentStyleOf(a);

  const rendered = useMemo(() => (source ? applyStyle(source, style) : ''), [source, JSON.stringify(style)]);
  const src = useMemo(() => (rendered ? svgDataUrl(rendered) : ''), [rendered]);
  const natural = useMemo(() => (rendered ? sizeOf(rendered) : { width: 0, height: 0 }), [rendered]);

  const styleMenu = useBarSubmenu(editor, { icon: 'palette', label: 'Stil', text: 'Stil', popoverClassName: 'b-svg-pop', popoverAlign: 'end' });
  /** „Bearbeiten“ = in ein Whiteboard umwandeln (Excalidraw), mit dem SVG so, wie es gerade aussieht. */
  const toWhiteboard = (svg = rendered) => void convertSvgToWhiteboard(editor, getPos, svg);
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const shownWidth = liveWidth ?? width;

  /** Breite per Ziehen am Griff – in % der Spalte, bei Zentriert symmetrisch. */
  function startResize(e: React.PointerEvent, side: 'left' | 'right') {
    e.preventDefault();
    e.stopPropagation();
    const column = wrapRef.current?.parentElement;
    const frame = frameRef.current;
    if (!column || !frame) return;
    const colW = column.getBoundingClientRect().width;
    const r = frame.getBoundingClientRect();
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    let last = width ?? Math.min(100, (r.width / colW) * 100);
    const move = (ev: PointerEvent) => {
      let px: number;
      if (align === 'center') px = Math.abs(ev.clientX - (r.left + r.width / 2)) * 2;
      else px = side === 'right' ? ev.clientX - r.left : r.right - ev.clientX;
      last = Math.round(Math.max(8, Math.min(100, (px / colW) * 100)));
      setLiveWidth(last);
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      setLiveWidth(null);
      updateAttributes({ width: last });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  function toGallery() {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    const sel = getBlockSelection(editor.state);
    // Mehrere markierte Bild-/SVG-Blöcke: alle zusammen in eine Galerie, sonst nur dieser hier.
    convertToGallery(editor, sel.includes(pos) ? sel : [pos]);
  }

  const floating = align === 'floatLeft' || align === 'floatRight';
  const invert = dark && a.dark === 'invert';
  const bgStyle: CSSProperties = {
    padding: a.padding ? `${a.padding}px` : undefined,
    background: isColor(background) ? background : undefined,
  };
  const frameStyle: CSSProperties = {
    ...bgStyle,
    width: shownWidth != null && !floating ? `${shownWidth}%` : undefined,
    opacity: a.opacity !== 1 ? (a.opacity as number) : undefined,
  };
  // Ohne feste Breite: natürliche Größe, aber nie breiter als die Spalte.
  const imgStyle: CSSProperties = shownWidth == null && !floating ? { width: natural.width || undefined } : {};

  if (!source) {
    return (
      <NodeViewWrapper className="b-svg b-svg-is-empty" data-interactive="">
        <SvgEmpty editable={editable} onSvg={(svg) => updateAttributes(svgAttrs(svg))} onBlank={() => toWhiteboard('')} />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      ref={wrapRef}
      className={`b-svg align-${align}${bar.active ? ' is-selected' : ''}`}
      style={floating ? { width: `${shownWidth ?? 40}%` } : undefined}
      data-interactive=""
    >
      {bar.render(
        <>
          {aligns.map((al) => (
            <BarButton key={al.id} icon={al.icon} label={al.label} active={align === al.id} onClick={() => updateAttributes({ align: al.id })} />
          ))}
          <BarSep />
          {styleMenu.button}
          <BarButton icon="caption" label="Beschriftung" active={caption !== null} onClick={() => updateAttributes({ caption: caption === null ? '' : null })} />
          <BarButton icon="pencil" label="Im Whiteboard bearbeiten (Doppelklick) – wird dabei zum Whiteboard" text="Bearbeiten" onClick={() => toWhiteboard()} />
          <BarSep />
          <BarButton
            icon="gallery"
            label={getBlockSelection(editor.state).length > 1 ? 'Markierte in Galerie umwandeln' : 'In Galerie umwandeln'}
            onClick={toGallery}
          />
        </>,
      )}
      <figure contentEditable={false} className="b-svg-figure">
        <div
          ref={frameRef}
          className={`b-svg-frame${background && !isColor(background) ? ` bg-${background}` : ''}${a.border ? ' has-border' : ''}${invert ? (isColor(background) ? ' invert-all' : ' invert-img') : ''}`}
          style={frameStyle}
          onDoubleClick={() => editable && toWhiteboard()}
        >
          <img src={src} alt={(a.alt as string) || caption || 'SVG-Grafik'} draggable={false} style={imgStyle} />
          {editable && (
            <>
              <span className="b-svg-handle is-left" onPointerDown={(e) => startResize(e, 'left')} aria-hidden="true" />
              <span className="b-svg-handle is-right" onPointerDown={(e) => startResize(e, 'right')} aria-hidden="true" />
              {liveWidth != null && <span className="b-svg-size">{liveWidth} %</span>}
            </>
          )}
        </div>

        {caption != null &&
          (editable ? (
            <CaptionInput value={caption} onChange={(v) => updateAttributes({ caption: v })} />
          ) : (
            caption && <figcaption className="b-svg-caption">{caption}</figcaption>
          ))}
      </figure>

      {styleMenu.submenu(<SvgStylePanel attrs={a} source={source} rendered={rendered} update={updateAttributes} />)}

    </NodeViewWrapper>
  );
}

/** Beschriftung mit lokalem Entwurf – sonst springt der Cursor beim Tippen ans Ende. */
function CaptionInput({ value, onChange }: { value: string; onChange: (v: string | null) => void }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(value);
  }, [value]);
  return (
    <input
      ref={ref}
      className="b-svg-caption"
      value={draft}
      placeholder="Beschriftung"
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
      onKeyDown={(e) => {
        // Leere Beschriftung mit Rücktaste entfernen.
        if (e.key === 'Backspace' && !draft) onChange(null);
      }}
    />
  );
}

/** Leerer Block: SVG-Code einfügen, Datei wählen oder leer anfangen. */
function SvgEmpty({ editable, onSvg, onBlank }: { editable: boolean; onSvg: (svg: string) => void; onBlank: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function take(text: string) {
    const svg = cleanSvg(text);
    if (svg) onSvg(svg);
    else setError(text.trim() ? 'Das ist kein gültiges SVG.' : '');
  }

  if (!editable) return <p className="b-empty">Leere SVG-Grafik.</p>;
  return (
    <div className="b-svg-empty" contentEditable={false}>
      <textarea
        value={code}
        spellCheck={false}
        placeholder="<svg …> hier einfügen"
        onChange={(e) => {
          setCode(e.target.value);
          setError('');
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text/plain');
          if (cleanSvg(text)) {
            e.preventDefault();
            take(text);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) take(code);
        }}
      />
      {error && <p className="b-svg-error">{error}</p>}
      <div className="b-svg-empty-actions">
        <button type="button" className="b-chip-btn" disabled={!code.trim()} onClick={() => take(code)}>
          <Icon name="check" /> Übernehmen
        </button>
        <button type="button" className="b-chip-btn" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" /> SVG-Datei …
        </button>
        <button type="button" className="b-chip-btn" onClick={onBlank}>
          <Icon name="pencil" /> Leer zeichnen
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".svg,image/svg+xml"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) take(await file.text());
          }}
        />
      </div>
    </div>
  );
}

interface PanelProps {
  attrs: Record<string, unknown>;
  source: string;
  rendered: string;
  update: (attrs: Record<string, unknown>) => void;
}

/** Stil-Einstellungen im Popover. */
function SvgStylePanel({ attrs: a, source, rendered, update }: PanelProps) {
  const palette = useMemo(() => paletteOf(source), [source]);
  const colors = (a.colors as Record<string, string>) ?? {};
  const width = a.width as number | null;
  const background = a.background as string;
  const [copied, setCopied] = useState(false);

  const setColor = (orig: string, next: string) => update({ colors: { ...colors, [orig]: next } });
  const tintAll = (c: string) => update({ colors: Object.fromEntries(palette.map((p) => [p, c])) });

  return (
    <div className="b-svg-panel">
      <section>
        <div className="b-svg-row-head">
          <span className="b-pop-label">Größe</span>
          <span className="b-svg-value">{width == null ? 'Original' : `${width} %`}</span>
        </div>
        <div className="b-svg-row">
          <input type="range" min={8} max={100} value={width ?? 100} onChange={(e) => update({ width: +e.target.value })} />
          <button type="button" className={`b-svg-mini${width == null ? ' active' : ''}`} onClick={() => update({ width: null })}>
            Original
          </button>
        </div>
      </section>

      {palette.length > 0 && (
        <section>
          <div className="b-svg-row-head">
            <span className="b-pop-label">Farben</span>
            {Object.keys(colors).length > 0 && (
              <button type="button" className="b-svg-link" onClick={() => update({ colors: {} })}>
                Zurücksetzen
              </button>
            )}
          </div>
          <div className="b-svg-swatches">
            {palette.slice(0, 24).map((c) => (
              <label key={c} className={`b-svg-swatch${colors[c] ? ' is-changed' : ''}`} title={colors[c] ? `${c} → ${colors[c]}` : c}>
                <span style={{ background: colors[c] ?? c }} />
                <input type="color" value={toHex(colors[c] ?? c)} onChange={(e) => setColor(c, e.target.value)} />
              </label>
            ))}
          </div>
          <span className="b-pop-label">Alles einfärben</span>
          <div className="b-svg-swatches">
            {quickColors.map((c) => (
              <button key={c} type="button" className="b-svg-swatch" title={c} onClick={() => tintAll(c)}>
                <span style={{ background: c }} />
              </button>
            ))}
            <label className="b-svg-swatch is-custom" title="Eigene Farbe">
              <span />
              <input type="color" onChange={(e) => tintAll(e.target.value)} />
            </label>
          </div>
        </section>
      )}

      <section>
        <div className="b-svg-row-head">
          <span className="b-pop-label">Strichstärke</span>
          <span className="b-svg-value">{(a.strokeScale as number).toLocaleString('de')} ×</span>
        </div>
        <div className="b-svg-row">
          <input type="range" min={0} max={4} step={0.25} value={a.strokeScale as number} onChange={(e) => update({ strokeScale: +e.target.value })} />
          <button type="button" className="b-svg-mini" onClick={() => update({ strokeScale: 1 })}>
            1 ×
          </button>
        </div>
      </section>

      <section>
        <span className="b-pop-label">Hintergrund</span>
        <div className="b-svg-chips">
          {backgrounds.map((b) => (
            <button key={b.id} type="button" className={`b-svg-mini${background === b.id ? ' active' : ''}`} onClick={() => update({ background: b.id, padding: b.id && !a.padding ? 16 : a.padding })}>
              {b.label}
            </button>
          ))}
          <label className={`b-svg-swatch is-custom${isColor(background) && background !== '#ffffff' ? ' is-changed' : ''}`} title="Eigene Farbe">
            <span style={isColor(background) && background !== '#ffffff' ? { background } : undefined} />
            <input type="color" value={isColor(background) ? background : '#ffffff'} onChange={(e) => update({ background: e.target.value, padding: a.padding || 16 })} />
          </label>
        </div>
        <div className="b-svg-row-head">
          <span className="b-pop-label">Innenabstand</span>
          <span className="b-svg-value">{a.padding as number} px</span>
        </div>
        <input type="range" min={0} max={64} step={2} value={a.padding as number} onChange={(e) => update({ padding: +e.target.value })} />
        <label className="b-svg-check">
          <input type="checkbox" checked={!!a.border} onChange={(e) => update({ border: e.target.checked })} /> Rahmen
        </label>
      </section>

      <section>
        <div className="b-svg-row-head">
          <span className="b-pop-label">Deckkraft</span>
          <span className="b-svg-value">{Math.round((a.opacity as number) * 100)} %</span>
        </div>
        <input type="range" min={0.1} max={1} step={0.05} value={a.opacity as number} onChange={(e) => update({ opacity: +e.target.value })} />
      </section>

      <section>
        <span className="b-pop-label">Drehen & Spiegeln</span>
        <div className="b-svg-chips">
          <button type="button" className="b-svg-mini" title="90° gegen den Uhrzeigersinn" onClick={() => update({ rotate: ((a.rotate as number) + 270) % 360 })}>
            ↺ 90°
          </button>
          <button type="button" className="b-svg-mini" title="90° im Uhrzeigersinn" onClick={() => update({ rotate: ((a.rotate as number) + 90) % 360 })}>
            ↻ 90°
          </button>
          <button type="button" className={`b-svg-mini${a.flipH ? ' active' : ''}`} onClick={() => update({ flipH: !a.flipH })}>
            ⇆ Horizontal
          </button>
          <button type="button" className={`b-svg-mini${a.flipV ? ' active' : ''}`} onClick={() => update({ flipV: !a.flipV })}>
            ⇅ Vertikal
          </button>
        </div>
      </section>

      <section>
        <label className="b-svg-check">
          <input type="checkbox" checked={a.dark === 'invert'} onChange={(e) => update({ dark: e.target.checked ? 'invert' : 'keep' })} /> Im Dunkelmodus invertieren
        </label>
        <label className="b-svg-check">
          <input type="checkbox" checked={a.caption != null} onChange={(e) => update({ caption: e.target.checked ? '' : null })} /> Beschriftung
        </label>
        <input className="b-pop-input" placeholder="Alternativtext (Barrierefreiheit)" value={a.alt as string} onChange={(e) => update({ alt: e.target.value })} />
      </section>

      <hr className="b-pop-sep" />
      <div className="b-svg-chips">
        <button
          type="button"
          className="b-svg-mini"
          onClick={async () => {
            await navigator.clipboard.writeText(rendered);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          <Icon name={copied ? 'check' : 'copy'} /> {copied ? 'Kopiert' : 'SVG-Code kopieren'}
        </button>
        <button
          type="button"
          className="b-svg-mini"
          onClick={() => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([rendered], { type: 'image/svg+xml' }));
            link.download = `${((a.caption as string) || (a.alt as string) || 'grafik').replace(/[^\w\-äöüß ]+/gi, '').trim() || 'grafik'}.svg`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
          }}
        >
          <Icon name="download" /> .svg
        </button>
      </div>
    </div>
  );
}
