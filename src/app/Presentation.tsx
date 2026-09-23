import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import type { Note, Tag } from '@/storage';
import type { PMNode } from '@/export/model';
import { textOf } from '@/export/model';
import { noteExtensions } from '@/editor/extensions';
import { NoteLink } from '@/editor/NoteLink';
import { GlossaryHover } from '@/glossary/GlossaryHover';
import { Icon } from '@/ui/Icon';
import { TagChip } from '@/ui/TagChip';
import { useTags } from '@/hooks/useTags';

export interface Slide {
  /** Leere Liste = Titelfolie. */
  content: PMNode[];
  /** Index des ersten Top-Level-Blocks im Dokument (für „ab aktueller Stelle“). */
  start: number;
}

const isEmptyBlock = (n: PMNode) => n.type === 'paragraph' && !n.content?.length;

/**
 * Teilt die Notiz in Folien: Jede H1/H2 beginnt eine neue Folie, ebenso ein Seitenumbruch.
 * Davor steht immer eine Titelfolie mit Notiztitel und Fächern.
 */
export function buildSlides(doc: PMNode): Slide[] {
  const slides: Slide[] = [{ content: [], start: -1 }];
  let cur: Slide | null = null;
  (doc.content ?? []).forEach((n, i) => {
    if (n.type === 'heading' && (n.attrs?.level ?? 1) <= 2) {
      cur = { content: [n], start: i };
      slides.push(cur);
    } else if (n.type === 'horizontalRule' && n.attrs?.variant === 'page') {
      cur = { content: [], start: i + 1 };
      slides.push(cur);
    } else {
      if (!cur) {
        cur = { content: [], start: i };
        slides.push(cur);
      }
      cur.content.push(n);
    }
  });
  // Nur leere Absätze → keine eigene Folie.
  return slides.filter((s, i) => i === 0 || s.content.some((n) => !isEmptyBlock(n)));
}

/** Folie, auf der der Block mit Index `blockIndex` liegt. */
export function slideAt(slides: Slide[], blockIndex: number): number {
  let found = 0;
  slides.forEach((s, i) => {
    if (i > 0 && s.start <= blockIndex) found = i;
  });
  return found;
}

/** Überschrift oder Textanfang einer Folie – für die Übersicht. */
function slideLabel(s: Slide, title: string): string {
  if (!s.content.length) return title || 'Ohne Titel';
  const head = s.content.find((n) => n.type === 'heading');
  const text = textOf(head ?? s.content.find((n) => textOf(n).trim()) ?? { type: 'doc' }).trim();
  return text.length > 70 ? `${text.slice(0, 68)}…` : text || 'Folie';
}

/** Blöcke einer Folie, die schrittweise erscheinen (alles außer der Überschrift). */
const stepCount = (s: Slide) => s.content.filter((n, i) => !(i === 0 && n.type === 'heading')).length;

/** Logische Foliengröße; skaliert aufs Fenster – 17px Text werden auf einem 1080p-Bildschirm ~34px. */
const W = 960;
const H = 540;
const PAD_Y = 44;

interface PresentationProps {
  note: Note;
  doc: PMNode;
  startAt: number;
  onClose: () => void;
}

