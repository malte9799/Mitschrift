import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MenuBar } from './MenuBar';
import { seedDefaultTags } from './actions';
import { DialogHost } from '@/ui/Dialog';

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

  useEffect(() => {
    void seedDefaultTags();
  }, []);

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
      <DialogHost />
    </div>
  );
}
