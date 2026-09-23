import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Note, Tag } from '@/storage';
import { previewHtml } from '@/export/html';
import { nodeImages, walk, type Assets, type PMNode } from '@/export/model';
import { resolveSrc } from '@/editor/image/files';
import { loadKatex, mathToMathml } from '@/editor/math/katex';

/** Breite, in der die Seite „gesetzt“ und dann auf die Kachel verkleinert wird. */
const PAGE_W = 640;

const cache = new Map<string, Promise<string>>();

/** Vorschau-HTML einer Notiz; je Bearbeitungsstand nur einmal berechnet. */
function loadPreview(note: Note): Promise<string> {
  const key = `${note.id}:${note.updatedAt}`;
  let html = cache.get(key);
  if (!html) {
    html = build(note).catch(() => '');
    cache.set(key, html);
  }
  return html;
}

async function build(note: Note): Promise<string> {
  if (!note.content) return '';
  const doc = JSON.parse(note.content) as PMNode;
  const top: PMNode = { type: 'doc', content: doc.content?.slice(0, 14) };
  const assets: Assets = { images: new Map(), mermaid: new Map(), math: new Map() };
  const images = new Set<string>();
  const math: { latex: string; display: boolean }[] = [];
  walk(top, (n) => {
    for (const img of nodeImages(n)) images.add(img.src);
    if ((n.type === 'mathInline' || n.type === 'mathBlock') && n.attrs?.latex?.trim()) math.push({ latex: n.attrs.latex, display: n.type === 'mathBlock' });
  });
  await Promise.all([
    ...[...images].map(async (src) => {
      const url = await resolveSrc(src).catch(() => '');
      if (url) assets.images.set(src, { url, width: 0, height: 0 });
    }),
    math.length
      ? loadKatex().then(() => {
          for (const { latex, display } of math) {
            const mathml = mathToMathml(latex, display);
            if (mathml) assets.math.set(`${display}:${latex}`, mathml);
          }
        })
      : Promise.resolve(),
  ]);
  return previewHtml(top, assets);
}

interface NotePreviewProps {
  note: Note;
  tags: Tag[];
  /** `fixed`: Höhe kommt aus dem CSS (Raster, Liste). `natural`: so hoch wie der Inhalt, begrenzt (Mosaik). */
  fit: 'fixed' | 'natural';
}

/** Verkleinerte, echte Seitenansicht einer Notiz – wird erst gerendert, wenn sie ins Bild scrollt. */
export function NotePreview({ note, tags, fit }: NotePreviewProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [scale, setScale] = useState(0);
  const [pageH, setPageH] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    loadPreview(note).then((h) => alive && setHtml(h));
    return () => {
      alive = false;
    };
  }, [visible, note]);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const page = pageRef.current;
    if (!box || !page) return;
    const ro = new ResizeObserver(() => {
      setScale(box.clientWidth / PAGE_W);
      setPageH(page.offsetHeight);
    });
    ro.observe(box);
    ro.observe(page);
    return () => ro.disconnect();
  }, []);

  const noteTags = note.tags.map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => !!t);
  const style: React.CSSProperties = {};
  if (fit === 'natural' && scale) {
    // Kurze Notizen nicht winzig, lange nicht endlos – zwischen quer und leicht hochkant.
    const w = PAGE_W * scale;
    style.height = Math.round(Math.min(Math.max(pageH * scale, w * 0.55), w * 1.45));
  }

  return (
    <div ref={boxRef} className={`pv pv-${fit}`} style={style} aria-hidden="true">
      <div ref={pageRef} className="pv-page" style={{ width: PAGE_W, transform: `scale(${scale})`, opacity: scale ? 1 : 0 }}>
        <h1 className="pv-title">{note.title.trim() || 'Ohne Titel'}</h1>
        {noteTags.length > 0 && (
          <div className="pv-tags">
            {noteTags.map((t) => (
              <span key={t.id} className="pv-tag" data-color={t.color}>
                {t.name}
              </span>
            ))}
          </div>
        )}
        {html === null ? null : html ? (
          <div className="pv-body" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="pv-empty">Noch kein Inhalt</p>
        )}
      </div>
    </div>
  );
}
