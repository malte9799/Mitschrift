import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Note } from '@/storage';
import { resolveSrc } from '@/editor/image/files';

interface PMJson {
  type: string;
  attrs?: Record<string, any>;
  content?: PMJson[];
  text?: string;
}

function parse(content: string): PMJson | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as PMJson;
  } catch {
    return null;
  }
}

const textOf = (n: PMJson): string => (n.type === 'text' ? n.text ?? '' : (n.content ?? []).map(textOf).join(n.type === 'paragraph' ? '' : ' '));

/** Automatischer Untertitel: der erste Text der Notiz (ohne Überschriften), gekürzt. */
export function noteExcerpt(note: Note, max = 140): string {
  const doc = parse(note.content);
  if (!doc) return '';
  const parts: string[] = [];
  let len = 0;
  const walk = (n: PMJson) => {
    if (len > max) return;
    if (n.type === 'paragraph' || n.type === 'listItem' || n.type === 'taskItem') {
      const t = textOf(n).trim();
      if (t) {
        parts.push(t);
        len += t.length;
      }
      return;
    }
    n.content?.forEach(walk);
  };
  walk(doc);
  const s = parts.join(' · ');
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** Bezeichnung für Blöcke, die in der Mini-Vorschau nur als Platzhalter erscheinen. */
const blockLabels: Record<string, string> = {
  table: 'Tabelle',
  collection: 'Sammlung',
  quiz: 'Quiz',
  flashcards: 'Karteikarten',
  mermaid: 'Diagramm',
  diagram: 'Diagramm',
  whiteboard: 'Whiteboard',
  svg: 'Grafik',
  mathBlock: 'Formel',
};

function PreviewImage({ src }: { src: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    resolveSrc(src)
      .then((u) => alive && setUrl(u))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [src]);
  return url ? <img src={url} alt="" /> : <div className="np-img-ph" />;
}

/** Vereinfachtes Rendering der ersten Blöcke – genug für eine erkennbare Miniatur. */
function renderBlocks(nodes: PMJson[] | undefined, budget: { n: number }): ReactNode[] {
  const out: ReactNode[] = [];
  for (const [i, n] of (nodes ?? []).entries()) {
    if (budget.n <= 0) break;
    budget.n--;
    const text = textOf(n);
    switch (n.type) {
      case 'heading':
        out.push(<div key={i} className={`np-h${n.attrs?.level ?? 1}`}>{text}</div>);
        break;
      case 'paragraph':
        out.push(<p key={i}>{text || ' '}</p>);
        break;
      case 'bulletList':
      case 'orderedList':
      case 'taskList':
        out.push(
          <ul key={i} className={`np-list is-${n.type}`}>
            {(n.content ?? []).slice(0, 6).map((li, j) => (
              <li key={j} className={li.attrs?.checked ? 'is-done' : undefined}>
                {textOf(li)}
              </li>
            ))}
          </ul>,
        );
        break;
      case 'blockquote':
      case 'callout':
      case 'toggleBlock':
        out.push(
          <div key={i} className={`np-box is-${n.type}`}>
            {n.type === 'toggleBlock' && n.attrs?.summary ? <b>{n.attrs.summary} </b> : null}
            {text}
          </div>,
        );
        break;
      case 'codeBlock':
        out.push(
          <pre key={i} className="np-code">
            {text.split('\n').slice(0, 8).join('\n')}
          </pre>,
        );
        break;
      case 'image':
        out.push(
          <div key={i} className="np-img">
            <PreviewImage src={n.attrs?.src ?? ''} />
          </div>,
        );
        break;
      case 'horizontalRule':
        out.push(<hr key={i} />);
        break;
      case 'noteBlock':
        out.push(
          <div key={i} className="np-box is-note">
            ▢ {n.attrs?.title || 'Notiz'}
          </div>,
        );
        break;
      case 'smartLink':
        out.push(
          <div key={i} className="np-box is-note">
            ↗ {n.attrs?.title || n.attrs?.href || 'Link'}
          </div>,
        );
        break;
      default:
        out.push(
          <div key={i} className="np-ph">
            {blockLabels[n.type] ?? ''}
          </div>,
        );
    }
  }
  return out;
}

/** Breite, in der die Miniatur „gesetzt“ wird, bevor sie auf die Kachel skaliert wird. */
const PAGE_W = 560;

/**
 * Mini-Seite der Notiz: echter Titel und die ersten Blöcke in Originalgröße gesetzt
 * und dann verkleinert – so sieht man die obere Ecke des Dokuments.
 */
export function NotePreview({ note }: { note: Note }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / PAGE_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const doc = parse(note.content);
  return (
    <div className="np-sheet" ref={ref} aria-hidden="true">
      <div className="np-page" style={{ width: PAGE_W, transform: `scale(${scale})` }}>
        <div className="np-title">{note.title || 'Ohne Titel'}</div>
        {renderBlocks(doc?.content, { n: 14 })}
      </div>
    </div>
  );
}
