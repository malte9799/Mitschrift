import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { blockTypes } from './blockTypes';
import type { SnippetData } from '@/hooks/useSnippets';

export interface InsertMenuHandle {
  editor: Editor;
  query: string;
  /** Ersetzt den Slash-Bereich (falls per "/" geöffnet) und führt die Aktion aus. */
  apply: (run: (editor: Editor) => void) => void;
}

interface InsertMenuProps {
  handle: InsertMenuHandle;
  snippets: SnippetData[];
  onClose: () => void;
}

/** Popover mit Blocktypen + gespeicherten Vorlagen, geöffnet per "/" oder Plus-Button. */
export function InsertMenu({ handle, snippets, onClose }: InsertMenuProps) {
  const [active, setActive] = useState(0);
  const q = handle.query.trim().toLowerCase();

  const filteredBlocks = useMemo(
    () =>
      blockTypes.filter(
        (b) => !q || b.label.toLowerCase().includes(q) || b.keywords.some((k) => k.includes(q)),
      ),
    [q],
  );
  const filteredSnippets = useMemo(
    () => snippets.filter((s) => !q || s.name.toLowerCase().includes(q)),
    [q, snippets],
  );

  const items = useMemo(
    () => [
      ...filteredBlocks.map((b) => ({ kind: 'block' as const, block: b })),
      ...filteredSnippets.map((s) => ({ kind: 'snippet' as const, snippet: s })),
    ],
    [filteredBlocks, filteredSnippets],
  );

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[active];
        if (item) select(item);
      } else if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `active`/`items` bewusst über Ref-losen Closure aktuell gehalten
  }, [items, active]);

  function select(item: (typeof items)[number]) {
    if (item.kind === 'block') {
      handle.apply(item.block.run);
    } else {
      const content = JSON.parse(item.snippet.content);
      handle.apply((editor) =>
        editor.chain().focus().insertContent(content, { updateSelection: true }).run(),
      );
    }
  }

  if (items.length === 0) {
    return (
      <div className="c-insert-menu">
        <p className="c-insert-menu-empty">Keine Treffer für „{handle.query}"</p>
      </div>
    );
  }

  return (
    <div className="c-insert-menu">
      {filteredBlocks.length > 0 && (
        <div className="c-insert-menu-group">
          <span className="c-insert-menu-label">Blöcke</span>
          {filteredBlocks.map((b) => {
            const index = items.findIndex((i) => i.kind === 'block' && i.block.id === b.id);
            return (
              <button
                key={b.id}
                type="button"
                className={index === active ? 'active' : ''}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select({ kind: 'block', block: b })}
              >
                <Icon name={b.icon} />
                {b.label}
              </button>
            );
          })}
        </div>
      )}
      {filteredSnippets.length > 0 && (
        <div className="c-insert-menu-group">
          <span className="c-insert-menu-label">Meine Vorlagen</span>
          {filteredSnippets.map((s) => {
            const index = items.findIndex((i) => i.kind === 'snippet' && i.snippet.id === s.id);
            return (
              <button
                key={s.id}
                type="button"
                className={index === active ? 'active' : ''}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select({ kind: 'snippet', snippet: s })}
              >
                <Icon name="callout" />
                {s.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
