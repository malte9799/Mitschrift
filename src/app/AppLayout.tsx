import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MenuBar } from './MenuBar';
import { seedDefaultTags, dedupeTags, purgeOldTrash } from './actions';
import { seedDebugDocs } from '@/debug/debugDocs';
import { DialogHost, alertDialog } from '@/ui/Dialog';
import { TermDialogHost } from '@/glossary/TermDialog';
import { EventDialogHost } from './EventDialog';
import { CommandPalette } from './CommandPalette';
import { NAVIGATE_EVENT } from './noteLinks';
import { importLibraryFromHash } from '@/blocks/whiteboard/library';
import { onExternalChange, onStorageError } from '@/storage/changes';
import { notifyNotesChanged } from '@/hooks/useNotes';
import { notifyTagsChanged } from '@/hooks/useTags';
import { reloadTerms } from '@/glossary/store';
import { reloadEvents } from './eventStore';
import { getVaultState } from '@/storage/vault';

const COLLAPSED_KEY = 'mitschrift-sidebar-collapsed';

export interface LayoutContext {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

/** Grundgerüst: Menüleiste oben, linke Notizleiste + Inhalt. */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) !== '1' && window.innerWidth > 860;
    } catch {
      return true;
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    // Debug-Notizen erst danach: Ein vorhandenes „debug“-Tag würde sonst die Start-Tags verhindern.
    void seedDefaultTags().then(seedDebugDocs);
    // Einmalige Pflege: Tags mit gleichem Namen zusammenführen (sonst doppelt in der Gruppierung).
    void dedupeTags();
    void purgeOldTrash();
  }, []);

  // Notiz-Ordner von außen geändert (anderes Programm, anderer Tab, Sync-Dienst): Ansichten neu laden.
  useEffect(
    () =>
      onExternalChange((c) => {
        if (c.notes.length) notifyNotesChanged();
        if (c.tags) notifyTagsChanged();
        if (c.terms) void reloadTerms();
        if (c.events) void reloadEvents();
      }),
    [],
  );

  // Schreiben in den Ordner fehlgeschlagen – einmal melden, nicht bei jedem Tastendruck.
  useEffect(() => {
    let shown = false;
    return onStorageError(() => {
      if (shown) return;
      shown = true;
      const message =
        getVaultState().kind === 'folder'
          ? 'Mitschrift konnte nicht in den Notiz-Ordner schreiben. Vielleicht wurde er verschoben oder der Zugriff entzogen. ' +
            'Deine letzten Änderungen sind noch nicht gesichert. Lade die Seite neu, um den Zugriff wieder zu erlauben.'
          : 'Mitschrift konnte deine letzten Änderungen nicht im Browser speichern – vielleicht ist der Speicher voll. ' +
            'Es wird automatisch erneut versucht. Schließe das Fenster nicht, solange der Punkt neben dem Titel rot ist.';
      void alertDialog(message).then(() => {
        shown = false;
      });
    });
  }, []);

  // Rückweg von libraries.excalidraw.com („Zu Excalidraw hinzufügen“) – beim Laden und bei weiteren Klicks.
  useEffect(() => {
    const onHash = () => void importLibraryFromHash();
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Interne Links im Editor navigieren über dieses Event.
  useEffect(() => {
    const onNavigate = (e: Event) => navigate((e as CustomEvent<string>).detail);
    window.addEventListener(NAVIGATE_EVENT, onNavigate);
    return () => window.removeEventListener(NAVIGATE_EVENT, onNavigate);
  }, [navigate]);

  // Nur bewusstes Umschalten merken – nicht das automatische Zuklappen auf schmalen Fenstern.
  const toggleSidebar = () =>
    setSidebarOpen((o) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, o ? '1' : '0');
      } catch {
        /* ignorieren */
      }
      return !o;
    });

  return (
    <div className={`app${sidebarOpen ? ' has-sidebar' : ''}`}>
      <MenuBar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Outlet context={{ sidebarOpen, toggleSidebar } satisfies LayoutContext} />
      </div>
      <TermDialogHost />
      <EventDialogHost />
      <CommandPalette />
      <DialogHost />
    </div>
  );
}
