import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { useDarkMode } from '@/hooks/useDarkMode';
import { EditedImage } from './EditedImage';
import { isRemote, outputSize, type ImageEdit } from './model';

export interface LightboxItem {
  src: string;
  edit?: ImageEdit | null;
  caption?: string | null;
  alt?: string | null;
  /** Ursprünglicher Dateiname beim Hochladen, falls bekannt. */
  filename?: string | null;
}

interface LightboxProps {
  items: LightboxItem[];
  index: number;
  onIndex?: (i: number) => void;
  onClose: () => void;
}

/** Großansicht über der ganzen App: Pfeiltasten blättern, Klick aufs Bild vergrößert, Esc schließt. */
export function Lightbox({ items, index: initial, onIndex, onClose }: LightboxProps) {
  const dark = useDarkMode();
  const [index, setIndex] = useState(initial);
  const [zoom, setZoom] = useState(false);
  const [dir, setDir] = useState(0);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const item = items[index];
  const many = items.length > 1;

  const go = (step: number) => {
    if (!many) return;
    setDir(step);
    setZoom(false);
    setSize(null);
    setIndex((i) => {
      const next = (i + step + items.length) % items.length;
      onIndex?.(next);
      return next;
    });
  };
  const goRef = { current: go };
  goRef.current = go;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goRef.current(1);
      else if (e.key === 'ArrowLeft') goRef.current(-1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    }
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  if (!item) return null;
  return createPortal(
    <motion.div className="lb" data-own-keys="" role="dialog" aria-modal="true" aria-label="Bildansicht" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <div className="lb-top" onClick={(e) => e.stopPropagation()}>
        {many && (
          <span className="lb-count">
            {index + 1} / {items.length}
          </span>
        )}
        {item.filename && (
          <span className="lb-filename" title={item.filename}>
            {item.filename}
          </span>
        )}
        <span className="lb-spacer" />
        {isRemote(item.src) && (
          <a className="lb-btn" href={item.src} target="_blank" rel="noreferrer noopener" title="Quelle öffnen">
            <Icon name="external" />
          </a>
        )}
        <button type="button" className="lb-btn" onClick={() => setZoom((z) => !z)} title={zoom ? 'Einpassen' : 'Vergrößern'}>
          <Icon name={zoom ? 'zoomOut' : 'zoomIn'} />
        </button>
        <button type="button" className="lb-btn" onClick={onClose} title="Schließen (Esc)">
          <Icon name="x" />
        </button>
      </div>

      <div className={`lb-stage${zoom ? ' is-zoomed' : ''}`}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={index}
            className="lb-frame"
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.22 }}
            // Eingepasst: so groß wie möglich im Fenster; vergrößert: Originalgröße (mindestens doppelt so groß).
            style={
              size
                ? {
                    width: zoom
                      ? `max(${size.w}px, calc(2 * min(92vw, (100vh - 140px) * ${size.w / size.h})))`
                      : `min(92vw, (100vh - 140px) * ${size.w / size.h}, ${Math.max(size.w, 320)}px)`,
                  }
                : { visibility: 'hidden' }
            }
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => !z);
            }}
          >
            <EditedImage
              src={item.src}
              edit={item.edit}
              alt={item.alt ?? ''}
              dark={dark}
              className="lb-img"
              onNatural={(n) => setSize(outputSize(n, item.edit))}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {many && (
        <>
          <button type="button" className="lb-nav is-prev" aria-label="Vorheriges Bild" onClick={(e) => (e.stopPropagation(), go(-1))}>
            <Icon name="arrowLeft" />
          </button>
          <button type="button" className="lb-nav is-next" aria-label="Nächstes Bild" onClick={(e) => (e.stopPropagation(), go(1))}>
            <Icon name="arrowRight" />
          </button>
        </>
      )}
      {item.caption && (
        <p className="lb-caption" onClick={(e) => e.stopPropagation()}>
          {item.caption}
        </p>
      )}
    </motion.div>,
    document.body,
  );
}
