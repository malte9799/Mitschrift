import type { Editor } from '@tiptap/react';
import type { IconName } from '@/ui/Icon';
import { calloutLabels } from './CalloutNode';
import { dividerLabels } from './Divider';
import { startNoteBlockPicker } from './NoteLink';
import { insertInlineMath } from './math/MathNodes';
import { insertFootnote } from './Footnote';

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
  | 'linkedCollection'
  | 'columns2'
  | 'columns3'
  | 'toc'
  | 'steps'
  | 'timeline'
  | 'bars'
  | 'cycle'
  | 'plot'
  | 'glossaryList'
  | 'mermaid'
  | 'whiteboard'
  | 'image'
  | 'gallery'
  | 'svg'
  | 'attachment'
  | 'code'
  | 'dividerDots'
  | 'dividerDotted'
  | 'divider'
  | 'dividerBold'
  | 'pageBreak'
  | 'noteRow'
  | 'noteCard'
  | 'formula'
  | 'footnote';

export type BlockCategory = 'rich' | 'interaktiv' | 'trennlinien' | 'medien' | 'listen' | 'hervorheben' | 'textstile';

export interface BlockTypeDef {
  id: BlockTypeId;
  label: string;
  icon: IconName;
  category: BlockCategory;
  keywords: string[];
  run: (editor: Editor) => void;
}

export const categoryLabels: Record<BlockCategory, string> = {
  rich: 'Rich Blocks',
  interaktiv: 'Interaktiv',
  trennlinien: 'Trennlinien',
  medien: 'Medien',
  listen: 'Listen',
  hervorheben: 'Hervorheben',
  textstile: 'Textstile',
};

