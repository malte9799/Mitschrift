import type { Editor } from '@tiptap/react';
import type { IconName } from '@/ui/Icon';
import { pickImage } from './StoredImage';
import { calloutLabels } from './CalloutNode';

export type BlockTypeId =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'strong'
  | 'paragraph'
  | 'caption'
  | 'quote'
  | 'bulletList'
  | 'taskList'
  | 'toggle'
  | 'numberedList'
  | 'calloutNote'
  | 'calloutTip'
  | 'calloutImportant'
  | 'calloutWarning'
  | 'calloutCaution'
  | 'flashcards'
  | 'quiz'
  | 'cloze'
  | 'table'
  | 'collection'
  | 'steps'
  | 'timeline'
  | 'bars'
  | 'cycle'
  | 'mermaid'
  | 'image'
  | 'code'
  | 'divider';

export type BlockCategory = 'textstile' | 'listen' | 'hervorheben' | 'lernen' | 'daten' | 'medien';

export interface BlockTypeDef {
  id: BlockTypeId;
  label: string;
  icon: IconName;
  category: BlockCategory;
  keywords: string[];
  run: (editor: Editor) => void;
}

export const categoryLabels: Record<BlockCategory, string> = {
  textstile: 'Textstile',
  listen: 'Listen',
  hervorheben: 'Hervorheben',
  lernen: 'Lernen',
  daten: 'Tabellen & Diagramme',
  medien: 'Medien & Code',
};

export const blockCategoryOrder: BlockCategory[] = ['textstile', 'listen', 'hervorheben', 'lernen', 'daten', 'medien'];

/** Neuer Block hinter der aktuellen Zeile – außer die Zeile ist leer, dann wird sie ersetzt. */
function insertBlockAfterLine(editor: Editor, content: Record<string, unknown>) {
  const { $from } = editor.state.selection;
  if ($from.depth === 1 && $from.parent.isTextblock && $from.parent.textContent === '') {
    const start = $from.before(1);
    editor.chain().focus().insertContentAt({ from: start, to: $from.after(1) }, content).setTextSelection(start + 1).run();
    return;
  }
  const after = $from.depth > 0 ? $from.after(1) : $from.pos;
  editor.chain().focus().insertContentAt(after, content).setTextSelection(after + 1).run();
}

