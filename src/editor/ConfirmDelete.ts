import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { ReplaceStep } from '@tiptap/pm/transform';
import { confirmDialog } from '@/ui/Dialog';

/** Aufwendige Blöcke, deren Löschen erst bestätigt werden muss – normaler Text nicht. */
const GUARDED: Record<string, string> = {
  whiteboard: 'Whiteboard',
  svg: 'SVG-Grafik',
  table: 'Tabelle',
  collection: 'Sammlung',
  mermaid: 'Mermaid-Diagramm',
  diagram: 'Diagramm',
  quiz: 'Quiz',
  flashcards: 'Karteikarten',
  codeBlock: 'Codeblock',
  timeline: 'Zeitstrahl',
  plot: 'Funktionsplotter',
  attachment: 'Datei-Anhang',
};

/** Meta für Transaktionen, die geschützte Blöcke bewusst ersetzen (z. B. Umwandeln) – ohne Nachfrage. */
export const CONFIRMED = 'confirmDelete$confirmed';

/** Leere Whiteboards und Codeblöcke sind schnell neu gemacht – die dürfen ohne Nachfrage weg. */
function hasContent(n: PMNode): boolean {
  if (n.type.name === 'whiteboard') return !!n.attrs.scene?.elements?.length;
  if (n.type.name === 'svg') return !!n.attrs.svg;
  if (n.type.name === 'codeBlock') return !!n.textContent.trim();
  if (n.type.name === 'timeline') return (n.attrs.entries as { date: string; title: string }[] | undefined)?.some((e) => e.date.trim() || e.title.trim()) ?? false;
  if (n.type.name === 'plot') return (n.attrs.fns as { expr: string }[] | undefined)?.some((f) => f.expr.trim()) ?? false;
  if (n.type.name === 'attachment') return !!n.attrs.fileId;
  return true;
}

/** Anzahl je Blocktyp – gesamt und nur die mit Inhalt. */
function counts(node: PMNode): Map<string, { total: number; filled: number }> {
  const map = new Map<string, { total: number; filled: number }>();
  node.descendants((n) => {
    const name = n.type.name;
    if (!(name in GUARDED)) return true;
    const c = map.get(name) ?? { total: 0, filled: 0 };
    c.total++;
    if (hasContent(n)) c.filled++;
    map.set(name, c);
    // Geschützte Blöcke enthalten keine weiteren geschützten.
    return false;
  });
  return map;
}

/** Namen der Blöcke mit Inhalt, die durch die Transaktion verschwinden. */
function removedBlocks(tr: Transaction): string[] {
  const after = counts(tr.doc);
  const removed: string[] = [];
  for (const [name, b] of counts(tr.before)) {
    const a = after.get(name) ?? { total: 0, filled: 0 };
    // Nur wenn Blöcke wirklich wegfallen – ein Whiteboard leer radieren oder Code leeren ist kein Löschen.
    if (a.total < b.total && a.filled < b.filled) removed.push(GUARDED[name]);
  }
  return removed;
}

/** Schneller Vorab-Test: Liegt überhaupt ein geschützter Block in einem ersetzten Bereich? */
function touchesGuarded(tr: Transaction): boolean {
  return tr.steps.some((step, i) => {
    const doc = tr.docs[i];
    let hit = false;
    step.getMap().forEach((from, to) => {
      if (hit || from === to) return;
      doc.nodesBetween(from, to, (n) => {
        if (n.type.name in GUARDED) hit = true;
        return !hit;
      });
    });
    return hit;
  });
}

/** Ganzes Dokument ersetzt (Notiz laden, setContent) – das ist kein Löschen. */
function replacesWholeDoc(tr: Transaction): boolean {
  return tr.steps.some((s) => s instanceof ReplaceStep && s.from === 0 && s.to === tr.before.content.size);
}

/**
 * Fragt nach, bevor ein aufwendiger Block (Whiteboard, Tabelle, Sammlung …) gelöscht wird –
 * egal ob per Taste, Ausschneiden oder Block-Auswahl. Rückgängig/Wiederholen fragen nicht.
 */
export const ConfirmDelete = Extension.create({
  name: 'confirmDelete',

  addProseMirrorPlugins() {
    let view: EditorView | null = null;
    let asking = false;

    return [
      new Plugin({
        key: new PluginKey('confirmDelete'),
        view(v) {
          view = v;
          return { destroy: () => (view = null) };
        },
        filterTransaction(tr, state) {
          if (!tr.docChanged || tr.getMeta(CONFIRMED) || tr.getMeta('history$') || tr.getMeta('preventUpdate') || replacesWholeDoc(tr)) return true;
          // Nur Löschungen durch Bearbeiten – im Lernmodus ändern Blöcke nur ihre Daten.
          if (!view?.editable) return true;
          if (!touchesGuarded(tr)) return true;
          const removed = removedBlocks(tr);
          if (!removed.length) return true;
          if (asking) return false;
          asking = true;
          const what = removed.length === 1 ? `${removed[0]} wirklich löschen?` : `${removed.join(', ')} wirklich löschen?`;
          void confirmDialog(what, { confirmLabel: 'Löschen', danger: true }).then((ok) => {
            asking = false;
            // Nur anwenden, wenn sich das Dokument in der Zwischenzeit nicht geändert hat.
            if (ok && view && view.state.doc === state.doc) view.dispatch(tr.setMeta(CONFIRMED, true));
          });
          return false;
        },
      }),
    ];
  },
});
