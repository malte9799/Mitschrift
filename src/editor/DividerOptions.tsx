import type { Editor } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { useEditorTick } from './useEditable';
import { useBarSubmenu } from './BlockBar';
import { dividerLabels, type DividerVariant } from './Divider';

const variants = Object.keys(dividerLabels) as DividerVariant[];

/** Optionen der Trennlinie in der Block-Leiste: Stil von „Extra dünn“ bis „Seitenumbruch“. */
export function DividerOptions({ editor, pos }: { editor: Editor; pos: number }) {
  useEditorTick(editor);
  const node = editor.state.doc.nodeAt(pos);
  const current = (node?.attrs.variant ?? 'regular') as DividerVariant;
  const menu = useBarSubmenu(editor, { icon: 'divider', label: 'Stil der Trennlinie', text: dividerLabels[current], popoverClassName: 'c-divider-pop' });
  if (node?.type.name !== 'horizontalRule') return null;

  function choose(variant: DividerVariant) {
    const at = editor.state.doc.nodeAt(pos);
    if (at) editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...at.attrs, variant }));
    menu.close();
  }

  return (
    <>
      {menu.button}
      {menu.submenu(
        <div className="b-pop-list">
          {variants.map((v) => (
            <button key={v} type="button" className={`b-pop-item${v === current ? ' is-active' : ''}`} onClick={() => choose(v)}>
              <span className="c-divider-sample" data-variant={v} aria-hidden="true" />
              {dividerLabels[v]}
              {v === current && <Icon name="check" className="b-pop-check" />}
            </button>
          ))}
        </div>,
      )}
    </>
  );
}
