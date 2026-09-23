import type { DebugDoc } from '../debugDocs';
import { sampleItems } from '@/blocks/diagram/DiagramNode';
import { sampleMermaid } from '@/blocks/mermaid/MermaidNode';
import { sampleEntries } from '@/blocks/timeline/model';

const t = (text: string) => ({ type: 'text', text });
const h = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [t(text)] });
const diagram = (kind: keyof typeof sampleItems) => ({ type: 'diagram', attrs: { kind, items: sampleItems[kind] } });

/** Werkzeuge & Visualisierungen: Zeitstrahl, Funktionsplot, Diagramme, Mermaid, Abkürzungsverzeichnis. */
const doc: DebugDoc = {
  key: 'visualisierungen',
  title: 'Debug: Werkzeuge & Visualisierungen',
  doc: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [t('Das Domain Name System (DNS) übersetzt Namen. Der DNS-Server nutzt UDP.')] },
      h('Zeitstrahl (Achse)'),
      { type: 'timeline', attrs: { title: 'Deutsche Geschichte', layout: 'axis', entries: sampleEntries } },
      h('Zeitstrahl (Liste)'),
      { type: 'timeline', attrs: { layout: 'list', entries: sampleEntries.slice(0, 4) } },
      h('Funktionsplot'),
      { type: 'plot', attrs: { title: 'Sinus mit Parametern' } },
      h('Ablauf, Zeitstrahl, Balken, Kreislauf'),
      diagram('steps'),
      diagram('timeline'),
      diagram('bars'),
      diagram('cycle'),
      h('Mermaid'),
      { type: 'mermaid', attrs: { code: sampleMermaid } },
      h('Abkürzungsverzeichnis'),
      { type: 'glossaryList', attrs: { scope: 'all' } },
      { type: 'paragraph' },
    ],
  },
};
export default doc;
