import { useEffect, useMemo, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { Popover } from '@/blocks/collection/Popover';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import { childrenMap, navigateTo, noteHref } from '@/app/noteLinks';
import { useEditable } from '../useEditable';
import { BarButton, BarSep, useBlockBar } from '../BlockBar';
import { blockToLink, type NoteCardSize, type NoteView } from './NoteBlockNode';
import { NotePreview, noteExcerpt } from './NotePreview';
import { NoteViewOptions } from './NoteViewOptions';

/** Notiz als Zeile (Symbol, Titel, Untertitel) oder als Karte mit Vorschau-Ecke. */
export function NoteBlockView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const notes = useNotes();
  const tags = useTags();
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { id, view, size, subtitle } = node.attrs as { id: string; view: 'row' | 'card'; size: NoteCardSize; subtitle: string | null };

  const note = notes?.find((n) => n.id === id) ?? null;
  const childCount = useMemo(() => (notes ? childrenMap(notes).get(id)?.length ?? 0 : 0), [notes, id]);
  const excerpt = useMemo(() => (note ? noteExcerpt(note) : ''), [note]);
  const tag = note && tags ? note.tags.map((t) => tags.find((x) => x.id === t)).find(Boolean) : undefined;
  const title = note ? note.title || 'Ohne Titel' : node.attrs.title || 'Notiz';
  const sub = subtitle === '' ? '' : subtitle ?? excerpt;
  const missing = notes !== null && !note;

  // Titel im Knoten aktuell halten (für Export/Kopieren) – ohne Undo-Schritt.
  useEffect(() => {
    if (!note || !editable || note.title === node.attrs.title) return;
    const pos = getPos();
    if (typeof pos !== 'number') return;
    editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, 'title', note.title).setMeta('addToHistory', false));
  }, [note?.title, editable]); // eslint-disable-line react-hooks/exhaustive-deps

  function open(e: React.MouseEvent) {
    if (missing || e.button !== 0) return;
    e.preventDefault();
    navigateTo(noteHref(id));
  }

  function setView(v: NoteView) {
    if (v === 'link') {
      const pos = getPos();
      setAnchor(null);
      if (typeof pos === 'number') blockToLink(editor, pos);
      return;
    }
    updateAttributes({ view: v });
  }


  const meta = childCount > 0 && (
    <span className="nb-meta">
      <Icon name="file" />
      {childCount}
    </span>
  );

  return (
    <NodeViewWrapper
      className={`nb nb--${view}${view === 'card' ? ` nb-${size}` : ''}${bar.active ? ' is-selected' : ''}${missing ? ' is-missing' : ''}`}
      style={tag ? ({ '--nb-tone': `var(--tag-${tag.color})`, '--nb-tone-bg': `var(--tag-${tag.color}-bg)` } as React.CSSProperties) : undefined}
      contentEditable={false}
    >
      {bar.render(
        <>
          <BarButton icon={view === 'card' ? 'noteCard' : 'noteRow'} label="Darstellung anpassen" text="Darstellung" chevron active={!!anchor} onClick={(e) => setAnchor(anchor ? null : e.currentTarget)} />
          <BarSep />
          <BarButton icon="arrowRight" label="Notiz öffnen" text="Öffnen" disabled={missing} onClick={() => navigateTo(noteHref(id))} />
        </>,
      )}
      {view === 'row' ? (
        <a href={noteHref(id)} className="nb-row" onClick={open} draggable={false}>
          <span className="nb-icon" aria-hidden="true">
            <Icon name="file" />
          </span>
          <span className="nb-text">
            <span className="nb-title">{missing ? 'Notiz nicht gefunden' : title}</span>
            {sub && !missing && <span className="nb-sub">{sub}</span>}
          </span>
          {meta}
          <Icon name="arrowRight" className="nb-go" />
        </a>
      ) : (
        <a href={noteHref(id)} className="nb-card" onClick={open} draggable={false}>
          <span className="nb-preview">{note ? <NotePreview note={note} /> : <span className="nb-preview-missing">?</span>}</span>
          <span className="nb-foot">
            <span className="nb-text">
              <span className="nb-title">{missing ? 'Notiz nicht gefunden' : title}</span>
              {size !== 's' && sub && !missing && <span className="nb-sub">{sub}</span>}
            </span>
            {size !== 's' && meta}
          </span>
        </a>
      )}

      {anchor && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} align="end" className="nv-pop">
          <NoteViewOptions
            view={view}
            size={size}
            subtitle={subtitle}
            autoSubtitle={excerpt}
            onView={setView}
            onSize={(s) => updateAttributes({ size: s })}
            onSubtitle={(s) => updateAttributes({ subtitle: s })}
          />
        </Popover>
      )}
    </NodeViewWrapper>
  );
}
