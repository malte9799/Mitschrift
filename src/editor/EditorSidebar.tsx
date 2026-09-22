import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { motion } from 'motion/react';
import { BlocksAside } from './BlocksAside';
import { FormatTab } from './FormatTab';
import { InfoTab } from './InfoTab';
import { useEditorTick } from './useEditable';
import type { Note } from '@/storage';

type Tab = 'einfuegen' | 'format' | 'info';

const tabs: { id: Tab; label: string }[] = [
  { id: 'einfuegen', label: 'Einfügen' },
  { id: 'format', label: 'Format' },
  { id: 'info', label: 'Info' },
];

interface EditorSidebarProps {
  editor: Editor;
  note: Note;
  onToggleStar: () => void;
  onDelete: () => void;
}

/** Rechte Seitenleiste mit Tabs: Bausteine einfügen, Text formatieren, Notiz-Info. */
export function EditorSidebar({ editor, note, onToggleStar, onDelete }: EditorSidebarProps) {
  const [tab, setTab] = useState<Tab>('einfuegen');
  useEditorTick(editor);

  return (
    <aside className="c-editor-sidebar" aria-label="Editor-Seitenleiste">
      <div className="c-editor-sidebar-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {tab === t.id && <motion.span layoutId="sidebar-tab" className="c-tab-pill" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="c-editor-sidebar-body">
        {tab === 'einfuegen' && <BlocksAside editor={editor} />}
        {tab === 'format' && <FormatTab editor={editor} />}
        {tab === 'info' && <InfoTab note={note} onToggleStar={onToggleStar} onDelete={onDelete} />}
      </div>
    </aside>
  );
}
