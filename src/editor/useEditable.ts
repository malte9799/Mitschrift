import { useEffect, useReducer, useState } from 'react';
import type { Editor } from '@tiptap/core';

/**
 * Ob der Editor gerade bearbeitbar ist. Interaktive Blöcke zeigen im
 * Bearbeiten-Modus ein Formular, im Lernmodus (nicht editierbar) die Übung.
 */
export function useEditable(editor: Editor): boolean {
  const [editable, setEditable] = useState(editor.isEditable);
  useEffect(() => {
    const sync = () => setEditable(editor.isEditable);
    editor.on('update', sync);
    editor.on('transaction', sync);
    return () => {
      editor.off('update', sync);
      editor.off('transaction', sync);
    };
  }, [editor]);
  return editable;
}

/** Rendert die Komponente bei jeder Transaktion neu, z. B. für aktive Format-Zustände. */
export function useEditorTick(editor: Editor) {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    editor.on('transaction', tick);
    return () => {
      editor.off('transaction', tick);
    };
  }, [editor]);
}
