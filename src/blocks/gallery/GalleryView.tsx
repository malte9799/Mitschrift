import { useEffect, useId, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon, type IconName } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, BarSep, useBarSubmenu, useBlockBar } from '@/editor/BlockBar';
import { useDarkMode } from '@/hooks/useDarkMode';
import { EditedImage } from '@/editor/image/EditedImage';
import { ImageEditor } from '@/editor/image/ImageEditor';
import { Lightbox } from '@/editor/image/Lightbox';
import { SourceForm } from '@/editor/image/ImageView';
import { imageFiles, storeImageFile } from '@/editor/image/files';
import { outputSize } from '@/editor/image/model';
import { galleryLayouts, newItemId, type GalleryItem, type GalleryLayout } from './GalleryNode';

const layoutInfo: Record<GalleryLayout, { label: string; icon: IconName }> = {
  grid: { label: 'Raster', icon: 'layoutGrid' },
  masonry: { label: 'Mosaik', icon: 'layoutMosaic' },
  carousel: { label: 'Karussell', icon: 'carousel' },
  strip: { label: 'Streifen', icon: 'strip' },
  compare: { label: 'Vergleich', icon: 'compare' },
};

/** Seitenverhältnisse (Breite/Höhe) der geladenen Bilder, je Eintrag. */
type Ratios = Record<string, number>;

