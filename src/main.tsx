import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './app/AppLayout';
import { HomePage } from './app/HomePage';
import { NotePage } from './app/NotePage';
import { GraphPage } from './app/GraphPage';
import { ShowcasePage } from './app/ShowcasePage';
import { GlossaryPage } from './app/GlossaryPage';
import { requestPersistence } from './storage/persist';
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

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/n/:id', element: <NotePage /> },
      { path: '/graph', element: <GraphPage /> },
      { path: '/showcase', element: <ShowcasePage /> },
      { path: '/glossar', element: <GlossaryPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  </React.StrictMode>,
);
