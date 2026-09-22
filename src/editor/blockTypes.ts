import type { Editor } from '@tiptap/react';
import type { IconName } from '@/ui/Icon';
import { pickImage } from './StoredImage';

export type BlockTypeId =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'numberedList'
  | 'quote'
  | 'code'
  | 'image'
  | 'divider'
  | 'calloutMerke'
  | 'calloutHint'
  | 'calloutWarn'
  | 'toggle'
  | 'flashcards'
  | 'cloze'
  | 'quiz';

export type BlockCategory = 'lernen' | 'textstile' | 'listen' | 'medien' | 'trennlinien' | 'hervorheben';

export interface BlockTypeDef {
  id: BlockTypeId;
  label: string;
  icon: IconName;
  category: BlockCategory;
  keywords: string[];
  run: (editor: Editor) => void;
}

export const categoryLabels: Record<BlockCategory, string> = {
  lernen: 'Lernen',
  hervorheben: 'Hervorheben',
  textstile: 'Textstile',
  listen: 'Listen',
  medien: 'Medien',
  trennlinien: 'Trennlinien',
};

export const blockTypes: BlockTypeDef[] = [
  {
    id: 'toggle',
    label: 'Aufklappen',
    icon: 'toggle',
    category: 'lernen',
    keywords: ['toggle', 'aufklappen', 'details', 'antwort', 'lösung'],
    run: (editor) => editor.chain().focus().insertToggle().run(),
  },
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
  {
    id: 'paragraph',
    label: 'Text',
    icon: 'paragraph',
    category: 'textstile',
    keywords: ['text', 'absatz', 'paragraph'],
    run: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'heading1',
    label: 'Titel',
    icon: 'heading',
    category: 'textstile',
    keywords: ['h1', 'titel', 'ueberschrift', 'überschrift'],
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'Untertitel',
    icon: 'heading2',
    category: 'textstile',
    keywords: ['h2', 'untertitel', 'ueberschrift', 'überschrift'],
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'Überschrift',
    icon: 'heading3',
    category: 'textstile',
    keywords: ['h3', 'ueberschrift', 'überschrift'],
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'quote',
    label: 'Zitat',
    icon: 'quote',
    category: 'textstile',
    keywords: ['zitat', 'quote'],
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: 'Codeblock',
    icon: 'code',
    category: 'textstile',
    keywords: ['code', 'quelltext'],
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'bulletList',
    label: 'Aufzählung',
    icon: 'list',
    category: 'listen',
    keywords: ['liste', 'bullet', 'aufzaehlung', 'aufzählung'],
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'numberedList',
    label: 'Nummerierte Liste',
    icon: 'listOrdered',
    category: 'listen',
    keywords: ['liste', 'nummeriert', 'ordered'],
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
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
    id: 'divider',
    label: 'Trennlinie',
    icon: 'divider',
    category: 'trennlinien',
    keywords: ['trennlinie', 'divider', 'linie'],
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'calloutMerke',
    label: 'Merke',
    icon: 'callout',
    category: 'hervorheben',
    keywords: ['merke', 'callout', 'hinweis'],
    run: (editor) => editor.chain().focus().setCallout('merke').run(),
  },
  {
    id: 'calloutHint',
    label: 'Hinweis',
    icon: 'callout',
    category: 'hervorheben',
    keywords: ['hinweis', 'hint', 'tipp'],
    run: (editor) => editor.chain().focus().setCallout('hint').run(),
  },
  {
    id: 'calloutWarn',
    label: 'Warnung',
    icon: 'callout',
    category: 'hervorheben',
    keywords: ['warnung', 'warn', 'achtung'],
    run: (editor) => editor.chain().focus().setCallout('warn').run(),
  },
];

export const blockCategoryOrder: BlockCategory[] = ['lernen', 'textstile', 'hervorheben', 'listen', 'medien', 'trennlinien'];