export function GalleryView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const dark = useDarkMode();
  const uid = useId();
  const items = node.attrs.items as GalleryItem[];
  const title = node.attrs.title as string;
  const columns = node.attrs.columns as number;
  const fit = node.attrs.fit as 'cover' | 'contain';
  const captions = node.attrs.captions as boolean;
  const savedLayout = node.attrs.layout as GalleryLayout;
  // Im Lernmodus darf man die Ansicht wechseln, ohne die Notiz zu ändern.
  const [localLayout, setLocalLayout] = useState(savedLayout);
  useEffect(() => setLocalLayout(savedLayout), [savedLayout]);
  const layout = editable ? savedLayout : localLayout;

  const [ratios, setRatios] = useState<Ratios>({});
  const [viewing, setViewing] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const addMenu = useBarSubmenu(editor, { icon: 'plus', label: 'Bilder', text: 'Bilder', popoverAlign: 'end' });
  const optionsMenu = useBarSubmenu(editor, { icon: 'more', label: 'Optionen', popoverAlign: 'end' });
  const [dropping, setDropping] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const setItems = (next: GalleryItem[]) => updateAttributes({ items: next });
  const patchItem = (id: string, p: Partial<GalleryItem>) => setItems(items.map((it) => (it.id === id ? { ...it, ...p } : it)));
  const addSrcs = (srcs: string[]) => setItems([...items, ...srcs.map((src) => ({ id: newItemId(), src, caption: '' }))]);
  const addFiles = (files: { src: string; filename: string | null }[]) =>
    setItems([...items, ...files.map(({ src, filename }) => ({ id: newItemId(), src, caption: '', filename }))]);
  const ratioOf = (it: GalleryItem) => ratios[it.id] ?? 4 / 3;
  const onNatural = (it: GalleryItem) => (n: { w: number; h: number }) => {
    const o = outputSize(n, it.edit);
    const r = o.w / o.h;
    setRatios((m) => (Math.abs((m[it.id] ?? 0) - r) < 0.001 ? m : { ...m, [it.id]: r }));
  };

  // Der Notiz-Editor darf den Fokus nicht behalten, solange das Bearbeitungsfenster offen ist.
  useEffect(() => {
    if (editingId) (editor.view.dom as HTMLElement).blur();
  }, [editingId, editor]);

  // ---------- Dateien ablegen & sortieren ----------
  function onDragOverBody(e: DragEvent) {
    if (!editable) return;
    const files = [...e.dataTransfer.types].includes('Files');
    if (!files && dragFrom.current === null) return;
    e.preventDefault();
    if (files) setDropping(true);
  }
  async function onDropBody(e: DragEvent) {
    setDropping(false);
    setDragOver(null);
    if (!editable) return;
    const files = imageFiles(e.dataTransfer);
    if (files.length) {
      e.preventDefault();
      addFiles(await Promise.all(files.map(storeImageFile)));
    }
  }
  function moveItem(from: number, to: number) {
    if (from === to) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setItems(next);
  }

  const tileProps = (it: GalleryItem, i: number) => ({
    item: it,
    index: i,
    editable,
    dark,
    captions,
    dragOver: dragOver === i,
    onOpen: () => setViewing(i),
    onEdit: () => setEditingId(it.id),
    onRemove: () => setItems(items.filter((x) => x.id !== it.id)),
    onCaption: (caption: string) => patchItem(it.id, { caption }),
    onNatural: onNatural(it),
    onDragStart: () => (dragFrom.current = i),
    onDragEnter: () => dragFrom.current !== null && setDragOver(i),
    onDrop: () => {
      if (dragFrom.current !== null) moveItem(dragFrom.current, i);
      dragFrom.current = null;
      setDragOver(null);
    },
    onDragEnd: () => {
      dragFrom.current = null;
      setDragOver(null);
    },
  });

  const editingItem = items.find((it) => it.id === editingId);

  return (
    <NodeViewWrapper className={`b-block g-gallery is-${layout}`} data-interactive="">
      {bar.render(
        <>
          {galleryLayouts.map((k) => (
            <BarButton key={k} icon={layoutInfo[k].icon} label={layoutInfo[k].label} active={k === layout} onClick={() => updateAttributes({ layout: k })} />
          ))}
          {(layout === 'grid' || layout === 'masonry') && (
            <>
              <BarSep />
              <span className="c-bar-stepper" title="Spalten">
                <BarButton icon="minus" label="Weniger Spalten" disabled={columns <= 1} onClick={() => updateAttributes({ columns: columns - 1 })} />
                <span>{columns}</span>
                <BarButton icon="plus" label="Mehr Spalten" disabled={columns >= 6} onClick={() => updateAttributes({ columns: columns + 1 })} />
              </span>
            </>
          )}
          <BarSep />
          {optionsMenu.button}
          {addMenu.button}
        </>,
      )}
      <div contentEditable={false}>
        {!editable && (
          <div className="b-block-head g-head">
            <div className="b-seg" role="tablist" aria-label="Ansicht">
              {galleryLayouts.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={k === layout}
                  className={k === layout ? 'active' : ''}
                  title={layoutInfo[k].label}
                  onClick={() => setLocalLayout(k)}
                >
                  {k === layout && <motion.span layoutId={`g-seg-${uid}`} className="b-seg-pill" transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }} />}
                  <Icon name={layoutInfo[k].icon} />
                  <span>{layoutInfo[k].label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {editable ? (
          <input className="b-diagram-title-input" value={title} placeholder="Titel (optional)" onChange={(e) => updateAttributes({ title: e.target.value })} />
        ) : (
          title && <h4 className="b-diagram-title">{title}</h4>
        )}

        <div
          className={`g-body${dropping ? ' is-dropping' : ''}`}
          onDragOver={onDragOverBody}
          onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropping(false)}
          onDrop={(e) => void onDropBody(e)}
        >
          {items.length === 0 ? (
            <div className="g-empty">
              <Icon name="gallery" />
              {editable ? (
                <>
                  <p>Bilder hierher ziehen oder hinzufügen.</p>
                  <button type="button" className="b-btn b-btn-primary" onClick={(e) => addMenu.openAt(e.currentTarget)}>
                    <Icon name="plus" /> Bilder hinzufügen
                  </button>
                </>
              ) : (
                <p>Noch keine Bilder.</p>
              )}
            </div>
          ) : layout === 'carousel' ? (
            <Carousel items={items} dark={dark} captions={captions} ratioOf={ratioOf} onNatural={onNatural} onOpen={setViewing} />
          ) : layout === 'compare' ? (
            <Compare items={items} dark={dark} />
          ) : (
            <div
              className={`g-tiles is-${layout} fit-${fit}`}
              style={{ '--g-cols': columns } as CSSProperties}
            >
              {items.map((it, i) => (
                <Tile key={it.id} {...tileProps(it, i)} layout={layout} fit={fit} ratio={ratioOf(it)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {addMenu.submenu(
        <SourceForm
          multiple
          onManyFiles={(files) => {
            addFiles(files);
            addMenu.close();
          }}
          onSrc={(src) => {
            addSrcs([src]);
            addMenu.close();
          }}
        />,
      )}
      {optionsMenu.submenu(
        <div className="b-pop-list">
          <p className="b-pop-label">Kacheln im Raster</p>
          {(['cover', 'contain'] as const).map((f) => (
            <button key={f} type="button" className={`b-pop-item${fit === f ? ' is-active' : ''}`} onClick={() => updateAttributes({ fit: f })}>
              <Icon name={f === 'cover' ? 'crop' : 'expand'} className="b-pop-icon" />
              {f === 'cover' ? 'Gleich groß zuschneiden' : 'Ganzes Bild zeigen'}
              {fit === f && <Icon name="check" className="b-pop-check" />}
            </button>
          ))}
          <hr className="b-pop-sep" />
          <button type="button" className={`b-pop-item${captions ? ' is-active' : ''}`} onClick={() => updateAttributes({ captions: !captions })}>
            <Icon name="caption" className="b-pop-icon" /> Bildunterschriften
            {captions && <Icon name="check" className="b-pop-check" />}
          </button>
        </div>,
      )}

      {viewing !== null && (
        <Lightbox
          items={items.map((it) => ({ src: it.src, edit: it.edit, caption: it.caption, alt: it.alt, filename: it.filename }))}
          index={viewing}
          onClose={() => setViewing(null)}
        />
      )}
      {editingItem && (
        <ImageEditor
          src={editingItem.src}
          edit={editingItem.edit ?? null}
          alt={editingItem.alt ?? ''}
          onSave={(r) => patchItem(editingItem.id, { src: r.src, edit: r.edit, alt: r.alt || undefined })}
          onClose={() => setEditingId(null)}
        />
      )}
    </NodeViewWrapper>
  );
}

interface TileProps {
  item: GalleryItem;
  index: number;
  layout: GalleryLayout;
  fit: 'cover' | 'contain';
  ratio: number;
  editable: boolean;
  dark: boolean;
  captions: boolean;
  dragOver: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onCaption: (caption: string) => void;
  onNatural: (n: { w: number; h: number }) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function Tile({ item, layout, fit, ratio, editable, dark, captions, dragOver, onOpen, onEdit, onRemove, onCaption, onNatural, onDragStart, onDragEnter, onDrop, onDragEnd }: TileProps) {
  // Raster: feste Kachel (4:3), Bild zugeschnitten (cover) oder ganz (contain). Streifen: feste Höhe.
  const frameStyle: CSSProperties | undefined =
    layout === 'grid' ? { width: `${fit === 'cover' ? Math.max(100, 75 * ratio) : Math.min(100, 75 * ratio)}%` } : undefined;
  const tileStyle: CSSProperties | undefined = layout === 'strip' ? { width: `calc(var(--g-strip-h) * ${ratio})` } : undefined;
  return (
    <figure
      className={`g-tile${dragOver ? ' is-drag-over' : ''}`}
      style={tileStyle}
      draggable={editable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
        onDragStart();
      }}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        if (imageFiles(e.dataTransfer).length) return; // Dateien behandelt die Galerie
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      <button type="button" className="g-tile-img" onClick={onOpen} aria-label={item.caption || 'Bild öffnen'}>
        <span className="g-tile-frame" style={frameStyle}>
          <EditedImage src={item.src} edit={item.edit} alt={item.alt ?? item.caption} dark={dark} onNatural={onNatural} />
        </span>
      </button>
      {editable && (
        <div className="g-tile-tools">
          <button type="button" onClick={onEdit} title="Bearbeiten">
            <Icon name="crop" />
          </button>
          <button type="button" className="is-danger" onClick={onRemove} title="Entfernen">
            <Icon name="trash" />
          </button>
        </div>
      )}
      {captions &&
        (editable ? (
          <input className="g-caption" value={item.caption} placeholder="Beschriftung" onChange={(e) => onCaption(e.target.value)} />
        ) : (
          item.caption && <figcaption className="g-caption">{item.caption}</figcaption>
        ))}
    </figure>
  );
}

function Carousel({
  items,
  dark,
  captions,
  ratioOf,
  onNatural,
  onOpen,
}: {
  items: GalleryItem[];
  dark: boolean;
  captions: boolean;
  ratioOf: (it: GalleryItem) => number;
  onNatural: (it: GalleryItem) => (n: { w: number; h: number }) => void;
  onOpen: (i: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(0);
  const i = Math.min(index, items.length - 1);
  const it = items[i];
  const go = (step: number) => {
    setDir(step);
    setIndex((i + step + items.length) % items.length);
  };
  return (
    <div
      className="g-carousel"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
        else return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="g-carousel-stage">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.button
            key={it.id}
            type="button"
            className="g-carousel-frame"
            style={{ width: `min(100%, calc(var(--g-stage-h) * ${ratioOf(it)}))` }}
            initial={{ opacity: 0, x: dir * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -50 }}
            transition={{ duration: 0.25 }}
            onClick={() => onOpen(i)}
            aria-label="Großansicht"
          >
            <EditedImage src={it.src} edit={it.edit} alt={it.alt ?? it.caption} dark={dark} onNatural={onNatural(it)} />
          </motion.button>
        </AnimatePresence>
        {items.length > 1 && (
          <>
            <button type="button" className="g-carousel-nav is-prev" onClick={() => go(-1)} aria-label="Vorheriges Bild">
              <Icon name="arrowLeft" />
            </button>
            <button type="button" className="g-carousel-nav is-next" onClick={() => go(1)} aria-label="Nächstes Bild">
              <Icon name="arrowRight" />
            </button>
          </>
        )}
      </div>
      <div className="g-carousel-foot">
        {captions && it.caption ? <p className="g-carousel-caption">{it.caption}</p> : <span />}
        <span className="g-carousel-count">
          {i + 1} / {items.length}
        </span>
      </div>
      {items.length > 1 && (
        <div className="g-thumbs">
          {items.map((t, k) => (
            <button key={t.id} type="button" className={`g-thumb${k === i ? ' is-active' : ''}`} onClick={() => (setDir(k > i ? 1 : -1), setIndex(k))} aria-label={`Bild ${k + 1}`}>
              <span className="g-thumb-frame" style={{ width: `${Math.max(100, 100 * ratioOf(t))}%` }}>
                <EditedImage src={t.src} edit={t.edit} dark={dark} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Vorher/Nachher: zweites Bild liegt über dem ersten, der Regler legt es frei. */
function Compare({ items, dark }: { items: GalleryItem[]; dark: boolean }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const [a, b] = items;
  if (!b) return <p className="b-empty">Für den Vergleich braucht es zwei Bilder – die ersten beiden der Galerie werden übereinandergelegt.</p>;

  function drag(e: ReactPointerEvent) {
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const set = (x: number) => {
      const r = el.getBoundingClientRect();
      setPos(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
    };
    set(e.clientX);
    const move = (ev: PointerEvent) => set(ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <div className="g-compare" ref={ref} onPointerDown={drag}>
      <EditedImage src={a.src} edit={a.edit} alt={a.alt ?? a.caption} dark={dark} />
      <div className="g-compare-top" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <EditedImage src={b.src} edit={b.edit} alt={b.alt ?? b.caption} dark={dark} />
      </div>
      <div className="g-compare-line" style={{ left: `${pos}%` }}>
        <span className="g-compare-knob">
          <Icon name="compare" />
        </span>
      </div>
      <span className="g-compare-label is-left">{a.caption || 'Vorher'}</span>
      <span className="g-compare-label is-right">{b.caption || 'Nachher'}</span>
      <input
        type="range"
        className="g-compare-range"
        min={0}
        max={100}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Vergleich verschieben"
      />
    </div>
  );
}
