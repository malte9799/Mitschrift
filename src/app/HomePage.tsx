import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { Icon } from '@/ui/Icon';
import { useNotes } from '@/hooks/useNotes';
import { createNote, seedIfFirstRun } from './actions';
import type { LayoutContext } from './AppLayout';

/** Startseite: öffnet die zuletzt bearbeitete Notiz oder zeigt einen leeren Zustand. */
export function HomePage() {
  const notes = useNotes();
  const [seeded, setSeeded] = useState(false);
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useOutletContext<LayoutContext>();

  useEffect(() => {
    document.title = 'Mitschrift';
    seedIfFirstRun().finally(() => setSeeded(true));
  }, []);

  if (!notes || !seeded) return null;
  if (notes.length > 0) return <Navigate to={`/n/${notes[0].id}`} replace />;

  return (
    <div className="home-empty">
      {!sidebarOpen && (
        <button type="button" className="icon-btn home-menu" onClick={toggleSidebar} aria-label="Seitenleiste einblenden">
          <Icon name="menu" />
        </button>
      )}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0.3 }}>
        <span className="home-illu" aria-hidden="true">
          <Icon name="note" />
        </span>
        <h1>Leeres Blatt</h1>
        <p>Leg deine erste Mitschrift an.</p>
        <button
          type="button"
          className="b-btn b-btn-primary"
          onClick={async () => {
            const n = await createNote();
            navigate(`/n/${n.id}`);
          }}
        >
          <Icon name="plus" /> Neue Notiz
        </button>
      </motion.div>
    </div>
  );
}
