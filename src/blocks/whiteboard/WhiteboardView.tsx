import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { BarButton, useBlockBar } from '@/editor/BlockBar';
import { useDarkMode } from '@/hooks/useDarkMode';
import { takeOpenOnMount, type WhiteboardScene } from './WhiteboardNode';

// Excalidraw ist groß – erst laden, wenn ein Whiteboard geöffnet wird.
const WhiteboardEditor = lazy(() => import('./WhiteboardEditor'));

export function WhiteboardView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const bar = useBlockBar(editor, getPos);
  const dark = useDarkMode();
  const scene = node.attrs.scene as WhiteboardScene;
  const svg = node.attrs.svg as string;
  const [open, setOpen] = useState(false);
  // Im Effect statt im useState-Initialisierer: StrictMode ruft den doppelt auf und verbraucht das Signal.
  useEffect(() => {
    if (editable && takeOpenOnMount()) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Einfügen
  }, []);
  // Der Notiz-Editor darf den Fokus nicht behalten – sonst landen Tasten (Backspace!) dort und löschen den Block.
  useEffect(() => {
    if (open) (editor.view.dom as HTMLElement).blur();
  }, [open, editor]);
  // Als <img> statt inline: Eingefügtes (fremdes) SVG kann so keine Skripte ausführen.
  const src = useMemo(() => (svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ''), [svg]);

  return (
    <NodeViewWrapper className="b-block b-whiteboard" data-interactive="">
      {bar.render(<BarButton icon="pencil" label="Im Whiteboard zeichnen" text="Zeichnen" onClick={() => setOpen(true)} />)}
      <div contentEditable={false}>
        <div className="b-block-head">
          <span className="b-block-badge">
            <Icon name="whiteboard" /> Whiteboard
          </span>
          <span className="b-whiteboard-side">
            <a className="b-whiteboard-credit" href="https://excalidraw.com" target="_blank" rel="noopener noreferrer">
              powered by Excalidraw
            </a>
            {!editable && (
              <button type="button" className="b-chip-btn" onClick={() => setOpen(true)}>
                <Icon name="expand" /> Ansehen
              </button>
            )}
          </span>
        </div>

        {src ? (
          <button type="button" className={`b-whiteboard-preview${dark ? ' is-dark' : ''}`} onClick={() => setOpen(true)} aria-label="Whiteboard öffnen">
            <img src={src} alt="Whiteboard" draggable={false} />
          </button>
        ) : (
          <button type="button" className="b-whiteboard-empty" onClick={() => setOpen(true)} disabled={!editable}>
            {editable ? 'Leeres Whiteboard – klicken, um zu zeichnen.' : 'Leeres Whiteboard.'}
          </button>
        )}
      </div>

      {open &&
        createPortal(
          <div className="b-whiteboard-window" data-own-keys="">
            <Suspense fallback={<p className="b-whiteboard-loading">Whiteboard wird geladen …</p>}>
              <WhiteboardEditor
                scene={scene}
                readOnly={!editable}
                dark={dark}
                onSave={(next, nextSvg) => updateAttributes({ scene: next, svg: nextSvg })}
                onClose={() => setOpen(false)}
              />
            </Suspense>
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}