// Textstile zuletzt – die sind auch über den Format-Tab erreichbar.
export const blockCategoryOrder: BlockCategory[] = ['rich', 'interaktiv', 'trennlinien', 'medien', 'listen', 'hervorheben', 'textstile'];

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
  // ---------- Rich Blocks ----------
  {
    id: 'noteRow',
    label: 'Notiz als Zeile',
    icon: 'noteRow',
    category: 'rich',
    keywords: ['notiz', 'seite', 'verweis', 'link', 'dokument', 'unterseite', 'zeile'],
    run: (editor) => startNoteBlockPicker(editor, 'row'),
  },
  {
    id: 'noteCard',
    label: 'Notiz als Karte',
    icon: 'noteCard',
    category: 'rich',
    keywords: ['notiz', 'seite', 'verweis', 'karte', 'vorschau', 'dokument', 'kachel', 'raster', 'grid'],
    run: (editor) => startNoteBlockPicker(editor, 'card'),
  },
  {
    id: 'table',
    label: 'Tabelle',
    icon: 'table',
    category: 'rich',
    keywords: ['tabelle', 'table', 'raster', 'spalten'],
    run: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'collection',
    label: 'Sammlung',
    icon: 'collection',
    category: 'rich',
    keywords: ['sammlung', 'datenbank', 'collection', 'tabellenblatt', 'felder', 'erweiterte tabelle'],
    run: (editor) => editor.chain().focus().insertCollection().run(),
  },
  {
    id: 'linkedCollection',
    label: 'Verknüpfte Sammlung',
    icon: 'link',
    category: 'rich',
    keywords: ['sammlung', 'datenbank', 'verknüpft', 'linked', 'ansicht', 'view', 'filter', 'board', 'kalender'],
    run: (editor) => editor.chain().focus().insertLinkedCollection().run(),
  },
  {
    id: 'columns2',
    label: '2 Spalten',
    icon: 'layoutGrid',
    category: 'rich',
    keywords: ['spalten', 'columns', 'layout', 'nebeneinander', 'zweispaltig'],
    run: (editor) => editor.chain().focus().insertColumns(2).run(),
  },
  {
    id: 'columns3',
    label: '3 Spalten',
    icon: 'layoutGrid',
    category: 'rich',
    keywords: ['spalten', 'columns', 'layout', 'nebeneinander', 'dreispaltig'],
    run: (editor) => editor.chain().focus().insertColumns(3).run(),
  },
  {
    id: 'toc',
    label: 'Inhaltsverzeichnis',
    icon: 'list',
    category: 'rich',
    keywords: ['inhalt', 'inhaltsverzeichnis', 'toc', 'gliederung', 'überschriften', 'outline'],
    run: (editor) => editor.chain().focus().insertToc().run(),
  },
  {
    id: 'code',
    label: 'Codeblock',
    icon: 'code',
    category: 'rich',
    keywords: ['code', 'quelltext', 'programmieren', 'snippet', 'syntax'],
    // Startet mit drei leeren Zeilen.
    run: (editor) => insertBlockAfterLine(editor, { type: 'codeBlock', content: [{ type: 'text', text: '\n\n' }] }),
  },
  {
    id: 'mermaid',
    label: 'Mermaid',
    icon: 'mermaid',
    category: 'rich',
    keywords: ['mermaid', 'flussdiagramm', 'flowchart', 'diagramm', 'mindmap', 'sequenz', 'graph'],
    run: (editor) => editor.chain().focus().insertMermaid().run(),
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    icon: 'whiteboard',
    category: 'rich',
    keywords: ['whiteboard', 'zeichnen', 'skizze', 'excalidraw', 'tafel', 'malen', 'handschrift'],
    run: (editor) => editor.chain().focus().insertWhiteboard().run(),
  },
  {
    id: 'plot',
    label: 'Funktionsplotter',
    icon: 'plot',
    category: 'rich',
    keywords: ['plot', 'plotter', 'funktion', 'graph', 'mathe', 'parabel', 'kurve', 'koordinatensystem', 'geogebra'],
    run: (editor) => insertBlockAfterLine(editor, { type: 'plot' }),
  },
  {
    id: 'glossaryList',
    label: 'Abkürzungsverzeichnis',
    icon: 'book',
    category: 'rich',
    keywords: ['glossar', 'abkürzung', 'abkuerzung', 'verzeichnis', 'begriffe', 'akronym', 'fachbegriffe'],
    run: (editor) => insertBlockAfterLine(editor, { type: 'glossaryList' }),
  },
  {
    id: 'formula',
    label: 'Formel',
    icon: 'formula',
    category: 'rich',
    keywords: ['formel', 'math', 'mathe', 'latex', 'gleichung', 'katex'],
    run: (editor) => insertInlineMath(editor),
  },
  {
    id: 'footnote',
    label: 'Fußnote',
    icon: 'footnote',
    category: 'rich',
    keywords: ['fußnote', 'fussnote', 'footnote', 'quelle', 'anmerkung', 'referenz'],
    run: (editor) => insertFootnote(editor),
  },

  // ---------- Interaktiv ----------
  {
    id: 'flashcards',
    label: 'Karteikarten',
    icon: 'cards',
    category: 'interaktiv',
    keywords: ['karteikarte', 'flashcard', 'karten', 'vokabeln'],
    run: (editor) => editor.chain().focus().insertFlashcards().run(),
  },
  {
    id: 'quiz',
    label: 'Quiz',
    icon: 'quiz',
    category: 'interaktiv',
    keywords: ['quiz', 'test', 'frage', 'multiple choice'],
    run: (editor) => editor.chain().focus().insertQuiz().run(),
  },
  {
    id: 'cloze',
    label: 'Lücke',
    icon: 'cloze',
    category: 'interaktiv',
    keywords: ['lücke', 'lueckentext', 'cloze', 'luecke'],
    run: (editor) => editor.chain().focus().insertCloze().run(),
  },
  {
    id: 'steps',
    label: 'Ablauf',
    icon: 'steps',
    category: 'interaktiv',
    keywords: ['ablauf', 'schritte', 'prozess', 'diagramm', 'steps'],
    run: (editor) => editor.chain().focus().insertDiagram('steps').run(),
  },
  {
    id: 'timeline',
    label: 'Zeitstrahl',
    icon: 'timeline',
    category: 'interaktiv',
    keywords: ['zeitstrahl', 'timeline', 'chronologie', 'geschichte', 'diagramm', 'zeitraum', 'epoche', 'projekt', 'phasen'],
    run: (editor) => editor.chain().focus().insertTimeline().run(),
  },
  {
    id: 'bars',
    label: 'Balken',
    icon: 'bars',
    category: 'interaktiv',
    keywords: ['balken', 'diagramm', 'chart', 'vergleich', 'bars'],
    run: (editor) => editor.chain().focus().insertDiagram('bars').run(),
  },
  {
    id: 'cycle',
    label: 'Kreislauf',
    icon: 'cycle',
    category: 'interaktiv',
    keywords: ['kreislauf', 'zyklus', 'cycle', 'diagramm'],
    run: (editor) => editor.chain().focus().insertDiagram('cycle').run(),
  },

  // ---------- Trennlinien ----------
  ...(
    [
      ['dividerDots', 'dots', ['punkte', 'sternchen', 'extra dünn']],
      ['dividerDotted', 'dotted', ['gepunktet', 'dünn']],
      ['divider', 'regular', ['regulär', 'normal']],
      ['dividerBold', 'bold', ['fett', 'dick']],
      ['pageBreak', 'page', ['seitenumbruch', 'seite', 'umbruch', 'page break']],
    ] as const
  ).map(
    ([id, variant, keywords]): BlockTypeDef => ({
      id,
      label: dividerLabels[variant],
      icon: 'divider',
      category: 'trennlinien',
      keywords: ['trennlinie', 'divider', 'linie', ...keywords],
      run: (editor) => editor.chain().focus().setDivider(variant).run(),
    }),
  ),

  // ---------- Medien ----------
  {
    id: 'image',
    label: 'Bild',
    icon: 'image',
    category: 'medien',
    keywords: ['bild', 'image', 'foto', 'link', 'url', 'hochladen'],
    // Leerer Bild-Block: Datei hochladen, hineinziehen oder Link einfügen.
    run: (editor) => insertBlockAfterLine(editor, { type: 'image', attrs: { src: '' } }),
  },
  {
    id: 'gallery',
    label: 'Bildergalerie',
    icon: 'gallery',
    category: 'medien',
    keywords: ['galerie', 'bilder', 'fotos', 'sammlung', 'album', 'karussell', 'slideshow', 'gallery', 'mosaik', 'vergleich'],
    run: (editor) => insertBlockAfterLine(editor, { type: 'gallery' }),
  },
  {
    id: 'svg',
    label: 'SVG-Grafik',
    icon: 'bezier',
    category: 'medien',
    keywords: ['svg', 'vektor', 'grafik', 'icon', 'illustration', 'zeichnung', 'vector'],
    // Leerer Block zum Einfügen – SVG-Code direkt in die Notiz einfügen geht auch.
    run: (editor) => insertBlockAfterLine(editor, { type: 'svg' }),
  },
  {
    id: 'attachment',
    label: 'Datei-Anhang',
    icon: 'file',
    category: 'medien',
    keywords: ['datei', 'anhang', 'attachment', 'pdf', 'dokument', 'upload', 'download', 'zip'],
    run: (editor) => insertBlockAfterLine(editor, { type: 'attachment', attrs: { fileId: null } }),
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
  {
    id: 'quote',
    label: 'Zitat',
    icon: 'quote',
    category: 'hervorheben',
    keywords: ['zitat', 'quote'],
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
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

  // ---------- Textstile (wie im Format-Tab) ----------
  {
    id: 'heading1',
    label: 'H1',
    icon: 'heading',
    category: 'textstile',
    keywords: ['h1', 'titel', 'ueberschrift', 'überschrift'],
    run: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'H2',
    icon: 'heading2',
    category: 'textstile',
    keywords: ['h2', 'untertitel', 'ueberschrift', 'überschrift'],
    run: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'H3',
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
];
