import type { Editor } from '@tiptap/react';
import { Icon, type IconName } from '@/ui/Icon';
import { OPEN_LINK_EVENT } from './Toolbar';

interface FormatTabProps {
  editor: Editor;
}

interface FormatItem {
  label: string;
  icon: IconName;
  active: (e: Editor) => boolean;
  run: (e: Editor) => void;
}

const groups: { title: string; items: FormatItem[] }[] = [
  {
    title: 'Titel',
    items: [1, 2, 3].map((level) => ({
      label: ['Titel', 'Untertitel', 'Überschrift'][level - 1],
      icon: (['heading', 'heading2', 'heading3'] as const)[level - 1],
      active: (e) => e.isActive('heading', { level }),
      run: (e) => e.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run(),
    })),
  },
  {
    title: 'Inhalt',
    items: [
      { label: 'Fett', icon: 'bold', active: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
      { label: 'Kursiv', icon: 'italic', active: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
      { label: 'Durchgestrichen', icon: 'strike', active: (e) => e.isActive('strike'), run: (e) => e.chain().focus().toggleStrike().run() },
      { label: 'Code', icon: 'code', active: (e) => e.isActive('code'), run: (e) => e.chain().focus().toggleCode().run() },
      {
        label: 'Link',
        icon: 'link',
        active: (e) => e.isActive('link'),
        run: (e) => {
          e.commands.focus();
          window.dispatchEvent(new Event(OPEN_LINK_EVENT));
        },
      },
      { label: 'Lücke', icon: 'cloze', active: (e) => e.isActive('cloze'), run: (e) => e.chain().focus().toggleCloze().run() },
      { label: 'Zitat', icon: 'quote', active: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
    ],
  },
  {
    title: 'Listen',
    items: [
      { label: 'Aufzählung', icon: 'list', active: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
      { label: 'Nummeriert', icon: 'listOrdered', active: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
    ],
  },
];

/** Format-Tab: wendet Text-Formatierungen auf die aktuelle Auswahl/Cursorposition an. */
export function FormatTab({ editor }: FormatTabProps) {
  return (
    <div className="c-format-tab">
      {groups.map((g) => (
        <div key={g.title} className="c-blocks-aside-group">
          <h2>{g.title}</h2>
          <div className="c-blocks-aside-grid">
            {g.items.map((item) => (
              <button
                key={item.label}
                type="button"
                className={item.active(editor) ? 'active' : ''}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => item.run(editor)}
              >
                <span className="c-blocks-aside-icon">
                  <Icon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
