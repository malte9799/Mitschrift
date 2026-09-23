import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DiagramView } from './DiagramView';
import { jsonAttr } from '../jsonAttr';

export type DiagramKind = 'steps' | 'timeline' | 'bars' | 'cycle';

export interface DiagramItem {
  label: string;
  text: string;
  /** Nur für Balken: Zahlenwert. */
  value?: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    diagram: {
      insertDiagram: (kind: DiagramKind) => ReturnType;
    };
  }
}

/** Beispieldaten je Art, damit ein neuer Block sofort gut aussieht. */
export const sampleItems: Record<DiagramKind, DiagramItem[]> = {
  steps: [
    { label: 'Beobachten', text: 'Ein Phänomen fällt auf und wird beschrieben.' },
    { label: 'Hypothese', text: 'Eine überprüfbare Vermutung wird formuliert.' },
    { label: 'Experiment', text: 'Die Hypothese wird unter kontrollierten Bedingungen getestet.' },
    { label: 'Auswertung', text: 'Ergebnisse werden gedeutet – Hypothese bestätigt oder verworfen.' },
  ],
  timeline: [
    { label: '1492', text: 'Kolumbus erreicht Amerika.' },
    { label: '1517', text: 'Luthers Thesen – Beginn der Reformation.' },
    { label: '1618', text: 'Beginn des Dreißigjährigen Kriegs.' },
    { label: '1789', text: 'Französische Revolution.' },
  ],
  bars: [
    { label: 'Stickstoff', text: '78 %', value: 78 },
    { label: 'Sauerstoff', text: '21 %', value: 21 },
    { label: 'Argon', text: '0,9 %', value: 0.9 },
    { label: 'Sonstige', text: '0,1 %', value: 0.1 },
  ],
  cycle: [
    { label: 'Verdunstung', text: 'Sonne erwärmt Wasser, es steigt als Dampf auf.' },
    { label: 'Kondensation', text: 'Dampf kühlt ab und bildet Wolken.' },
    { label: 'Niederschlag', text: 'Wasser fällt als Regen oder Schnee.' },
    { label: 'Abfluss', text: 'Wasser sammelt sich in Flüssen, Seen und Meeren.' },
  ],
};

export const kindLabels: Record<DiagramKind, string> = {
  steps: 'Ablauf',
  timeline: 'Zeitstrahl',
  bars: 'Balken',
  cycle: 'Kreislauf',
};

/** Diagramm-Block: dieselben Einträge, vier animierte Darstellungen. */
export const DiagramNode = Node.create({
  name: 'diagram',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      kind: { default: 'steps' as DiagramKind, parseHTML: (el) => el.getAttribute('data-kind') ?? 'steps', renderHTML: (a) => ({ 'data-kind': a.kind }) },
      title: { default: '', parseHTML: (el) => el.getAttribute('data-title') ?? '', renderHTML: (a) => ({ 'data-title': a.title }) },
      items: jsonAttr<DiagramItem[]>('items', sampleItems.steps),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-diagram]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-diagram': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramView);
  },

  addCommands() {
    return {
      insertDiagram:
        (kind) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { kind, items: sampleItems[kind] } }),
    };
  },
});
