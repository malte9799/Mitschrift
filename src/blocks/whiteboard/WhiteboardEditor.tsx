import { useEffect, useRef, useState } from 'react';
import { Excalidraw, exportToSvg, getNonDeletedElements, hashElementsVersion, useHandleLibrary } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';
import { Icon } from '@/ui/Icon';
import type { WhiteboardScene } from './WhiteboardNode';
import { isAllowedLibraryUrl, libraryAdapter, loadLibrary, LIBRARY_CHANGED_EVENT } from './library';

interface WhiteboardEditorProps {
  scene: WhiteboardScene;
  readOnly: boolean;
  dark: boolean;
  onSave: (scene: WhiteboardScene, svg: string) => void;
  onClose: () => void;
}

/** Nur nicht gelöschte Elemente und die Bilder, die davon noch benutzt werden. */
function compact(elements: readonly ExcalidrawElement[], files: BinaryFiles): WhiteboardScene {
  const live = getNonDeletedElements(elements);
  const used: BinaryFiles = {};
  for (const el of live) {
    if (el.type === 'image' && el.fileId && files[el.fileId]) used[el.fileId] = files[el.fileId];
  }
  return { elements: live, files: used };
}

/** Vorschau für die Notiz: helles Schema ohne Hintergrund, Schriften eingebettet (für <img>). */
async function renderPreview(scene: WhiteboardScene): Promise<string> {
  if (!scene.elements.length) return '';
  const svg = await exportToSvg({
    elements: scene.elements,
    files: scene.files,
    appState: { exportBackground: false, exportWithDarkMode: false },
    exportPadding: 16,
  });
  return svg.outerHTML;
}

/** Vollbild-Zeichenfenster mit Excalidraw. Speichert während des Zeichnens und beim Schließen. */
export default function WhiteboardEditor({ scene, readOnly, dark, onSave, onClose }: WhiteboardEditorProps) {
  const latest = useRef<WhiteboardScene | null>(null);
  const lastHash = useRef(hashElementsVersion(scene.elements));
  const lastFileCount = useRef(Object.keys(scene.files).length);
  const timer = useRef<number>();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  async function flush() {
    window.clearTimeout(timer.current);
    const next = latest.current;
    if (!next) return;
    latest.current = null;
    const svg = await renderPreview(next);
    try {
      onSaveRef.current(next, svg);
    } catch {
      // Block wurde inzwischen entfernt (z. B. Notiz gewechselt) – nichts mehr zu speichern.
    }
  }

  // Ungespeichertes beim Schließen (auch beim Notizwechsel) nicht verlieren.
  useEffect(() => () => void flush(), []);

  async function close() {
    await flush();
    onClose();
  }

  // Entf/Backspace ohne Auswahl schließt das Fenster – mit Auswahl löscht Excalidraw die Elemente.
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  // Bibliothek laden/speichern (für alle Whiteboards gemeinsam).
  useHandleLibrary({ excalidrawAPI, adapter: libraryAdapter, validateLibraryUrl: isAllowedLibraryUrl });
  // Während das Fenster offen ist, importierte Bibliotheken sofort anzeigen.
  useEffect(() => {
    if (!excalidrawAPI) return;
    const onChange = async () =>
      excalidrawAPI.updateLibrary({ libraryItems: await loadLibrary(), openLibraryMenu: true });
    window.addEventListener(LIBRARY_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(LIBRARY_CHANGED_EVENT, onChange);
  }, [excalidrawAPI]);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const state = api.current?.getAppState();
      if (!state || state.editingTextElement || Object.values(state.selectedElementIds).some(Boolean)) return;
      e.preventDefault();
      e.stopPropagation();
      void closeRef.current();
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  return (
    <Excalidraw
      initialData={{ elements: scene.elements, files: scene.files, scrollToContent: true }}
      theme={dark ? 'dark' : 'light'}
      langCode="de-DE"
      // Handschrift-Schrift sofort laden: Sonst misst Excalidraw den ersten Text mit der
      // Ersatzschrift und schneidet ihn danach ab.
      excalidrawAPI={(instance) => {
        api.current = instance;
        setExcalidrawAPI(instance);
        void document.fonts.load('20px Excalifont').catch(() => {});
        // autoFocus allein reicht nicht zuverlässig (Fenster kommt per Klick/Lazy-Load) –
        // ohne Fokus gingen Tasten erst nach einem Klick in die Zeichenfläche an Excalidraw.
        requestAnimationFrame(() => document.querySelector<HTMLElement>('.b-whiteboard-window .excalidraw-container')?.focus());
      }}
      autoFocus
      viewModeEnabled={readOnly}
      UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, toggleTheme: null } }}
      onChange={(elements, _appState, files) => {
        if (readOnly) return;
        // onChange feuert auch bei Mausbewegung und Zoom – nur echte Änderungen speichern.
        const hash = hashElementsVersion(elements);
        const fileCount = Object.keys(files).length;
        if (hash === lastHash.current && fileCount === lastFileCount.current) return;
        lastHash.current = hash;
        lastFileCount.current = fileCount;
        latest.current = compact(elements, files);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void flush(), 800);
      }}
      renderTopRightUI={() => (
        <button type="button" className="b-whiteboard-done" onClick={() => void close()}>
          <Icon name={readOnly ? 'x' : 'check'} /> {readOnly ? 'Schließen' : 'Fertig'}
        </button>
      )}
    />
  );
}
