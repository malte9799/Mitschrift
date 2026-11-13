import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon, type IconName } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, BarSep, useBarSubmenu, useBlockBar } from '@/editor/BlockBar';
import { getBlockSelection, setBlockSelection } from '@/editor/BlockSelection';
import { convertToGallery } from '@/editor/convertToGallery';
import { useDarkMode } from '@/hooks/useDarkMode';
import { alertDialog } from '@/ui/Dialog';
import { EditedImage, type NaturalSize } from './EditedImage';
import { ImageEditor } from './ImageEditor';
import { Lightbox } from './Lightbox';
import { imageFiles, pickImage, pickImageWithName, storeImage, storeImageFile } from './files';
import { canvasToBlob, loadPixels, renderEdited } from './pixels';
import { frameLabels, isRemote, layoutLabels, outputSize, type ImageAlign, type ImageEdit, type ImageFrame, type ImageLayout } from './model';
import { formatShortcut } from '@/ui/shortcut';

const layoutIcons: Record<ImageLayout, IconName> = { inline: 'wrapInline', left: 'wrapLeft', right: 'wrapRight', front: 'wrapFront', behind: 'wrapBehind' };
const sizes = [25, 33, 50, 66, 75, 100];
const SNAP = [25, 100 / 3, 50, 200 / 3, 75, 100];

const isFree = (l: ImageLayout) => l === 'front' || l === 'behind';
const isFloat = (l: ImageLayout) => l === 'left' || l === 'right';

/** Inhaltsbreite des Editors (ohne Innenabstand) – Bezug für Breiten in Prozent. */
function contentWidth(dom: HTMLElement): number {
  const cs = getComputedStyle(dom);
  return dom.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
}

