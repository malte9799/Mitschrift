import { Extension, type Editor, type Range } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { storage, type Note } from '@/storage';
import { notifyNotesChanged } from '@/hooks/useNotes';
import { navigateTo, noteHref, noteIdFromHref } from '@/app/noteLinks';
import { NoteLinkMenu, type NoteLinkMenuHandle, type NoteLinkChoice } from './NoteLinkMenu';
import { positionPopup } from './SlashCommand';
import type { NoteCardSize } from './noteBlock/NoteBlockNode';

/** MIME-Typ, mit dem die Seitenleiste Notizen in den Editor ziehen lässt. */
export const NOTE_DRAG_TYPE = 'application/x-mitschrift-note';

/** Startet die Notiz-Auswahl („[[“) in einer eigenen Zeile; die Wahl wird als Block eingefügt. */
export function startNoteBlockPicker(editor: Editor, view: 'row' | 'card', size: NoteCardSize = 'm') {
  editor.storage.noteLink.pendingBlock = { view, size };
  const { $from } = editor.state.selection;
  if ($from.parent.isTextblock && $from.parent.textContent === '') {
    editor.chain().focus().insertContent('[[').run();
    return;
  }
  const after = $from.depth > 0 ? $from.after(1) : $from.pos;
  editor
    .chain()
    .focus()
    .insertContentAt(after, { type: 'paragraph', content: [{ type: 'text', text: '[[' }] })
    .setTextSelection(after + 3)
    .run();
}

/** Ersetzt `range` durch einen Notiz-Block; war die Zeile sonst leer, ersetzt der Block die Zeile. */
function insertNoteBlockAt(editor: Editor, range: Range, note: Pick<Note, 'id' | 'title'>, block: { view: 'row' | 'card'; size: NoteCardSize }) {
  const $from = editor.state.doc.resolve(range.from);
  const para = $from.parent;
  const rest = para.textContent.length - (range.to - range.from);
  const node = { type: 'noteBlock', attrs: { id: note.id, title: note.title, ...block } };
  if (para.isTextblock && rest <= 0 && $from.depth > 0) {
    editor.chain().focus().insertContentAt({ from: $from.before(), to: $from.after() }, node).run();
  } else {
    editor.chain().focus().deleteRange(range).insertContentAt(editor.state.doc.resolve(range.from).after(), node).run();
  }
}

export interface NoteLinkStorage {
  /** ID der Notiz, die gerade bearbeitet wird – wird nicht vorgeschlagen und ist Eltern neuer Unterseiten. */
  currentId: string | null;
  /** Aus dem Einfügen-Menü gestartet: Auswahl wird als Block statt als Link eingefügt. */
  pendingBlock: { view: 'row' | 'card'; size: NoteCardSize } | null;
}

declare module '@tiptap/core' {
  interface Storage {
    noteLink: NoteLinkStorage;
  }
}

/** Fügt an `range` einen Markdown-Link `[Titel](/n/<id>)` auf die Notiz ein, gefolgt von einem Leerzeichen. */
export function insertNoteLink(editor: Editor, range: Range, note: Pick<Note, 'id' | 'title'>) {
  editor
    .chain()
    .focus()
    .insertContentAt(range, [
      { type: 'text', text: note.title || 'Ohne Titel', marks: [{ type: 'link', attrs: { href: noteHref(note.id) } }] },
      // Ohne Mark, damit Weitertippen nicht den Link verlängert.
      { type: 'text', text: ' ' },
    ])
    .run();
}

/**
 * Verlinken von Notizen: „[[“ öffnet eine Auswahl aller Notizen (oder legt eine neue an),
 * Klick auf einen internen Link öffnet die Ziel-Notiz.
 */
