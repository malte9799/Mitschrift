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

/** Info-Tab: Metadaten zur Notiz sowie Markieren/Löschen-Aktionen. */
export function InfoTab({ note, onToggleStar, onDelete }: InfoTabProps) {
  const words = countWords(note.content);
  return (
    <div className="c-info-tab">
      <dl className="c-info-tab-meta">
        <div>
          <dt>Erstellt</dt>
          <dd>{formatDateTime(note.createdAt)}</dd>
        </div>
        <div>
          <dt>Geändert</dt>
          <dd>{formatDateTime(note.updatedAt)}</dd>
        </div>
        <div>
          <dt>Wörter</dt>
          <dd>{words}</dd>
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