export function ImageView({ node, editor, updateAttributes, getPos, deleteNode }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const dark = useDarkMode();
  const src = node.attrs.src as string;
  const filename = node.attrs.filename as string | null;
  const alt = (node.attrs.alt as string | null) ?? '';
  const caption = node.attrs.title as string | null;
  const width = node.attrs.width as number | null;
  const layout = (node.attrs.layout as ImageLayout) ?? 'inline';
  const align = (node.attrs.align as ImageAlign) ?? 'left';
  const frame = (node.attrs.frame as ImageFrame) ?? 'soft';
  const edit = node.attrs.edit as ImageEdit | null;
  const x = (node.attrs.x as number) ?? 0;
  const y = (node.attrs.y as number) ?? 0;

  const [nat, setNat] = useState<NaturalSize | null>(null);
  const [broken, setBroken] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  // Während Ziehen/Skalieren lokal, erst beim Loslassen ins Dokument.
  const [live, setLive] = useState<{ width?: number; x?: number; y?: number } | null>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const layoutMenu = useBarSubmenu(editor, { icon: layoutIcons[layout], label: 'Textumbruch' });
  const sizeMenu = useBarSubmenu(editor, { icon: 'resize', label: 'Größe' });
  const frameMenu = useBarSubmenu(editor, { icon: 'frame', label: 'Rahmen' });
  const moreMenu = useBarSubmenu(editor, {
    icon: 'more',
    label: 'Mehr',
    sub: replacing ? { title: 'Bild ersetzen', onBack: () => setReplacing(false) } : null,
  });

  useEffect(() => setBroken(false), [src]);
  // Der Notiz-Editor darf den Fokus nicht behalten, solange das Bearbeitungsfenster offen ist.
  useEffect(() => {
    if (editing) (editor.view.dom as HTMLElement).blur();
  }, [editing, editor]);
  // „Mehr“ geschlossen: auch dessen Unterseite „Bild ersetzen“ zurücksetzen.
  useEffect(() => {
    if (!moreMenu.open) setReplacing(false);
  }, [moreMenu.open]);

  const showTools = editable && bar.active && !!src;
  const w = live?.width ?? width;
  const px = live?.x ?? x;
  const py = live?.y ?? y;
  const out = nat ? outputSize(nat, edit) : null;

  function select() {
    const pos = getPos();
    if (typeof pos === 'number') setBlockSelection(editor, [pos]);
  }

  function setLayout(next: ImageLayout) {
    const patch: Record<string, unknown> = { layout: next };
    // Umfließen und freie Position brauchen eine feste Breite – sonst wäre das Bild meist seitenbreit.
    if (next !== 'inline' && !width) patch.width = 40;
    if (isFree(next) && !isFree(layout)) {
      patch.x = align === 'center' ? (100 - (width ?? 40)) / 2 : align === 'right' ? 100 - (width ?? 40) : 0;
      patch.y = 0;
    }
    updateAttributes(patch);
    layoutMenu.close();
  }

  // ---------- Skalieren ----------
  function startResize(e: ReactPointerEvent, handle: 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw') {
    const fig = figureRef.current;
    if (!fig) return;
    e.preventDefault();
    e.stopPropagation();
    const total = contentWidth(editor.view.dom as HTMLElement);
    const startW = fig.getBoundingClientRect().width;
    const startX = e.clientX;
    const left = handle.includes('w');
    // Zentriert wächst das Bild nach beiden Seiten – doppelte Wirkung.
    const factor = layout === 'inline' && align === 'center' ? 2 : 1;
    const x0 = x;
    let last: { width: number; x?: number } = { width: (startW / total) * 100 };
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) * (left ? -1 : 1) * factor;
      let pct = Math.max(5, Math.min(100, ((startW + dx) / total) * 100));
      // Einrasten bei gängigen Größen (Umschalt hält die Größe frei).
      if (!ev.shiftKey) for (const s of SNAP) if (Math.abs(pct - s) < 1.2) pct = s;
      pct = Math.round(pct * 10) / 10;
      last = { width: pct };
      // Frei positioniert und am linken Griff gezogen: rechte Kante bleibt stehen.
      if (isFree(layout) && left) last.x = x0 + ((startW / total) * 100 - pct);
      setLive(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setLive(null);
      updateAttributes(last);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ---------- Frei verschieben ----------
  function startMove(e: ReactPointerEvent) {
    if (!editable || !isFree(layout) || e.button !== 0) return;
    if ((e.target as Element).closest('.c-img-handle, input, button')) return;
    e.preventDefault();
    const total = contentWidth(editor.view.dom as HTMLElement);
    const start = { cx: e.clientX, cy: e.clientY, x, y };
    let last: { x: number; y: number } | null = null;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.cx;
      const dy = ev.clientY - start.cy;
      if (!last && Math.hypot(dx, dy) < 3) return;
      last = { x: Math.round((start.x + (dx / total) * 100) * 10) / 10, y: Math.round(start.y + dy) };
      setLive(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setLive(null);
      if (last) updateAttributes(last);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function toGallery() {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    const sel = getBlockSelection(editor.state);
    // Mehrere markierte Bild-/SVG-Blöcke: alle zusammen in eine Galerie, sonst nur dieser hier.
    convertToGallery(editor, sel.includes(pos) ? sel : [pos]);
    moreMenu.close();
  }

  async function saveLocally() {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error();
      updateAttributes({ src: await storeImage(await res.blob()) });
    } catch {
      await alertDialog('Das Bild konnte nicht heruntergeladen werden – die Seite erlaubt das nicht. Speichere es über den Browser und füge es als Datei ein.');
    }
    moreMenu.close();
  }

  async function download() {
    moreMenu.close();
    try {
      const canvas = renderEdited(await loadPixels(src), edit ?? {}, 8000);
      const url = URL.createObjectURL(await canvasToBlob(canvas));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(alt || caption || 'Bild').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      await alertDialog((err as Error).message || 'Das Bild konnte nicht gespeichert werden.');
    }
  }

  // ---------- Leerer Bild-Block: hochladen oder Link ----------
  if (!src) {
    return (
      <NodeViewWrapper className="c-img is-empty" data-interactive="">
        {editable ? (
          <ImagePlaceholder onSrc={(s) => updateAttributes({ src: s, filename: null })} onFile={(f) => updateAttributes({ src: f.src, filename: f.filename })} onDelete={deleteNode} />
        ) : (
          <div className="c-img-ph is-readonly">
            <Icon name="image" /> Kein Bild
          </div>
        )}
      </NodeViewWrapper>
    );
  }

  // ---------- Layout ----------
  const wrapperStyle: CSSProperties = {};
  const figureStyle: CSSProperties = {};
  if (isFloat(layout)) {
    wrapperStyle.width = `${w ?? 40}%`;
  } else if (isFree(layout)) {
    figureStyle.left = `${px}%`;
    figureStyle.top = py;
    figureStyle.width = `${w ?? 40}%`;
  } else if (w) {
    figureStyle.width = `${w}%`;
  } else if (out) {
    figureStyle.width = `min(100%, ${Math.round(out.w)}px)`;
  }

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`c-img is-${layout} align-${align}${showTools ? ' is-selected' : ''}${editable ? ' is-editable' : ''}${live ? ' is-live' : ''}`}
      style={wrapperStyle}
    >
      {showTools &&
        bar.render(
          <>
            {layoutMenu.button}
            {layout === 'inline' && (
              <>
                <BarSep />
                {(['left', 'center', 'right'] as const).map((a) => (
                  <BarButton
                    key={a}
                    icon={a === 'left' ? 'alignLeft' : a === 'center' ? 'alignCenter' : 'alignRight'}
                    label={a === 'left' ? 'Links' : a === 'center' ? 'Mittig' : 'Rechts'}
                    active={align === a}
                    onClick={() => updateAttributes({ align: a })}
                  />
                ))}
              </>
            )}
            <BarSep />
            {sizeMenu.button}
            <BarButton icon="crop" label="Bearbeiten" text="Bearbeiten" onClick={() => setEditing(true)} />
            {frameMenu.button}
            <BarButton icon="caption" label="Bildunterschrift" active={caption !== null} onClick={() => updateAttributes({ title: caption === null ? '' : null })} />
            <BarSep />
            {moreMenu.button}
          </>,
        )}
      {isFree(layout) && editable && (
        <button
          type="button"
          className="c-img-anchor"
          contentEditable={false}
          title={`${layoutLabels[layout]} – klicken zum Auswählen`}
          onMouseDown={(e) => {
            e.preventDefault();
            select();
          }}
        >
          <Icon name="anchor" />
        </button>
      )}
      <div
        ref={figureRef}
        className={`c-img-figure frame-${frame}`}
        style={figureStyle}
        contentEditable={false}
        onPointerDown={startMove}
        onDragStart={(e) => isFree(layout) && e.preventDefault()}
        onDoubleClick={() => editable && setEditing(true)}
        onClick={() => !editable && setViewing(true)}
      >
        <div className="c-img-box">
          {broken ? (
            <div className="c-img-broken">
              <Icon name="image" />
              <span>Bild konnte nicht geladen werden</span>
              {isRemote(src) && <small>{src}</small>}
            </div>
          ) : (
            <EditedImage src={src} edit={edit} alt={alt} dark={dark} onNatural={setNat} onError={() => setBroken(true)} />
          )}
          {showTools && (
            <>
              {(['nw', 'ne', 'sw', 'se', 'w', 'e'] as const).map((h) => (
                <span key={h} className={`c-img-handle is-${h}`} onPointerDown={(e) => startResize(e, h)} />
              ))}
              {live?.width !== undefined && <span className="c-img-size">{Math.round(live.width)} %</span>}
            </>
          )}
        </div>

        {caption !== null &&
          (editable ? (
            <input
              className="c-img-caption"
              value={caption}
              placeholder="Bildunterschrift"
              onChange={(e) => updateAttributes({ title: e.target.value })}
              onBlur={(e) => !e.target.value.trim() && updateAttributes({ title: null })}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            caption && <p className="c-img-caption">{caption}</p>
          ))}

      </div>

      {layoutMenu.submenu(
        <div className="b-pop-list">
          <p className="b-pop-label">Textumbruch</p>
          {(Object.keys(layoutLabels) as ImageLayout[]).map((l) => (
            <button key={l} type="button" className={`b-pop-item${l === layout ? ' is-active' : ''}`} onClick={() => setLayout(l)}>
              <Icon name={layoutIcons[l]} className="b-pop-icon" />
              {layoutLabels[l]}
              {l === layout && <Icon name="check" className="b-pop-check" />}
            </button>
          ))}
          {isFree(layout) && (
            <>
              <hr className="b-pop-sep" />
              <p className="b-pop-empty">Bild ziehen, um es frei zu platzieren.</p>
            </>
          )}
        </div>,
      )}
      {sizeMenu.submenu(
        <div className="b-pop-list">
          <p className="b-pop-label">Breite</p>
          {sizes.map((s) => (
            <button key={s} type="button" className={`b-pop-item${Math.round(width ?? -1) === s ? ' is-active' : ''}`} onClick={() => (updateAttributes({ width: s }), sizeMenu.close())}>
              {s} %{Math.round(width ?? -1) === s && <Icon name="check" className="b-pop-check" />}
            </button>
          ))}
          {layout === 'inline' && (
            <button type="button" className={`b-pop-item${width === null ? ' is-active' : ''}`} onClick={() => (updateAttributes({ width: null }), sizeMenu.close())}>
              Originalgröße{out ? ` (${Math.round(out.w)} px)` : ''}
              {width === null && <Icon name="check" className="b-pop-check" />}
            </button>
          )}
          <hr className="b-pop-sep" />
          <p className="b-pop-empty">{formatShortcut('Oder an den Ecken ziehen · ⇧ ohne Einrasten')}</p>
        </div>,
      )}
      {frameMenu.submenu(
        <div className="b-pop-list">
          <p className="b-pop-label">Rahmen</p>
          {(Object.keys(frameLabels) as ImageFrame[]).map((f) => (
            <button key={f} type="button" className={`b-pop-item${f === frame ? ' is-active' : ''}`} onClick={() => (updateAttributes({ frame: f }), frameMenu.close())}>
              <span className={`c-img-frame-swatch frame-${f}`} />
              {frameLabels[f]}
              {f === frame && <Icon name="check" className="b-pop-check" />}
            </button>
          ))}
        </div>,
      )}
      {moreMenu.submenu(
        replacing ? (
          <SourceForm
            onSrc={(s) => {
              updateAttributes({ src: s, edit: null, filename: null });
              moreMenu.close();
            }}
            onFile={(f) => {
              updateAttributes({ src: f.src, edit: null, filename: f.filename });
              moreMenu.close();
            }}
          />
        ) : (
          <div className="b-pop-list">
            <button type="button" className="b-pop-item" onClick={() => (setViewing(true), moreMenu.close())}>
              <Icon name="expand" className="b-pop-icon" /> Großansicht
            </button>
            <button type="button" className="b-pop-item" onClick={() => (setEditing(true), moreMenu.close())}>
              <Icon name="wand" className="b-pop-icon" /> Hintergrund entfernen …
            </button>
            <button
              type="button"
              className="b-pop-item"
              onClick={() => {
                updateAttributes({ edit: { ...(edit ?? {}), invert: (edit?.invert ?? 0) === 100 ? 0 : 100 } });
                moreMenu.close();
              }}
            >
              <Icon name="invert" className="b-pop-icon" /> Farben umkehren
              {edit?.invert === 100 && <Icon name="check" className="b-pop-check" />}
            </button>
            <button type="button" className="b-pop-item" onClick={() => (updateAttributes({ edit: { ...(edit ?? {}), darkInvert: !edit?.darkInvert } }), moreMenu.close())}>
              <Icon name="moon" className="b-pop-icon" /> Im Dunkelmodus umkehren
              {edit?.darkInvert && <Icon name="check" className="b-pop-check" />}
            </button>
            <hr className="b-pop-sep" />
            <button type="button" className="b-pop-item" onClick={() => setReplacing(true)}>
              <Icon name="swap" className="b-pop-icon" /> Bild ersetzen …
            </button>
            <button type="button" className="b-pop-item" onClick={toGallery}>
              <Icon name="gallery" className="b-pop-icon" />
              {getBlockSelection(editor.state).length > 1 ? 'Markierte in Galerie umwandeln' : 'In Galerie umwandeln'}
            </button>
            {isRemote(src) && (
              <>
                <a className="b-pop-item" href={src} target="_blank" rel="noreferrer noopener" onClick={() => moreMenu.close()}>
                  <Icon name="external" className="b-pop-icon" /> Quelle öffnen
                </a>
                <button type="button" className="b-pop-item" onClick={() => void saveLocally()}>
                  <Icon name="file" className="b-pop-icon" /> In der Notiz speichern
                </button>
              </>
            )}
            <button type="button" className="b-pop-item" onClick={() => void download()}>
              <Icon name="download" className="b-pop-icon" /> Als PNG sichern
            </button>
          </div>
        ),
      )}

      {editing && (
        <ImageEditor
          src={src}
          edit={edit}
          alt={alt}
          onSave={(r) => updateAttributes({ src: r.src, edit: r.edit, alt: r.alt || null })}
          onClose={() => setEditing(false)}
        />
      )}
      {viewing && <Lightbox items={[{ src, edit, caption, alt, filename }]} index={0} onClose={() => setViewing(false)} />}
    </NodeViewWrapper>
  );
}

