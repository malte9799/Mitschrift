import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { getHighlight, getMatcher, subscribeTerms } from './store';

const key = new PluginKey<DecorationSet>('glossary');

/** Ruhezeit nach der letzten Tastatureingabe, bevor das ganze Dokument neu nach Begriffen durchsucht wird. */
const RESCAN_DELAY = 250;

/** In Code und Links keine Begriffe markieren. */
const SKIP_MARKS = new Set(['code', 'link', 'cloze']);

/**
 * Markiert Glossar-Begriffe im Text. Das erste Vorkommen je Begriff ist unterstrichen,
 * alle weiteren zeigen die Erklärung nur beim Überfahren – sonst wird ein IT-Text schnell unruhig.
 */
function decorate(doc: PMNode): DecorationSet {
  if (!getHighlight()) return DecorationSet.empty;
  const matcher = getMatcher();
  const decos: Decoration[] = [];
  const seen = new Set<string>();
  doc.descendants((node, pos) => {
    if (node.type.name === 'codeBlock') return false;
    if (!node.isText || !node.text) return;
    if (node.marks.some((m) => SKIP_MARKS.has(m.type.name))) return;
    for (const m of matcher.find(node.text)) {
      const first = !seen.has(m.term.id);
      seen.add(m.term.id);
      decos.push(
        Decoration.inline(pos + m.index, pos + m.index + m.length, {
          class: first ? 'gl-term is-first' : 'gl-term',
          'data-term': m.term.id,
        }),
      );
    }
  });
  return DecorationSet.create(doc, decos);
}

export const GlossaryHighlight = Extension.create({
  name: 'glossaryHighlight',

  onCreate() {
    // Neue/geänderte Begriffe oder Hervorhebung aus: neu markieren, ohne das Dokument zu ändern.
    const unsubscribe = subscribeTerms(() => {
      if (this.editor.isDestroyed) return;
      this.editor.view.dispatch(this.editor.state.tr.setMeta(key, true).setMeta('addToHistory', false));
    });
    this.editor.on('destroy', unsubscribe);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: (_, state) => decorate(state.doc),
          // Meta = Neuberechnung (Begriffe geändert oder Ruhe nach dem Tippen). Bei Dokumentänderungen
          // bleiben die alten Markierungen einstweilen stehen (mit verschobenen Positionen), der teure Scan folgt gebündelt.
          apply: (tr, old, _prev, state) => (tr.getMeta(key) ? decorate(state.doc) : tr.docChanged ? old.map(tr.mapping, tr.doc) : old),
        },
        view: () => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          return {
            update: (v, prev) => {
              if (v.state.doc.eq(prev.doc)) return;
              clearTimeout(timer);
              timer = setTimeout(() => {
                if (v.isDestroyed) return;
                v.dispatch(v.state.tr.setMeta(key, true).setMeta('addToHistory', false));
              }, RESCAN_DELAY);
            },
            destroy: () => clearTimeout(timer),
          };
        },
        props: {
          decorations: (state) => key.getState(state),
        },
      }),
    ];
  },
});
