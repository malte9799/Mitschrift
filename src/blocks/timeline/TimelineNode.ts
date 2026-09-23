import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { jsonAttr } from '../jsonAttr';
import { TimelineView } from './TimelineView';
import { sampleEntries, type TimelineEntry, type TimelineLayout } from './model';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    timeline: {
      insertTimeline: (entries?: TimelineEntry[], title?: string) => ReturnType;
    };
  }
}

/** Zeitstrahl mit echter Zeitachse: Ereignisse als Punkte, Zeiträume als Balken, Zoom und Detailansicht. */
export const TimelineNode = Node.create({
  name: 'timeline',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      title: { default: '', parseHTML: (el) => el.getAttribute('data-title') ?? '', renderHTML: (a) => ({ 'data-title': a.title }) },
      layout: {
        default: 'axis' as TimelineLayout,
        parseHTML: (el) => (el.getAttribute('data-layout') === 'list' ? 'list' : 'axis'),
        renderHTML: (a) => ({ 'data-layout': a.layout }),
      },
      entries: jsonAttr<TimelineEntry[]>('entries', sampleEntries),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-timeline]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-timeline': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TimelineView, {
      // Ziehen zum Verschieben der Achse gehört dem Zeitstrahl, Eingabefelder behalten ihren Fokus.
      stopEvent: ({ event }) => !!(event.target as Element | null)?.closest?.('.tl-scroller, input, textarea, select, button'),
    });
  },

  addCommands() {
    return {
      insertTimeline:
        (entries = sampleEntries, title = '') =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { entries, title } }),
    };
  },
});
