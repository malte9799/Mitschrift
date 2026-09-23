import { useEffect, useState, type CSSProperties } from 'react';
import { resolveSrc } from './files';
import { cssFilter, fullCrop, isFullCrop, isQuarter, type ImageEdit } from './model';

export interface NaturalSize {
  w: number;
  h: number;
}

/** Blob-/Web-URL zu einer Bildquelle (`file:<id>` oder Link). */
export function useResolvedSrc(src: string): string {
  const [url, setUrl] = useState(() => (src.startsWith('file:') ? '' : src));
  useEffect(() => {
    let alive = true;
    if (!src.startsWith('file:')) setUrl(src);
    else resolveSrc(src).then((u) => alive && setUrl(u), () => alive && setUrl(''));
    return () => {
      alive = false;
    };
  }, [src]);
  return url;
}

interface EditedImageProps {
  src: string;
  edit?: ImageEdit | null;
  alt?: string;
  dark?: boolean;
  /** Zuschnitt ignorieren (Zuschneide-Ansicht zeigt das ganze Bild). */
  ignoreCrop?: boolean;
  /** Farben ignorieren. */
  ignoreFilters?: boolean;
  className?: string;
  style?: CSSProperties;
  onNatural?: (size: NaturalSize) => void;
  onError?: () => void;
}

/**
 * Bild mit Zuschnitt, Drehung, Spiegelung und Farbfiltern – rein per CSS, das Original bleibt.
 * Füllt die Breite des Elternelements; die Höhe ergibt sich aus dem Seitenverhältnis.
 */
export function EditedImage({ src, edit, alt = '', dark = false, ignoreCrop, ignoreFilters, className = '', style, onNatural, onError }: EditedImageProps) {
  const url = useResolvedSrc(src);
  const [nat, setNat] = useState<NaturalSize | null>(null);
  const filter = ignoreFilters ? (dark && edit?.darkInvert ? cssFilter({ darkInvert: true }, true) : '') : cssFilter(edit, dark);
  const crop = !ignoreCrop && edit?.crop && !isFullCrop(edit.crop) ? edit.crop : fullCrop;
  const rotate = edit?.rotate ?? 0;
  const transformed = crop !== fullCrop || rotate || edit?.flipH || edit?.flipV;

  const img = (
    <img
      src={url || undefined}
      alt={alt}
      draggable={false}
      onLoad={(e) => {
        const el = e.currentTarget;
        const size = { w: el.naturalWidth, h: el.naturalHeight };
        setNat(size);
        onNatural?.(size);
      }}
      onError={onError}
      style={
        transformed && nat
          ? {
              position: 'absolute',
              maxWidth: 'none',
              width: `${100 / crop.w}%`,
              height: `${100 / crop.h}%`,
              left: `${(-crop.x / crop.w) * 100}%`,
              top: `${(-crop.y / crop.h) * 100}%`,
              filter: filter || undefined,
            }
          : { filter: filter || undefined }
      }
    />
  );

  if (!transformed || !nat) {
    return (
      <span className={`ie-img ${className}`} style={style}>
        {img}
      </span>
    );
  }

  // Ausschnitt in Pixeln; gedreht um 90°/270° tauschen Breite und Höhe.
  const cw = nat.w * crop.w;
  const ch = nat.h * crop.h;
  const quarter = isQuarter(edit);
  const outerRatio = quarter ? ch / cw : cw / ch;
  return (
    <span className={`ie-img is-transformed ${className}`} style={{ ...style, aspectRatio: `${outerRatio}` }}>
      <span
        className="ie-img-inner"
        style={{
          width: quarter ? `${(cw / ch) * 100}%` : '100%',
          aspectRatio: `${cw / ch}`,
          transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${edit?.flipH ? -1 : 1}, ${edit?.flipV ? -1 : 1})`,
        }}
      >
        {img}
      </span>
    </span>
  );
}
