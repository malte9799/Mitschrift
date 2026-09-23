import type { Editor } from '@tiptap/react';
import { Icon, type IconName } from '@/ui/Icon';
import { prepareBlockInsert, formatChain } from './BlockSelection';

interface FormatTabProps {
  editor: Editor;
}

interface FormatItem {
  label: string;
  active: (e: Editor) => boolean;
  run: (e: Editor) => void;
}

interface TextItem extends FormatItem {
  className: string;
}

interface IconItem extends FormatItem {
  icon: IconName;
  disabled?: (e: Editor) => boolean;
}

const textStyles: TextItem[][] = [
  [
    ...[1, 2, 3].map((level) => ({
      label: ['Titel', 'Untertitel', 'Überschrift'][level - 1],
      className: `is-h${level}`,
      active: (e: Editor) => e.isActive('heading', { level }),
      run: (e: Editor) => formatChain(e).setHeading({ level: level as 1 | 2 | 3 }).run(),
    })),
  ],
  [
    {
      label: 'Fett',
      className: 'is-strong',
      active: (e) => e.isActive('paragraph', { variant: 'strong' }),
      run: (e) => formatChain(e).setTextVariant('strong').run(),
    },
    {
      label: 'Text',
      className: 'is-body',
      active: (e) => e.isActive('paragraph', { variant: null }),
      run: (e) => formatChain(e).setTextVariant(null).run(),
    },
    {
      label: 'Beschriftung',
      className: 'is-caption',
      active: (e) => e.isActive('paragraph', { variant: 'caption' }),
      run: (e) => formatChain(e).setTextVariant('caption').run(),
    },
  ],
];

const listItemType = (e: Editor) => (e.isActive('taskItem') ? 'taskItem' : 'listItem');

const marks: IconItem[] = [
  { label: 'Fett', icon: 'bold', active: (e) => e.isActive('bold'), run: (e) => formatChain(e).toggleBold().run() },
  { label: 'Kursiv', icon: 'italic', active: (e) => e.isActive('italic'), run: (e) => formatChain(e).toggleItalic().run() },
  { label: 'Durchgestrichen', icon: 'strike', active: (e) => e.isActive('strike'), run: (e) => formatChain(e).toggleStrike().run() },
  { label: 'Code', icon: 'code', active: (e) => e.isActive('code'), run: (e) => formatChain(e).toggleCode().run() },
];

const blocks: IconItem[] = [
  { label: 'Checkliste', icon: 'checkbox', active: (e) => e.isActive('taskList'), run: (e) => formatChain(e).toggleTaskList().run() },
  { label: 'Aufklappen', icon: 'toggle', active: (e) => e.isActive('toggleBlock'), run: (e) => {
    // Bei Block-Auswahl hinter den markierten Blöcken einfügen statt sie zu ersetzen.
    prepareBlockInsert(e);
    e.chain().focus().insertToggle().run();
  } },
  { label: 'Aufzählung', icon: 'list', active: (e) => e.isActive('bulletList'), run: (e) => formatChain(e).toggleBulletList().run() },
  { label: 'Nummerierte Liste', icon: 'listOrdered', active: (e) => e.isActive('orderedList'), run: (e) => formatChain(e).toggleOrderedList().run() },
];

const indent: IconItem[] = [
  {
    label: 'Ausrücken',
    icon: 'outdent',
    active: () => false,
    disabled: (e) => !e.can().liftListItem(listItemType(e)),
    run: (e) => formatChain(e).liftListItem(listItemType(e)).run(),
  },
  {
    label: 'Einrücken',
    icon: 'indent',
    active: () => false,
    disabled: (e) => !e.can().sinkListItem(listItemType(e)),
    run: (e) => formatChain(e).sinkListItem(listItemType(e)).run(),
  },
];

const aligns: IconItem[] = (
  [
    ['left', 'alignLeft', 'Linksbündig'],
    ['center', 'alignCenter', 'Zentriert'],
    ['right', 'alignRight', 'Rechtsbündig'],
    ['justify', 'alignJustify', 'Blocksatz'],
  ] as const
).map(([align, icon, label]) => ({
  label,
  icon,
  active: (e) =>
    e.isActive({ textAlign: align }) ||
    (align === 'left' && !e.getAttributes('paragraph').textAlign && !e.getAttributes('heading').textAlign),
  run: (e) => (align === 'left' ? formatChain(e).unsetTextAlign().run() : formatChain(e).setTextAlign(align).run()),
}));

const colors: { label: string; value: string | null }[] = [
  { label: 'Standard', value: null },
  { label: 'Grau', value: '#8E8E93' },
  { label: 'Rot', value: '#E5484D' },
  { label: 'Orange', value: '#F07A1A' },
  { label: 'Grün', value: '#30A46C' },
  { label: 'Blau', value: '#3E7BFA' },
  { label: 'Lila', value: '#8E4EC6' },
];

const keepFocus = (e: React.MouseEvent) => e.preventDefault();

function Segment({ items, editor }: { items: IconItem[]; editor: Editor }) {
  return (
    <div className="c-format-seg">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={item.active(editor) ? 'active' : ''}
          disabled={item.disabled?.(editor)}
          aria-label={item.label}
          title={item.label}
          onMouseDown={keepFocus}
          onClick={() => item.run(editor)}
        >
          <Icon name={item.icon} />
        </button>
      ))}
    </div>
  );
}

/** Format-Tab: Textstile, Auszeichnungen, Listen, Ausrichtung und Farbe für die aktuelle Auswahl. */
export function FormatTab({ editor }: FormatTabProps) {
  const current = (editor.getAttributes('textStyle').color as string | undefined) ?? null;
  const isCustom = current !== null && !colors.some((c) => c.value?.toLowerCase() === current.toLowerCase());

  const setColor = (value: string | null) =>
    value ? formatChain(editor).setColor(value).run() : formatChain(editor).unsetColor().run();

  return (
    <div className="c-format-tab">
      <div className="c-format-rows">
        {textStyles.map((row, i) => (
          <div key={i} className="c-format-seg is-text">
            {row.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`${item.className}${item.active(editor) ? ' active' : ''}`}
                onMouseDown={keepFocus}
                onClick={() => item.run(editor)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
        <Segment items={marks} editor={editor} />
        <Segment items={blocks} editor={editor} />
        <div className="c-format-split">
          <Segment items={indent} editor={editor} />
          <Segment items={aligns} editor={editor} />
        </div>
      </div>

      <div className="c-format-colors">
        <h2>Farbe</h2>
        <div className="c-format-swatches">
          {colors.map((c) => (
            <button
              key={c.label}
              type="button"
              className={`c-format-swatch${c.value ? '' : ' is-default'}${(c.value?.toLowerCase() ?? null) === current?.toLowerCase() || (!c.value && !current) ? ' active' : ''}`}
              style={c.value ? { background: c.value } : undefined}
              aria-label={c.label}
              title={c.label}
              onMouseDown={keepFocus}
              onClick={() => setColor(c.value)}
            />
          ))}
          <label
            className={`c-format-swatch is-picker${isCustom ? ' active' : ''}`}
            title="Eigene Farbe"
            style={isCustom ? { background: current } : undefined}
          >
            <input
              type="color"
              aria-label="Eigene Farbe"
              value={isCustom ? current : '#5B5BD6'}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
