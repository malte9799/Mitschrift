import { useEffect, useMemo, useRef, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { storage, type Note } from '@/storage';
import { notifyNotesChanged, useNotes } from '@/hooks/useNotes';
import { navigateTo, noteHref } from '@/app/noteLinks';
import { useEditable, useEditorTick } from '@/editor/useEditable';
import { useBlockBar } from '@/editor/BlockBar';
import { CollectionBody } from './CollectionBody';
import { migrateCollection, sheetViews, type CollectionData, type Sheet, type View } from './model';
import { collectionsInJson, currentNoteId, findCollectionById, findCollections, replaceCollectionInJson } from './registry';

/** Sammlungen einer gespeicherten Notiz; leere Liste, wenn sie keine hat oder sich nicht lesen lässt. */
function collectionsOf(note: Note): CollectionData[] {
  // Schneller Vortest – die meisten Notizen enthalten keine Sammlung.
  if (!note.content.includes('"collection"')) return [];
  try {
    return collectionsInJson(JSON.parse(note.content)).filter((c) => !!c.id);
  } catch {
    return [];
  }
}

export function LinkedCollectionView(props: NodeViewProps) {
  const { noteId, collectionId } = props.node.attrs as { noteId: string | null; collectionId: string | null };
  if (!noteId || !collectionId) return <Picker {...props} />;
  // In derselben Notiz liegt die Sammlung im offenen Dokument – dort lesen und schreiben, nicht im Speicher.
  return noteId === currentNoteId(props.editor) ? <SameNote {...props} /> : <OtherNote {...props} />;
}

function bodyViews({ node, updateAttributes }: NodeViewProps) {
  const own = node.attrs.views as Record<string, View[]>;
  return {
    viewsOf: (sheet: Sheet) => (own[sheet.id]?.length ? own[sheet.id] : sheetViews(sheet)),
    saveViews: (sheetId: string, views: View[]) => updateAttributes({ views: { ...own, [sheetId]: views } }),
  };
}

function SameNote(props: NodeViewProps) {
  const { node, editor, getPos } = props;
  useEditorTick(editor);
  const ref = findCollectionById(editor, node.attrs.collectionId as string);
  if (!ref) return <Missing {...props} />;
  return (
    <CollectionBody
      editor={editor}
      getPos={getPos}
      nodeSize={node.nodeSize}
      data={ref.data}
      save={(next) => {
        const target = findCollectionById(editor, next.id);
        if (target) editor.view.dispatch(editor.state.tr.setNodeAttribute(target.pos, 'data', next));
      }}
      all={findCollections(editor).map((c) => c.data)}
      {...bodyViews(props)}
      parentNoteId={node.attrs.noteId as string}
      source={{ label: ref.data.title || 'Sammlung', open: () => editor.commands.setNodeSelection(ref.pos) }}
    />
  );
}

function OtherNote(props: NodeViewProps) {
  const { node, editor, getPos } = props;
  const noteId = node.attrs.noteId as string;
  const collectionId = node.attrs.collectionId as string;
  const notes = useNotes();
  const note = notes?.find((n) => n.id === noteId);
  const stored = useMemo(() => (note ? collectionsOf(note) : []), [note]);

  // Änderungen erscheinen sofort (draft) und werden gebündelt in die andere Notiz geschrieben.
  const [draft, setDraft] = useState<CollectionData | null>(null);
  const pending = useRef<CollectionData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const writing = useRef<Promise<void>>(Promise.resolve());

  const flush = () => {
    clearTimeout(timer.current);
    const next = pending.current;
    pending.current = null;
    if (!next) return writing.current;
    writing.current = writing.current.then(async () => {
      const fresh = await storage.getNote(noteId);
      if (!fresh) return;
      const doc = JSON.parse(fresh.content);
      if (!replaceCollectionInJson(doc, next)) return;
      await storage.updateNote(noteId, { content: JSON.stringify(doc) });
      notifyNotesChanged();
    });
    return writing.current;
  };

  // Der Speicher hat aufgeholt: wieder aus der Notiz lesen.
  useEffect(() => {
    if (!pending.current) setDraft(null);
  }, [note?.content]);
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps -- beim Verlassen sofort schreiben

  if (notes === null) return <NodeViewWrapper className="b-block b-coll" contentEditable={false} />;
  const source = stored.find((c) => c.id === collectionId);
  if (!note || !source) return <Missing {...props} />;
  const data = draft ?? migrateCollection(source);

  return (
    <CollectionBody
      editor={editor}
      getPos={getPos}
      nodeSize={node.nodeSize}
      data={data}
      save={(next) => {
        setDraft(next);
        pending.current = next;
        clearTimeout(timer.current);
        return new Promise<void>((resolve) => {
          timer.current = setTimeout(() => void flush().then(resolve), 300);
        });
      }}
      all={stored.map((c) => (c.id === data.id ? data : c))}
      {...bodyViews(props)}
      parentNoteId={noteId}
      source={{ label: note.title || 'Ohne Titel', open: () => navigateTo(noteHref(noteId)) }}
    />
  );
}

function Missing({ editor, getPos, updateAttributes }: NodeViewProps) {
  const bar = useBlockBar(editor, getPos);
  const editable = useEditable(editor);
  return (
    <NodeViewWrapper className={`b-block b-coll b-coll-empty${bar.active ? ' is-selected' : ''}`} contentEditable={false}>
      {bar.render(null)}
      <p>Die verknüpfte Sammlung gibt es nicht mehr.</p>
      {editable && (
        <button type="button" className="b-field-btn" onClick={() => updateAttributes({ noteId: null, collectionId: null })}>
          Andere Sammlung wählen
        </button>
      )}
    </NodeViewWrapper>
  );
}

/** Noch keine Sammlung gewählt: alle Sammlungen aus allen Notizen anbieten. */
function Picker({ editor, getPos, updateAttributes }: NodeViewProps) {
  const bar = useBlockBar(editor, getPos);
  const editable = useEditable(editor);
  const notes = useNotes();
  const [query, setQuery] = useState('');
  const here = currentNoteId(editor);

  const choices = useMemo(() => {
    const list: { noteId: string; noteTitle: string; data: CollectionData }[] = [];
    // Diese Notiz aus dem offenen Dokument (der Speicher hinkt kurz hinterher), alle anderen aus dem Speicher.
    if (here) for (const c of findCollections(editor)) list.push({ noteId: here, noteTitle: 'Diese Notiz', data: c.data });
    for (const n of notes ?? []) if (n.id !== here) for (const data of collectionsOf(n)) list.push({ noteId: n.id, noteTitle: n.title || 'Ohne Titel', data });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Liste beim Öffnen bzw. bei geänderten Notizen
  }, [notes, here]);
  const q = query.trim().toLowerCase();
  const filtered = choices.filter((c) => `${c.data.title} ${c.noteTitle}`.toLowerCase().includes(q));

  return (
    <NodeViewWrapper className={`b-block b-coll b-coll-empty${bar.active ? ' is-selected' : ''}`} contentEditable={false}>
      {bar.render(null)}
      <p className="b-coll-empty-title">
        <Icon name="link" /> Verknüpfte Sammlung
      </p>
      <p>Zeigt eine vorhandene Sammlung mit eigenen Filtern und Ansichten. Die Zeilen bleiben dieselben.</p>
      {editable && (
        <>
          <input className="b-pop-input" value={query} placeholder="Sammlung suchen …" onChange={(e) => setQuery(e.target.value)} />
          <div className="b-pop-list">
            {filtered.map((c) => (
              <button key={`${c.noteId}:${c.data.id}`} type="button" className="b-pop-item" onClick={() => updateAttributes({ noteId: c.noteId, collectionId: c.data.id })}>
                <Icon name="collection" className="b-pop-icon" />
                <span>{c.data.title || 'Sammlung'}</span>
                <span className="b-coll-empty-note">{c.noteTitle}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="b-pop-empty">{choices.length ? 'Keine Treffer.' : 'Es gibt noch keine Sammlung – lege zuerst eine an.'}</p>}
          </div>
        </>
      )}
    </NodeViewWrapper>
  );
}
