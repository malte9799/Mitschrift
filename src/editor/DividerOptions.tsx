import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { Popover } from '@/blocks/collection/Popover';
import { useEditorTick } from './useEditable';
import { BarButton } from './BlockBar';
import { dividerLabels, type DividerVariant } from './Divider';

const variants = Object.keys(dividerLabels) as DividerVariant[];

/** Optionen der Trennlinie in der Block-Leiste: Stil von „Extra dünn“ bis „Seitenumbruch“. */
export function DividerOptions({ editor, pos }: { editor: Editor; pos: number }) {
  useEditorTick(editor);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const node = editor.state.doc.nodeAt(pos);
  if (node?.type.name !== 'horizontalRule') return null;
  const current = (node.attrs.variant ?? 'regular') as DividerVariant;

  function choose(variant: DividerVariant) {
    const at = editor.state.doc.nodeAt(pos);
    if (at) editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...at.attrs, variant }));
    setAnchor(null);
  }

  return (
    <>
      <BarButton
        icon="divider"
        label="Stil der Trennlinie"
        text={dividerLabels[current]}
        chevron
        active={!!anchor}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
      />
      {anchor && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} className="c-divider-pop">
          <div className="b-pop-list">
            {variants.map((v) => (
              <button key={v} type="button" className={`b-pop-item${v === current ? ' is-active' : ''}`} onClick={() => choose(v)}>
                <span className="c-divider-sample" data-variant={v} aria-hidden="true" />
                {dividerLabels[v]}
                {v === current && <Icon name="check" className="b-pop-check" />}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}
