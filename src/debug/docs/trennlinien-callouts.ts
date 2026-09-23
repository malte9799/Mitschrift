import type { DebugDoc } from '../debugDocs';

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const callout = (variant: string) => ({ type: 'callout', attrs: { variant }, content: [p(`Callout „${variant}“ mit etwas Text.`)] });
const divider = (variant: string) => [p(`Trennlinie „${variant}“:`), { type: 'horizontalRule', attrs: { variant } }];

/** Alle Callout-Varianten und Trennlinien-Stile inkl. Seitenumbruch. */
const doc: DebugDoc = {
  key: 'trennlinien-callouts',
  title: 'Debug: Callouts & Trennlinien',
  doc: {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Callouts' }] },
      ...['note', 'tip', 'important', 'warning', 'caution'].map(callout),
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Trennlinien' }] },
      ...['dots', 'dotted', 'regular', 'bold'].flatMap(divider),
      ...divider('page'),
      p('Text nach dem Seitenumbruch (zweiter Seiten-Rahmen).'),
    ],
  },
};
export default doc;
