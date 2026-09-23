import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { useNotes } from '@/hooks/useNotes';
import type { Note } from '@/storage';
import { ancestorsOf, backlinksOf, childrenMap, noteHref } from './noteLinks';
import { createNote } from './actions';
import type { Editor } from '@tiptap/core';
import { FootnoteList, useFootnotes } from '@/editor/InlineAtomEditor';

/** Pfad über der Notiz: Eltern-Notizen bis zur obersten Ebene. */
export function NoteBreadcrumbs({ id }: { id: string }) {
  const notes = useNotes();
  const path = useMemo(() => (notes ? ancestorsOf(id, notes) : []), [notes, id]);
  if (path.length === 0) return null;
  return (
    <nav className="note-crumbs" aria-label="Übergeordnete Notizen">
      {path.map((n) => (
        <span key={n.id} className="note-crumb">
          <Link to={noteHref(n.id)}>{n.title || 'Ohne Titel'}</Link>
          <Icon name="chevron" />
        </span>
      ))}
    </nav>
  );
}

/** Unter der Notiz – ein gemeinsamer Fußbereich: Unterseiten, Rückverweise und Fußnoten nebeneinander. */
export function NoteRelations({ id, readOnly, editor }: { id: string; readOnly: boolean; editor: Editor | null }) {
  const notes = useNotes();
  const navigate = useNavigate();
  const children = useMemo(() => (notes ? (childrenMap(notes).get(id) ?? []) : []), [notes, id]);
  const backlinks = useMemo(() => (notes ? backlinksOf(id, notes) : []), [notes, id]);
  const footnotes = useFootnotes(editor);

  if (!notes || (readOnly && children.length === 0 && backlinks.length === 0 && footnotes.length === 0)) return null;

  const item = (n: Note) => (
    <li key={n.id}>
      <Link to={noteHref(n.id)} className="note-rel-link">
        <Icon name="file" />
        <span>{n.title || 'Ohne Titel'}</span>
      </Link>
    </li>
  );

  return (
    <section className="note-relations" aria-label="Verknüpfte Notizen">
      {(!readOnly || children.length > 0) && (
        <div className="note-rel-group">
          <h4>Unterseiten{children.length > 0 && <span>{children.length}</span>}</h4>
          <ul>
            {children.map(item)}
            {!readOnly && (
              <li>
                <button
                  type="button"
                  className="note-rel-link note-rel-new"
                  onClick={async () => {
                    const child = await createNote({ parentId: id });
                    navigate(noteHref(child.id));
                  }}
                >
                  <Icon name="plus" />
                  <span>Neue Unterseite</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
      {backlinks.length > 0 && (
        <div className="note-rel-group">
          <h4>
            Verlinkt von<span>{backlinks.length}</span>
          </h4>
          <ul>{backlinks.map(item)}</ul>
        </div>
      )}
      {editor && footnotes.length > 0 && <FootnoteList editor={editor} notes={footnotes} />}
    </section>
  );
}
