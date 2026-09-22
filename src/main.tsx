import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './app/AppLayout';
import { HomePage } from './app/HomePage';
import { NotePage } from './app/NotePage';
import './styles/tokens.css';
import './styles/app.css';
import './styles/editor.css';
import './styles/blocks.css';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/n/:id', element: <NotePage /> },
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
