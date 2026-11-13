import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { storage, type TrashedNote } from '@/storage';
import { confirmDialog } from '@/ui/Dialog';
import { notifyNotesChanged } from '@/hooks/useNotes';
import { purgeNote, restoreNote, TRASH_DAYS } from './actions';
import { noteText } from './noteText';
import { noteHref } from './noteLinks';
import type { LayoutContext } from './AppLayout';

const DAY = 86_400_000;

function deletedLabel(ts: number) {
  const days = Math.floor((Date.now() - ts) / DAY);
  const left = Math.max(0, TRASH_DAYS - days);
  const when = days === 0 ? 'heute' : days === 1 ? 'gestern' : `vor ${days} Tagen`;
  return `Gelöscht ${when} · ${left === 0 ? 'wird bald endgültig gelöscht' : `noch ${left} ${left === 1 ? 'Tag' : 'Tage'}`}`;
}

/** Papierkorb: gelöschte Notizen wiederherstellen oder endgültig löschen. */
export function TrashPage() {
  const { sidebarOpen, toggleSidebar } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();
  const [items, setItems] = useState<TrashedNote[] | null>(null);

  const load = useCallback(() => {
    void storage.listTrash().then(setItems);
  }, []);
  useEffect(load, [load]);

  async function restore(n: TrashedNote) {
    const note = await restoreNote(n.id);
    load();
    if (note) navigate(noteHref(note.id));
  }

  async function purge(n: TrashedNote) {
    const ok = await confirmDialog(`„${n.title || 'Ohne Titel'}“ endgültig löschen? Das lässt sich nicht rückgängig machen.`, {
      confirmLabel: 'Endgültig löschen',
      danger: true,
    });
    if (!ok) return;
    await purgeNote(n.id);
    load();
  }

  async function emptyTrash() {
    if (!items?.length) return;
    const ok = await confirmDialog(
      `Papierkorb leeren? ${items.length === 1 ? 'Eine Notiz wird' : `${items.length} Notizen werden`} endgültig gelöscht. Das lässt sich nicht rückgängig machen.`,
      { confirmLabel: 'Papierkorb leeren', danger: true },
    );
    if (!ok) return;
    for (const n of items) await purgeNote(n.id);
    load();
    notifyNotesChanged();
  }

  return (
    <div className="cal-screen">
      <header className="note-bar graph-bar">
        <div className="note-bar-left">
          <button type="button" className="icon-btn" onClick={toggleSidebar} aria-label={sidebarOpen ? 'Seitenleiste ausblenden' : 'Seitenleiste einblenden'}>
            <Icon name="menu" />
          </button>
          <h1 className="graph-title">Papierkorb</h1>
          {items && <span className="graph-stats">{items.length === 1 ? '1 Notiz' : `${items.length} Notizen`}</span>}
        </div>
      </header>

      <main className="cal-page trash-page">
        <div className="trash-head">
          <p className="trash-hint">Gelöschte Notizen bleiben {TRASH_DAYS} Tage hier und werden danach endgültig gelöscht.</p>
          {!!items?.length && (
            <button type="button" className="b-btn" onClick={() => void emptyTrash()}>
              <Icon name="trash" /> Papierkorb leeren
            </button>
          )}
        </div>

        {items && items.length === 0 && (
          <div className="trash-empty">
            <Icon name="trash" />
            <p>Der Papierkorb ist leer.</p>
          </div>
        )}

        {!!items?.length && (
          <ul className="trash-list">
            {items.map((n) => (
              <li key={n.id} className="trash-item">
                <div className="trash-text">
                  <span className="trash-title">{n.title || 'Ohne Titel'}</span>
                  <span className="trash-meta">{deletedLabel(n.trashedAt)}</span>
                  {noteText(n) && <span className="trash-preview">{noteText(n).slice(0, 160)}</span>}
                </div>
                <div className="trash-actions">
                  <button type="button" className="b-btn" onClick={() => void restore(n)}>
                    Wiederherstellen
                  </button>
                  <button type="button" className="icon-btn trash-purge" onClick={() => void purge(n)} aria-label="Endgültig löschen" title="Endgültig löschen">
                    <Icon name="x" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
