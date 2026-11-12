import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './app/AppLayout';
import { HomePage } from './app/HomePage';
import { NotePage } from './app/NotePage';
import { GraphPage } from './app/GraphPage';
import { ShowcasePage } from './app/ShowcasePage';
import { HandbuchPage } from './app/HandbuchPage';
import { GlossaryPage } from './app/GlossaryPage';
import { CalendarPage } from './app/CalendarPage';
import { requestPersistence } from './storage/persist';
import { initStorage } from './storage/vault';
import { VaultGate } from './app/VaultGate';
import './styles/tokens.css';
import './styles/app.css';
import './styles/editor.css';
import './styles/blocks.css';
import './styles/codeWorkspace.css';
import './styles/codeThemes.css';
import './styles/menubar.css';
import './styles/tools.css';
import './styles/images.css';

void requestPersistence();

const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/n/:id', element: <NotePage /> },
        { path: '/graph', element: <GraphPage /> },
        { path: '/showcase', element: <ShowcasePage /> },
        { path: '/handbuch', element: <HandbuchPage /> },
        { path: '/handbuch/:key', element: <HandbuchPage /> },
        { path: '/glossar', element: <GlossaryPage /> },
        { path: '/kalender', element: <CalendarPage /> },
      ],
    },
  ],
  // BASE_URL folgt dem Vite-`base` (auf GitHub Pages: /Mitschrift/)
  { basename: import.meta.env.BASE_URL },
);

const root = ReactDOM.createRoot(document.getElementById('root')!);
const renderApp = () =>
  root.render(
    <React.StrictMode>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
    </React.StrictMode>,
  );

// Erst klären, wo die Notizen liegen (Browser-Speicher oder gewählter Ordner), dann die App zeigen.
void initStorage().then((state) => {
  if (state.kind === 'needs-permission' || state.kind === 'error') root.render(<VaultGate onReady={renderApp} />);
  else renderApp();
});
