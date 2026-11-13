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
import { ErrorPage } from './app/ErrorPage';
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
      // Stürzt das Gerüst selbst ab: Fehlerseite über den ganzen Schirm.
      errorElement: <ErrorPage />,
      children: [
        {
          // Stürzt eine Seite ab: Fehlerseite im Inhaltsbereich, Menü- und Seitenleiste bleiben benutzbar.
          errorElement: <ErrorPage />,
          children: [
            { path: '/', element: <HomePage /> },
            { path: '/n/:id', element: <NotePage /> },
            { path: '/graph', element: <GraphPage /> },
            { path: '/showcase', element: <ShowcasePage /> },
            { path: '/handbuch', element: <HandbuchPage /> },
            { path: '/handbuch/:key', element: <HandbuchPage /> },
            { path: '/glossar', element: <GlossaryPage /> },
            { path: '/kalender', element: <CalendarPage /> },
            { path: '*', element: <ErrorPage /> },
          ],
        },
      ],
    },
  ],
  // BASE_URL folgt dem Vite-`base` (eigene Domain: /).
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
initStorage()
  .then((state) => {
    if (state.kind === 'needs-permission' || state.kind === 'error') root.render(<VaultGate onReady={renderApp} />);
    else renderApp();
  })
  .catch((err: unknown) => {
    // Speicher ließ sich gar nicht öffnen – trotzdem etwas zeigen statt eines weißen Schirms.
    console.error('Mitschrift: Speicher konnte nicht geöffnet werden', err);
    root.render(
      <div className="vault-gate" role="alert">
        <div className="vault-gate-card">
          <span className="mb-about-logo" aria-hidden="true" />
          <h1>Speicher nicht verfügbar</h1>
          <p>
            Mitschrift konnte den Speicher nicht öffnen. Das passiert z. B. in einem privaten Fenster oder wenn der Browser die
            Website-Daten blockiert.
          </p>
          <div className="vault-gate-actions">
            <button type="button" className="b-btn b-btn-primary" onClick={() => window.location.reload()} autoFocus>
              Neu laden
            </button>
          </div>
        </div>
      </div>,
    );
  });