export const NoteLink = Extension.create<object, NoteLinkStorage>({
  name: 'noteLink',

  addStorage() {
    return { currentId: null, pendingBlock: null };
  },

  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: new PluginKey('noteLinkClick'),
        props: {
          // Notiz aus der Seitenleiste in den Text ziehen → als Zeile einfügen.
          handleDrop(view, event) {
            const raw = event.dataTransfer?.getData(NOTE_DRAG_TYPE);
            if (!raw) return false;
            const { id, title } = JSON.parse(raw) as { id: string; title: string };
            const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (!hit) return false;
            event.preventDefault();
            const $pos = view.state.doc.resolve(hit.pos);
            const at = $pos.depth > 0 ? $pos.after(1) : hit.pos;
            ext.editor.chain().focus().insertContentAt(at, { type: 'noteBlock', attrs: { id, title, view: 'row' } }).run();
            return true;
          },
          handleClick(_view, _pos, event) {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
            const a = (event.target as HTMLElement).closest?.('a[href]');
            const id = noteIdFromHref(a?.getAttribute('href'));
            if (!id) return false;
            event.preventDefault();
            navigateTo(noteHref(id));
            return true;
          },
        },
      }),
      Suggestion<NoteLinkChoice>({
        editor: this.editor,
        pluginKey: new PluginKey('noteLinkSuggestion'),
        char: '[[',
        allowSpaces: true,
        startOfLine: false,
        // Auch direkt nach Text („siehe[[“), nicht nur nach Leerzeichen.
        allowedPrefixes: null,
        items: async ({ query: raw }) => {
          // Geschlossene Klammern („[[Titel]]“) gehören nicht zum Suchbegriff.
          const query = raw.replace(/\]+$/, '');
          const q = query.trim().toLowerCase();
          const notes = (await storage.listNotes()).filter((n) => n.id !== ext.storage.currentId);
          const hits = q ? notes.filter((n) => (n.title || 'ohne titel').toLowerCase().includes(q)) : notes;
          // Titel, die mit der Eingabe beginnen, zuerst.
          hits.sort((a, b) => Number(!(a.title.toLowerCase().startsWith(q))) - Number(!(b.title.toLowerCase().startsWith(q))));
          const choices: NoteLinkChoice[] = hits.slice(0, 30).map((note) => ({ kind: 'note', note }));
          const title = query.trim();
          if (title && !notes.some((n) => n.title.trim().toLowerCase() === q)) {
            if (ext.storage.currentId) choices.push({ kind: 'create', title, child: true });
            choices.push({ kind: 'create', title, child: false });
          }
          return choices;
        },
        command: async ({ editor, range, props }) => {
          const block = ext.storage.pendingBlock;
          ext.storage.pendingBlock = null;
          let note: Pick<Note, 'id' | 'title'>;
          if (props.kind === 'note') note = props.note;
          else {
            note = await storage.createNote({ title: props.title, parentId: props.child ? ext.storage.currentId : null });
            notifyNotesChanged();
          }
          if (block) insertNoteBlockAt(editor, range, note, block);
          else insertNoteLink(editor, range, note);
        },
        render: () => {
          let component: ReactRenderer<NoteLinkMenuHandle, React.ComponentProps<typeof NoteLinkMenu>> | null = null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props) => {
              popup = document.createElement('div');
              popup.className = 'c-insert-menu-popup';
              document.body.appendChild(popup);
              component = new ReactRenderer(NoteLinkMenu, {
                editor: props.editor,
                props: { items: props.items, query: props.query, onSelect: props.command },
              });
              popup.appendChild(component.element);
              positionPopup(popup, props.clientRect?.());
              requestAnimationFrame(() => popup && positionPopup(popup, props.clientRect?.()));
            },
            onUpdate: (props) => {
              if (!component || !popup) return;
              component.updateProps({ items: props.items, query: props.query, onSelect: props.command });
              positionPopup(popup, props.clientRect?.());
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') return true;
              return component?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              // Abgebrochen: nächstes „[[“ fügt wieder einen Link ein. (Nach Auswahl setzt command() das selbst zurück.)
              setTimeout(() => (ext.storage.pendingBlock = null));
              popup?.remove();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});
