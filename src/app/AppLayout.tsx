import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const COLLAPSED_KEY = 'mitschrift-sidebar-collapsed';

export interface LayoutContext {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

/** Grundgerüst: linke Notizleiste + Inhalt. */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) !== '1' && window.innerWidth > 860;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, sidebarOpen ? '0' : '1');
    } catch {
      /* ignorieren */
    }
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((o) => !o);

  return (
    <div className={`app${sidebarOpen ? ' has-sidebar' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Outlet context={{ sidebarOpen, toggleSidebar } satisfies LayoutContext} />
      </div>
    </div>
  );
}
