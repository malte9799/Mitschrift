import type { Editor } from '@tiptap/core';

/** Event, das den Bearbeiten-Popover für eine Inline-Formel bzw. Fußnote öffnet (siehe InlineAtomEditor). */
export const EDIT_INLINE_EVENT = 'mitschrift:edit-inline';

export interface EditInlineDetail {
  editor: Editor;
  pos: number;
}

export function openInlineEditor(editor: Editor, pos: number) {
  window.dispatchEvent(new CustomEvent<EditInlineDetail>(EDIT_INLINE_EVENT, { detail: { editor, pos } }));
}

/** Nach einer Änderung erst öffnen, wenn der Knoten im DOM steht. */
export function openInlineEditorSoon(editor: Editor, pos: number) {
  requestAnimationFrame(() => {
    if (!editor.isDestroyed) openInlineEditor(editor, pos);
  });
}