/** Datei hochladen oder Bild-Link eingeben. */
export function SourceForm({
  onSrc,
  onFile,
  multiple = false,
  onMany,
  onManyFiles,
}: {
  onSrc: (src: string) => void;
  /** Wie `onSrc`, meldet zusätzlich den ursprünglichen Dateinamen – wird bevorzugt, wenn gesetzt. */
  onFile?: (item: { src: string; filename: string | null }) => void;
  multiple?: boolean;
  onMany?: (srcs: string[]) => void;
  onManyFiles?: (items: { src: string; filename: string | null }[]) => void;
}) {
  const [url, setUrl] = useState('');
  const valid = /^(https?:\/\/|data:image\/)\S+$/i.test(url.trim());
  return (
    <div className="b-pop-list c-img-source">
      <button
        type="button"
        className="b-pop-item"
        onClick={() => {
          if (multiple && (onMany || onManyFiles)) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = async () => {
              const items = await Promise.all([...(input.files ?? [])].filter((f) => f.type.startsWith('image/')).map(storeImageFile));
              if (onManyFiles) onManyFiles(items);
              else onMany?.(items.map((i) => i.src));
            };
            input.click();
          } else if (onFile) pickImageWithName(onFile);
          else pickImage(onSrc);
        }}
      >
        <Icon name="upload" className="b-pop-icon" /> {multiple ? 'Dateien hochladen …' : 'Datei hochladen …'}
      </button>
      <hr className="b-pop-sep" />
      <p className="b-pop-label">Bild-Link</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSrc(url.trim());
        }}
      >
        <input className="b-pop-input" value={url} placeholder="https://…/bild.jpg" onChange={(e) => setUrl(e.target.value)} autoFocus />
        <button type="submit" className="b-btn b-btn-primary c-img-source-go" disabled={!valid}>
          <Icon name="link" /> Einfügen
        </button>
      </form>
    </div>
  );
}