export const blockTypes: BlockTypeDef[] = [
  // ---------- Textstile (wie im Format-Tab) ----------
  {
    id: 'heading1',
    label: 'Titel',
    icon: 'heading',
    category: 'textstile',
    keywords: ['h1', 'titel', 'ueberschrift', 'überschrift'],
    run: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'Untertitel',
    icon: 'heading2',
    category: 'textstile',
    keywords: ['h2', 'untertitel', 'ueberschrift', 'überschrift'],
    run: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'Überschrift',
    icon: 'heading3',
    category: 'textstile',
    keywords: ['h3', 'ueberschrift', 'überschrift'],
    run: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: 'strong',
    label: 'Fett',
    icon: 'bold',
    category: 'textstile',
    keywords: ['fett', 'strong', 'hervorgehoben'],
    run: (editor) => editor.chain().focus().setTextVariant('strong').run(),
  },
  {
    id: 'paragraph',
    label: 'Text',
    icon: 'paragraph',
    category: 'textstile',
    keywords: ['text', 'absatz', 'paragraph'],
    run: (editor) => editor.chain().focus().setTextVariant(null).run(),
  },
  {
    id: 'caption',
    label: 'Beschriftung',
    icon: 'paragraph',
    category: 'textstile',
    keywords: ['beschriftung', 'caption', 'klein', 'notiz'],
    run: (editor) => editor.chain().focus().setTextVariant('caption').run(),
  },
  {
    id: 'quote',
    label: 'Zitat',
    icon: 'quote',
    category: 'textstile',
    keywords: ['zitat', 'quote'],
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },

  // ---------- Listen ----------
  {
    id: 'bulletList',
    label: 'Aufzählung',
    icon: 'list',
    category: 'listen',
    keywords: ['liste', 'bullet', 'aufzaehlung', 'aufzählung', 'punkte'],
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'taskList',
    label: 'Aufgabenliste',
    icon: 'checkbox',
    category: 'listen',
    keywords: ['aufgaben', 'checkliste', 'todo', 'checkbox', 'häkchen'],
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'toggle',
    label: 'Toggle-Liste',
    icon: 'toggle',
    category: 'listen',
    keywords: ['toggle', 'aufklappen', 'details', 'antwort', 'lösung'],
    run: (editor) => editor.chain().focus().insertToggle().run(),
  },
  {
    id: 'numberedList',
    label: 'Nummeriert',
    icon: 'listOrdered',
    category: 'listen',
    keywords: ['liste', 'nummeriert', 'nummer', 'ordered', 'aufzählung'],
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },

  // ---------- Hervorheben ----------
  ...(
    [
      ['calloutNote', 'note', ['hinweis', 'note', 'info', 'callout']],
      ['calloutTip', 'tip', ['tipp', 'tip', 'hinweis']],
      ['calloutImportant', 'important', ['wichtig', 'important', 'merke']],
      ['calloutWarning', 'warning', ['warnung', 'warning', 'achtung']],
      ['calloutCaution', 'caution', ['vorsicht', 'caution', 'gefahr']],
    ] as const
  ).map(
    ([id, variant, keywords]): BlockTypeDef => ({
      id,
      label: calloutLabels[variant],
      icon: 'callout',
      category: 'hervorheben',
      keywords: [...keywords],
      run: (editor) => editor.chain().focus().setCallout(variant).run(),
    }),
  ),

  // ---------- Lernen ----------
  {
    id: 'flashcards',
    label: 'Karteikarten',
    icon: 'cards',
    category: 'lernen',
    keywords: ['karteikarte', 'flashcard', 'karten', 'vokabeln'],
    run: (editor) => editor.chain().focus().insertFlashcards().run(),
  },
  {
    id: 'quiz',
    label: 'Quiz',
    icon: 'quiz',
    category: 'lernen',
    keywords: ['quiz', 'test', 'frage', 'multiple choice'],
    run: (editor) => editor.chain().focus().insertQuiz().run(),
  },
  {
    id: 'cloze',
    label: 'Lücke',
    icon: 'cloze',
    category: 'lernen',
    keywords: ['lücke', 'lueckentext', 'cloze', 'luecke'],
    run: (editor) => editor.chain().focus().insertCloze().run(),
  },

  // ---------- Tabellen & Diagramme ----------
  {
    id: 'table',
    label: 'Tabelle',
    icon: 'table',
    category: 'daten',
    keywords: ['tabelle', 'table', 'raster', 'spalten'],
    run: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'collection',
    label: 'Sammlung',
    icon: 'collection',
    category: 'daten',
    keywords: ['sammlung', 'datenbank', 'collection', 'tabellenblatt', 'felder', 'erweiterte tabelle'],
    run: (editor) => editor.chain().focus().insertCollection().run(),
  },
  {
    id: 'steps',
    label: 'Ablauf',
    icon: 'steps',
    category: 'daten',
    keywords: ['ablauf', 'schritte', 'prozess', 'diagramm', 'steps'],
    run: (editor) => editor.chain().focus().insertDiagram('steps').run(),
  },
  {
    id: 'timeline',
    label: 'Zeitstrahl',
    icon: 'timeline',
    category: 'daten',
    keywords: ['zeitstrahl', 'timeline', 'chronologie', 'geschichte', 'diagramm'],
    run: (editor) => editor.chain().focus().insertDiagram('timeline').run(),
  },
  {
    id: 'bars',
    label: 'Balken',
    icon: 'bars',
    category: 'daten',
    keywords: ['balken', 'diagramm', 'chart', 'vergleich', 'bars'],
    run: (editor) => editor.chain().focus().insertDiagram('bars').run(),
  },
  {
    id: 'cycle',
    label: 'Kreislauf',
    icon: 'cycle',
    category: 'daten',
    keywords: ['kreislauf', 'zyklus', 'cycle', 'diagramm'],
    run: (editor) => editor.chain().focus().insertDiagram('cycle').run(),
  },
  {
    id: 'mermaid',
    label: 'Mermaid',
    icon: 'mermaid',
    category: 'daten',
    keywords: ['mermaid', 'flussdiagramm', 'flowchart', 'diagramm', 'mindmap', 'sequenz', 'graph'],
    run: (editor) => editor.chain().focus().insertMermaid().run(),
  },

  // ---------- Medien & Code ----------
  {
    id: 'image',
    label: 'Bild',
    icon: 'image',
    category: 'medien',
    keywords: ['bild', 'image', 'foto'],
    run: (editor) => {
      const at = editor.state.selection.from;
      pickImage((src) => editor.chain().focus().setTextSelection(at).setImage({ src }).run());
    },
  },
  {
    id: 'code',
    label: 'Codeblock',
    icon: 'code',
    category: 'medien',
    keywords: ['code', 'quelltext', 'programmieren', 'snippet', 'syntax'],
    // Startet mit drei leeren Zeilen.
    run: (editor) => insertBlockAfterLine(editor, { type: 'codeBlock', content: [{ type: 'text', text: '\n\n' }] }),
  },
  {
    id: 'divider',
    label: 'Trennlinie',
    icon: 'divider',
    category: 'medien',
    keywords: ['trennlinie', 'divider', 'linie'],
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];
