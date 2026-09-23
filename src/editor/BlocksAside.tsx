import type { Editor } from '@tiptap/react';
import { BlockThumbnail } from './BlockThumbnails';
import { prepareBlockInsert } from './BlockSelection';
import { blockTypes, blockCategoryOrder, categoryLabels } from './blockTypes';

interface BlocksAsideProps {
  editor: Editor;
}

/** "Einfügen"-Tab-Inhalt: alle Blocktypen zum Einfügen an der Cursor-Position, gruppiert nach Kategorie, analog zu Craft. */
export function BlocksAside({ editor }: BlocksAsideProps) {
  return (
    <div className="c-blocks-aside">
      {blockCategoryOrder.map((cat) => {
        const items = blockTypes.filter((b) => b.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="c-blocks-aside-group">
            <h2>{categoryLabels[cat]}</h2>
            <div className="c-blocks-aside-grid">
              {items.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    prepareBlockInsert(editor);
                    b.run(editor);
                  }}
                  title={b.label}
                >
                  <span className="c-blocks-aside-icon">
                    <BlockThumbnail id={b.id} />
                  </span>
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
