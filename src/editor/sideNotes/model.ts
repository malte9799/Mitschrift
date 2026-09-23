import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import type { TagColor } from '@/storage';

/** Darstellung einer Randnotiz. */
export type SideNoteStyle = 'postit' | 'card' | 'text' | 'title';
export type SideNoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'graphite';
export type SideNoteSide = 'left' | 'right';

export const sideNoteStyles: { id: SideNoteStyle; label: string; hint: string }[] = [
  { id: 'postit', label: 'Post-it', hint: 'Farbiger Zettel' },
  { id: 'card', label: 'Karte', hint: 'Titel und Text im Rahmen' },
  { id: 'text', label: 'Text', hint: 'Titel und Text, ohne Rahmen' },
  { id: 'title', label: 'Nur Titel', hint: 'Eine schlichte Zeile' },
];

/** Farben aus den Tag-Tönen, damit sie im dunklen Theme mitziehen. */
export const sideNoteColors: Record<SideNoteColor, { label: string; css: string }> = {
  yellow: { label: 'Gelb', css: 'var(--tag-amber)' },
  pink: { label: 'Pink', css: 'var(--tag-pink)' },
  blue: { label: 'Blau', css: 'var(--tag-blue)' },
  green: { label: 'Grün', css: 'var(--tag-green)' },
  purple: { label: 'Lila', css: 'var(--tag-purple)' },
  graphite: { label: 'Grafit', css: 'var(--tag-graphite)' },
};

/** Vorgeschlagene Labels mit fester Farbe; eigene Labels bekommen eine Farbe aus ihrem Namen. */
export const sideNoteTagPresets: { name: string; color: TagColor }[] = [
  { name: 'Prüfungsrelevant', color: 'red' },
  { name: 'Wichtig', color: 'amber' },
  { name: 'Wiederholen', color: 'purple' },
  { name: 'Frage', color: 'blue' },
  { name: 'Verstanden', color: 'green' },
];

const tagPalette: TagColor[] = ['teal', 'blue', 'green', 'orange', 'purple', 'pink', 'amber', 'red', 'graphite'];

export function sideNoteTagColor(name: string): TagColor {
  const key = name.trim().toLowerCase();
  const preset = sideNoteTagPresets.find((t) => t.name.toLowerCase() === key);
  if (preset) return preset.color;
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return tagPalette[Math.abs(h) % tagPalette.length];
}

/** Ob eine Notiz noch gar nichts enthält (weder Titel, Text noch Labels). */
export function isSideNoteEmpty(n: SideNote): boolean {
  return !n.title.trim() && !n.body.trim() && n.tags.length === 0;
}

/**
 * Notiz am Rand neben dem Text. `pos` zeigt auf den Anfang des Blocks, neben dem sie steht,
 * `dy` ist der Abstand von dessen Oberkante – so wandert die Notiz mit dem Text.
 */
export interface SideNote {
  id: string;
  pos: number;
  dy: number;
  side: SideNoteSide;
  style: SideNoteStyle;
  color: SideNoteColor;
  title: string;
  body: string;
  /** Labels wie „Prüfungsrelevant“, als Namen gespeichert. */
  tags: string[];
}

type Action =
  | { type: 'add'; note: SideNote }
  | { type: 'update'; id: string; patch: Partial<SideNote> }
  | { type: 'remove'; id: string };

export const sideNotesKey = new PluginKey<SideNote[]>('sideNotes');

export function getSideNotes(state: EditorState): SideNote[] {
  return sideNotesKey.getState(state) ?? [];
}

function reduce(notes: SideNote[], a: Action): SideNote[] {
  switch (a.type) {
    case 'add':
      return [...notes, a.note];
    case 'update':
      return notes.map((n) => (n.id === a.id ? { ...n, ...a.patch } : n));
    case 'remove':
      return notes.filter((n) => n.id !== a.id);
  }
}

// Randnotizen landen nicht im Verlauf – Rückgängig betrifft nur den Text.
function run(editor: Editor, action: Action) {
  if (editor.isDestroyed) return;
  editor.view.dispatch(editor.state.tr.setMeta(sideNotesKey, action).setMeta('addToHistory', false));
}

export const addSideNote = (editor: Editor, note: SideNote) => run(editor, { type: 'add', note });
export const updateSideNote = (editor: Editor, id: string, patch: Partial<SideNote>) => run(editor, { type: 'update', id, patch });
export const removeSideNote = (editor: Editor, id: string) => run(editor, { type: 'remove', id });

/** Gespeicherte Notizen aus dem Notiz-JSON lesen – unbekannte Werte fallen auf Standards zurück. */
export function parseSideNotes(raw: unknown): SideNote[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
    .map((n) => ({
      id: typeof n.id === 'string' ? n.id : crypto.randomUUID(),
      pos: Number(n.pos) || 0,
      dy: Math.max(0, Number(n.dy) || 0),
      side: n.side === 'left' ? 'left' : 'right',
      style: sideNoteStyles.some((s) => s.id === n.style) ? (n.style as SideNoteStyle) : 'postit',
      color: typeof n.color === 'string' && n.color in sideNoteColors ? (n.color as SideNoteColor) : 'yellow',
      title: typeof n.title === 'string' ? n.title : '',
      body: typeof n.body === 'string' ? n.body : '',
      tags: Array.isArray(n.tags) ? n.tags.filter((t): t is string => typeof t === 'string' && !!t.trim()) : [],
    }));
}

/**
 * Hält die Randnotizen als Plugin-State statt als Knoten-Attribute: Attribut-Änderungen würden
 * den Block bei jedem Tastendruck neu zeichnen. Die Anker werden durch jede Änderung gemappt,
 * gespeichert wird alles zusammen im Notiz-JSON (Feld `sideNotes`).
 */
export const SideNotes = Extension.create<{ initial: SideNote[] }>({
  name: 'sideNotes',

  addOptions() {
    return { initial: [] };
  },

  addProseMirrorPlugins() {
    const { initial } = this.options;
    return [
      new Plugin<SideNote[]>({
        key: sideNotesKey,
        state: {
          init: () => initial,
          apply(tr, notes) {
            let next = notes;
            if (tr.docChanged && next.length) {
              // assoc 1: Eine neue Zeile genau am Anker schiebt die Notiz mit ihrem Block nach unten.
              next = next.map((n) => {
                const pos = tr.mapping.map(n.pos, 1);
                return pos === n.pos ? n : { ...n, pos };
              });
            }
            const action = tr.getMeta(sideNotesKey) as Action | undefined;
            return action ? reduce(next, action) : next;
          },
        },
      }),
    ];
  },
});
