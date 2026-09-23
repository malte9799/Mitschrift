import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TextVariantExtension } from './TextVariant';
import { CalloutNode } from './CalloutNode';
import { Divider } from './Divider';
import { StoredImage } from './StoredImage';
import { learnExtensions } from '@/blocks';
import { CodeBlock } from '@/blocks/code/CodeBlock';
import { MarkdownClipboard } from './MarkdownClipboard';
import { ConfirmDelete } from './ConfirmDelete';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { MathBlock, MathInline } from './math/MathNodes';
import { Footnote, Kbd } from './Footnote';
import { NoteBlockNode } from './noteBlock/NoteBlockNode';
import { GlossaryHighlight } from '@/glossary/GlossaryHighlight';

export const noteExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false },
    // Ersetzt durch den Codeblock mit Highlighting, Zeilennummern und Kopier-Knopf.
    codeBlock: false,
    // Ersetzt durch die Trennlinie mit Stilen.
    horizontalRule: false,
  }),
  Divider,
  CodeBlock,
  TaskList,
  TaskItem.configure({ nested: true }),
  TextStyle,
  Color,
  TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
  TextVariantExtension,
  StoredImage,
  CalloutNode,
  Subscript,
  Superscript,
  Kbd,
  MathInline,
  MathBlock,
  Footnote,
  NoteBlockNode,
  MarkdownClipboard,
  GlossaryHighlight,
  ConfirmDelete,
  ...learnExtensions,
  Placeholder.configure({
    placeholder: ({ node }) =>
      node.type.name === 'codeBlock' ? '' : node.type.name === 'heading' ? 'Überschrift' : 'Schreib etwas, oder tippe „/“ für Blöcke …',
    includeChildren: false,
  }),
];
