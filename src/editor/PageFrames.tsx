import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface Frame {
  top: number;
  height: number;
}

const BREAK = 'hr[data-variant="page"]';

/**
 * Seiten-Rahmen hinter dem Text: Sobald die Notiz mindestens einen Seitenumbruch enthält,
 * liegt jede Seite in einer eigenen Karte – der Umbruch selbst ist die Lücke dazwischen.
 */
export function PageFrames({ editor }: { editor: Editor }) {
  const [frames, setFrames] = useState<Frame[]>([]);

  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    const body = dom.closest<HTMLElement>('.c-editor-body');
    const screen = body?.closest('.note-page')?.parentElement;
    let raf = 0;

    const measure = () => {
      const breaks = Array.from(dom.querySelectorAll<HTMLElement>(`:scope > ${BREAK}`));
      body?.classList.toggle('has-pages', breaks.length > 0);
      if (!breaks.length) return setFrames((f) => (f.length ? [] : f));
      const origin = (body ?? dom).getBoundingClientRect().top;
      const box = dom.getBoundingClientRect();
      // Seitlicher Überstand der Karten: höchstens 48px, aber nie über den sichtbaren Bereich hinaus.
      const host = (screen ?? document.body).getBoundingClientRect();
      const room = Math.min(box.left - host.left, host.right - box.right) - 12;
      body?.style.setProperty('--page-pad-x', `${Math.max(12, Math.min(48, room))}px`);
      // Der Umbruch enthält unten und oben je einen Innenabstand der angrenzenden Seiten, dazwischen die Lücke.
      const pad = parseFloat(getComputedStyle(dom).paddingTop) || 0;
      const next: Frame[] = [];
      let top = box.top - origin;
      for (const hr of breaks) {
        const r = hr.getBoundingClientRect();
        next.push({ top, height: r.top - origin + pad - top });
        top = r.bottom - origin - pad;
      }
      next.push({ top, height: box.bottom - origin - top });
      setFrames((f) => (JSON.stringify(f) === JSON.stringify(next) ? f : next));
    };
    // Sofort messen (bei 'update' ist das DOM schon aktuell) und im nächsten Frame noch einmal, falls sich das Layout nachzieht.
    const schedule = () => {
      measure();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    schedule();
    editor.on('update', schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(dom);
    // Seitenleiste auf/zu ändert den Platz neben dem Text, nicht aber dessen Größe.
    if (screen) ro.observe(screen);
    return () => {
      cancelAnimationFrame(raf);
      editor.off('update', schedule);
      ro.disconnect();
      body?.classList.remove('has-pages');
      body?.style.removeProperty('--page-pad-x');
    };
  }, [editor]);

  if (!frames.length) return null;
  return (
    <div className="c-page-frames" aria-hidden="true">
      {frames.map((f, i) => (
        <div key={i} className="c-page-frame" style={{ top: f.top, height: f.height }} />
      ))}
    </div>
  );
}
