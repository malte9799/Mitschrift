import type { DebugDoc } from '../debugDocs';
import { sampleCollection } from '@/blocks/collection/model';
import { emptyScene } from '@/blocks/whiteboard/WhiteboardNode';

const t = (text: string) => ({ type: 'text', text });
const h = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [t(text)] });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160" viewBox="0 0 320 160"><rect x="10" y="10" width="140" height="140" rx="16" fill="#5B5BD6"/><circle cx="235" cy="80" r="70" fill="none" stroke="#1F8A4C" stroke-width="8"/><path d="M200 80 L230 110 L275 55" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Sammlung (Datenbank), SVG-Block mit Optionen und leeres Whiteboard. */
const doc: DebugDoc = {
  key: 'sammlung-medien',
  title: 'Debug: Sammlung, SVG & Whiteboard',
  doc: {
    type: 'doc',
    content: [
      h('Sammlung'),
      { type: 'collection', attrs: { data: sampleCollection() } },
      h('SVG'),
      { type: 'svg', attrs: { svg, dark: 'keep', caption: 'SVG-Block (Rahmen, Farben, Drehen im Menü)' } },
      h('Whiteboard'),
      { type: 'whiteboard', attrs: { scene: emptyScene } },
      { type: 'paragraph' },
    ],
  },
};
export default doc;
