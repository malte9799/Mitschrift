import { Mark, mergeAttributes, type Editor } from '@tiptap/core';
import { sideNotesKey, type SideNote } from './model';

/** Event, mit dem eine Randnotiz den Fokus bekommt (Detail: ihre ID). */
export const FOCUS_SIDE_NOTE_EVENT = 'mitschrift:focus-side-note';

/**
 * Markiert die Textstelle, zu der ein Kommentar gehört. Der Kommentar selbst ist eine Randnotiz
 * mit derselben ID (`comment: true`) – so teilen sich Kommentare und Randnotizen Rand, Darstellung
 * und Speicherung.
 */
export const CommentMark = Mark.create({
  name: 'comment',
  inclusive: false,
  // Mehrere Kommentare dürfen dieselbe Stelle überlappen.
  excludes: '',

  addAttributes() {
    return {
      id: { default: null, parseHTML: (el) => el.getAttribute('data-comment-id'), renderHTML: (a) => ({ 'data-comment-id': a.id }) },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'c-comment' }), 0];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-m': () => commentSelection(this.editor),
    };
  },
});

/** Markierten Text kommentieren: Markierung setzen und die zugehörige Randnotiz anlegen. */
export function commentSelection(editor: Editor): boolean {
  const { from, to, empty, $from } = editor.state.selection;
  const type = editor.schema.marks.comment;
  if (empty || !type || !editor.isEditable || !sideNotesKey.getState(editor.state)) return false;
  const id = crypto.randomUUID();
  const quote = editor.state.doc.textBetween(from, to, ' ').trim();
  const note: SideNote = { id, pos: $from.depth > 0 ? $from.before(1) : from, dy: 0, side: 'right', style: 'card', color: 'yellow', title: '', body: '', tags: [], comment: true, quote: quote.length > 140 ? `${quote.slice(0, 139)}…` : quote };
  // Wie alle Randnotizen nicht im Verlauf – sonst entstünde beim Rückgängig ein Kommentar ohne Textstelle.
  editor.view.dispatch(editor.state.tr.addMark(from, to, type.create({ id })).setMeta(sideNotesKey, { type: 'add', note }).setMeta('addToHistory', false));
  window.dispatchEvent(new CustomEvent<string>(FOCUS_SIDE_NOTE_EVENT, { detail: id }));
  return true;
}
