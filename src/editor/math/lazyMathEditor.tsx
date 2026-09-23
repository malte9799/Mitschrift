import { lazy } from 'react';
import { loadKatex } from './katex';

/** MathLive ist groß – erst laden, wenn eine Formel bearbeitet wird (KaTeX vorher für Schriften und Knöpfe). */
export const LazyMathEditor = lazy(() => loadKatex().then(() => import('./MathEditor')));
