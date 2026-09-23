import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MenuBar } from './MenuBar';
import { seedDefaultTags } from './actions';
import { seedDebugDocs } from '@/debug/debugDocs';
import { DialogHost } from '@/ui/Dialog';
import { TermDialogHost } from '@/glossary/TermDialog';
import { NAVIGATE_EVENT } from './noteLinks';
import { importLibraryFromHash } from '@/blocks/whiteboard/library';

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
    // Debug-Notizen erst danach: Ein vorhandenes „debug“-Tag würde sonst die Schulfach-Tags verhindern.
    void seedDefaultTags().then(seedDebugDocs);
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
      <DialogHost />
    </div>
  );
}
