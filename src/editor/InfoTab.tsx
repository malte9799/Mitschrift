import { Icon } from '@/ui/Icon';
import type { Note } from '@/storage';

interface InfoTabProps {
  note: Note;
  onToggleStar: () => void;
  onDelete: () => void;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatRelative(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  const diff = now.getTime() - ts;
  const days = Math.floor(diff / DAY);
  if (days <= 0) {
    // Vor Mitternacht, aber weniger als 24h: "gestern" statt "vor 0 Tagen".
    return 'gestern';
  }
  if (days === 1) return 'vor 1 Tag';
  if (days < 30) return `vor ${days} Tagen`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'vor 1 Monat';
  if (months < 12) return `vor ${months} Monaten`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'vor 1 Jahr' : `vor ${years} Jahren`;
}

/** Info-Tab: Metadaten zur Notiz sowie Markieren/Löschen-Aktionen. */
export function InfoTab({ note, onToggleStar, onDelete }: InfoTabProps) {
  const words = countWords(note.content);
  const blocks = countBlocks(note.content);
  return (
    <div className="c-info-tab">
      <dl className="c-info-tab-meta">
        <div>
          <dt>Erstellt</dt>
          <dd title={formatDateTime(note.createdAt)}>{formatRelative(note.createdAt)}</dd>
        </div>
        <div>
          <dt>Geändert</dt>
          <dd title={formatDateTime(note.updatedAt)}>{formatRelative(note.updatedAt)}</dd>
        </div>
        <div>
          <dt>Wörter</dt>
          <dd>{words}</dd>
        </div>
        <div>
          <dt>Blöcke</dt>
          <dd>{blocks}</dd>
        </div>
      </dl>

      <div className="c-info-tab-actions">
        <button type="button" className={note.starred ? 'active' : ''} onClick={onToggleStar}>
          <Icon name="star" />
          {note.starred ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
        </button>
        <button type="button" className="danger" onClick={onDelete}>
          <Icon name="trash" />
          Löschen
        </button>
      </div>
    </div>
  );
}

function countWords(content: string): number {
  if (!content) return 0;
  const text: string[] = [];
  const walk = (n: { text?: string; content?: unknown[] }) => {
    if (n.text) text.push(n.text);
    n.content?.forEach((c) => walk(c as typeof n));
  };
  try {
    walk(JSON.parse(content));
  } catch {
    return 0;
  }
  return text.join(' ').split(/\s+/).filter(Boolean).length;
}

/** Zählt die Top-Level-Blöcke im Dokument (Absätze, Überschriften, Rich Blocks, ...). */
function countBlocks(content: string): number {
  if (!content) return 0;
  try {
    const doc = JSON.parse(content) as { content?: unknown[] };
    return doc.content?.length ?? 0;
  } catch {
    return 0;
  }
}