/** Präsentationsmodus: Notiz als Folien im Vollbild, mit Tastatursteuerung, Übersicht und Laserpointer. */
export function Presentation({ note, doc, startAt, onClose }: PresentationProps) {
  const slides = useMemo(() => buildSlides(doc), [doc]);
  const tags = useTags();
  const [index, setIndex] = useState(() => Math.min(startAt, slides.length - 1));
  const [dir, setDir] = useState(1);
  const [stepwise, setStepwise] = useState(() => {
    try {
      return localStorage.getItem('mitschrift-present-steps') === '1';
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);
  const [overview, setOverview] = useState(false);
  const [laser, setLaser] = useState(false);
  const [black, setBlack] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [idle, setIdle] = useState(false);
  const [scale, setScale] = useState(1);
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  const slide = slides[index];
  const steps = stepwise ? stepCount(slide) : 0;

  const go = useCallback(
    (to: number, atEnd = false) => {
      const next = Math.max(0, Math.min(slides.length - 1, to));
      if (next === index) return;
      setDir(next > index ? 1 : -1);
      setIndex(next);
      setStep(atEnd && stepwise ? stepCount(slides[next]) : 0);
    },
    [index, slides, stepwise],
  );
  const next = useCallback(() => {
    if (stepwise && step < steps) setStep((s) => s + 1);
    else go(index + 1);
  }, [stepwise, step, steps, go, index]);
  const prev = useCallback(() => {
    if (stepwise && step > 0) setStep((s) => s - 1);
    else go(index - 1, true);
  }, [stepwise, step, go, index]);

  // Vollbild beim Start, beim Schließen wieder verlassen.
  useEffect(() => {
    // Ganzes Dokument im Vollbild, nicht nur die Folie – sonst wären Hover-Karten und Popover (im body) unsichtbar.
    if (document.fullscreenEnabled && !document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => undefined);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  // Laufzeit-Uhr. (Esc verlässt im Vollbild erst das Vollbild, ein zweites Esc beendet.)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Folie aufs Fenster skalieren (16:9, Rand für die Steuerleiste).
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, (window.innerHeight - 8) / H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      // In Eingabefeldern (Quiz, Plotter-Regler) nicht blättern.
      if (t.closest('input, textarea, select, [contenteditable="true"]') && e.key !== 'Escape') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
        case 'Enter':
          if (overview) return;
          next();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
          if (overview) return;
          prev();
          break;
        case 'Home':
          go(0);
          break;
        case 'End':
          go(slides.length - 1);
          break;
        case 'Escape':
          if (overview) setOverview(false);
          else if (black) setBlack(false);
          else onClose();
          break;
        case 'f':
        case 'F':
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen().catch(() => undefined);
          break;
        case 'o':
        case 'O':
        case 'g':
        case 'G':
          setOverview((o) => !o);
          break;
        case 'l':
        case 'L':
          setLaser((l) => !l);
          break;
        case 'b':
        case 'B':
        case '.':
          setBlack((b) => !b);
          break;
        case 's':
        case 'S':
          toggleStepwise();
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  function toggleStepwise() {
    setStepwise((s) => {
      try {
        localStorage.setItem('mitschrift-present-steps', s ? '0' : '1');
      } catch {
        /* ignorieren */
      }
      return !s;
    });
    setStep(0);
  }

  function onMove(e: React.MouseEvent) {
    if (laser) setPointer({ x: e.clientX, y: e.clientY });
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2500);
  }
  useEffect(() => () => clearTimeout(idleTimer.current), []);

  const elapsed = Math.floor((now - started) / 1000);
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  const noteTags = (tags ?? []).filter((t) => note.tags.includes(t.id));

  return createPortal(
    <div ref={rootRef} className={`pr-root${idle && !overview ? ' is-idle' : ''}${laser ? ' has-laser' : ''}`} onMouseMove={onMove} role="dialog" aria-modal="true" aria-label="Präsentation">
      <div className="pr-stage" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={index}
            className="pr-slide"
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: 60 * d }),
              center: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: -60 * d }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {slide.content.length === 0 ? (
              <TitleSlide note={note} tags={noteTags} count={slides.length - 1} />
            ) : (
              <SlideBody content={slide.content} step={stepwise ? step : Infinity} />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="pr-progress">
          <motion.span animate={{ width: `${(index / Math.max(1, slides.length - 1)) * 100}%` }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
        </div>
      </div>

      <AnimatePresence>{black && <motion.div className="pr-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBlack(false)} />}</AnimatePresence>

      <div className="pr-bar" onMouseDown={(e) => e.preventDefault()}>
        <button type="button" aria-label="Zurück" title="Zurück (←)" onClick={prev} disabled={index === 0 && step === 0}>
          <Icon name="arrowLeft" />
        </button>
        <span className="pr-count">
          {index + 1} / {slides.length}
          {stepwise && steps > 0 && <em> · {step}/{steps}</em>}
        </span>
        <button type="button" aria-label="Weiter" title="Weiter (→, Leertaste)" onClick={next} disabled={index === slides.length - 1 && step >= steps}>
          <Icon name="arrowRight" />
        </button>
        <span className="pr-sep" />
        <button type="button" className={stepwise ? 'is-on' : ''} title="Schrittweise einblenden (S)" aria-pressed={stepwise} onClick={toggleStepwise}>
          <Icon name="steps" />
        </button>
        <button type="button" className={laser ? 'is-on' : ''} title="Laserpointer (L)" aria-pressed={laser} onClick={() => setLaser((l) => !l)}>
          <Icon name="laser" />
        </button>
        <button type="button" className={overview ? 'is-on' : ''} title="Übersicht (O)" aria-pressed={overview} onClick={() => setOverview((o) => !o)}>
          <Icon name="grid" />
        </button>
        <button
          type="button"
          title="Vollbild (F)"
          onClick={() => (document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen().catch(() => undefined))}
        >
          <Icon name="expand" />
        </button>
        <span className="pr-sep" />
        <span className="pr-clock" title="Laufzeit">
          <Icon name="clock" /> {clock}
        </span>
        <button type="button" title="Beenden (Esc)" aria-label="Präsentation beenden" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>

      <AnimatePresence>
        {overview && (
          <motion.div className="pr-overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOverview(false)}>
            <div className="pr-overview-grid" onClick={(e) => e.stopPropagation()}>
              {slides.map((s, i) => (
                <motion.button
                  key={i}
                  type="button"
                  className={`pr-thumb${i === index ? ' is-current' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => {
                    go(i);
                    setOverview(false);
                  }}
                >
                  <span className="pr-thumb-n">{i + 1}</span>
                  <span className="pr-thumb-title">{slideLabel(s, note.title)}</span>
                  <span className="pr-thumb-meta">{s.content.length ? `${stepCount(s)} Blöcke` : 'Titel'}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {laser && pointer && <span className="pr-laser" style={{ left: pointer.x, top: pointer.y }} />}
    </div>,
    document.body,
  );
}

function TitleSlide({ note, tags, count }: { note: Note; tags: Tag[]; count: number }) {
  const date = new Date(note.updatedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="pr-title">
      {tags.length > 0 && (
        <div className="pr-title-tags">
          {tags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
        </div>
      )}
      <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        {note.title || 'Ohne Titel'}
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
        {date} · {count} {count === 1 ? 'Folie' : 'Folien'}
      </motion.p>
      <p className="pr-title-hint">
        <kbd>→</kbd> weiter · <kbd>O</kbd> Übersicht · <kbd>L</kbd> Laserpointer · <kbd>Esc</kbd> beenden
      </p>
    </div>
  );
}

/**
 * Inhalt einer Folie als schreibgeschützter Editor – so funktionieren Karteikarten, Quiz,
 * Plotter & Co. auch in der Präsentation. Zu lange Folien werden verkleinert.
 */
function SlideBody({ content, step }: { content: PMNode[]; step: number }) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: true,
    extensions: [...noteExtensions, NoteLink],
    content: { type: 'doc', content },
  });
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);

  // Schrittweise: Blöcke nach dem aktuellen Schritt unsichtbar (Platz bleibt reserviert – nichts springt).
  useEffect(() => {
    if (!editor) return;
    const kids = [...(editor.view.dom as HTMLElement).children];
    const offset = content[0]?.type === 'heading' ? 1 : 0;
    kids.forEach((el, i) => el.classList.toggle('pr-hidden', i >= offset && i - offset >= step));
  }, [editor, step, content]);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const avail = H - 2 * PAD_Y;
      const needed = el.scrollHeight;
      setFit(needed > avail ? Math.max(0.55, avail / needed) : 1);
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, [editor]);

  if (!editor) return null;
  return (
    <div className="pr-body">
      <div ref={innerRef} className="pr-body-inner c-editor is-learning" style={fit < 1 ? { transform: `scale(${fit})` } : undefined}>
        <div className="c-editor-body">
          <EditorContent editor={editor} />
        </div>
        <GlossaryHover editor={editor} />
      </div>
    </div>
  );
}
