import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { jsonAttr } from '../jsonAttr';
import { PlotView } from './PlotView';
import { defaultView, type PlotFn, type PlotParam, type PlotView as View } from './geometry';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    plot: {
      insertPlot: () => ReturnType;
    };
  }
}

/** Beispiel, damit ein neuer Block sofort etwas zeigt – mit Parametern zum Ausprobieren. */
const sampleFns: PlotFn[] = [
  { expr: 'a·sin(b·x)', color: 0 },
  { expr: '0.25x^2 - 2', color: 1 },
];
const sampleParams: PlotParam[] = [
  { name: 'a', value: 2, min: -5, max: 5, step: 0.1 },
  { name: 'b', value: 1, min: 0, max: 4, step: 0.05 },
];

/** Funktionsplotter: Terme mit Schiebereglern, Nullstellen/Extrema/Schnittpunkte, Zoom und Verschieben. */
export const PlotNode = Node.create({
  name: 'plot',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      title: { default: '', parseHTML: (el) => el.getAttribute('data-title') ?? '', renderHTML: (a) => ({ 'data-title': a.title }) },
      fns: jsonAttr<PlotFn[]>('fns', sampleFns),
      params: jsonAttr<PlotParam[]>('params', sampleParams),
      view: jsonAttr<View>('view', defaultView),
      points: {
        default: true,
        parseHTML: (el) => el.getAttribute('data-points') !== 'false',
        renderHTML: (a) => ({ 'data-points': String(a.points) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-plot]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-plot': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PlotView, {
      // Ziehen und Zoomen in der Zeichenfläche gehören dem Plotter, nicht ProseMirror (Block-Auswahl, Drag).
      stopEvent: ({ event }) => !!(event.target as Element | null)?.closest?.('.p-stage, input, textarea, select, button'),
    });
  },

  addCommands() {
    return {
      insertPlot:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { fns: sampleFns, params: sampleParams, view: defaultView } }),
    };
  },
});