/** Leerer Bild-Block: Datei wählen, hineinziehen, einfügen oder Link angeben. */
function ImagePlaceholder({
  onSrc,
  onFile,
  onDelete,
}: {
  onSrc: (src: string) => void;
  /** Wie `onSrc`, meldet zusätzlich den ursprünglichen Dateinamen. */
  onFile?: (item: { src: string; filename: string | null }) => void;
  onDelete: () => void;
}) {
  const [over, setOver] = useState(false);
  const [url, setUrl] = useState('');
  const valid = /^(https?:\/\/|data:image\/)\S+$/i.test(url.trim());
  return (
    <div
      className={`c-img-ph${over ? ' is-over' : ''}`}
      contentEditable={false}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={async (e) => {
        const [file] = imageFiles(e.dataTransfer);
        setOver(false);
        if (!file) return;
        e.preventDefault();
        if (onFile) onFile(await storeImageFile(file));
        else onSrc((await storeImageFile(file)).src);
      }}
      onPaste={async (e) => {
        const [file] = imageFiles(e.clipboardData);
        if (!file) return;
        e.preventDefault();
        if (onFile) onFile(await storeImageFile(file));
        else onSrc((await storeImageFile(file)).src);
      }}
    >
      <Icon name="image" className="c-img-ph-icon" />
      <div className="c-img-ph-main">
        <button type="button" className="b-btn b-btn-primary" onClick={() => (onFile ? pickImageWithName(onFile) : pickImage(onSrc))}>
          <Icon name="upload" /> Hochladen
        </button>
        <span className="c-img-ph-or">oder</span>
        <form
          className="c-img-ph-url"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSrc(url.trim());
          }}
        >
          <input value={url} placeholder="Bild-Link einfügen …" onChange={(e) => setUrl(e.target.value)} />
          <button type="submit" className="b-btn" disabled={!valid}>
            Einfügen
          </button>
        </form>
      </div>
      <p className="c-img-ph-hint">Bilder kannst du auch hierher ziehen oder mit {formatShortcut('⌘V')} einfügen.</p>
      <button type="button" className="c-img-ph-close" title="Entfernen" onClick={onDelete}>
        <Icon name="x" />
      </button>
    </div>
  );
}
