import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TextVariantExtension } from './TextVariant';
import { CalloutNode } from './CalloutNode';
import { StoredImage } from './StoredImage';
import { learnExtensions } from '@/blocks';
import { CodeBlock } from '@/blocks/code/CodeBlock';
import { MarkdownClipboard } from './MarkdownClipboard';

export const noteExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false },
    // Ersetzt durch den Codeblock mit Highlighting, Zeilennummern und Kopier-Knopf.
    codeBlock: false,
  }),
  CodeBlock,
  TaskList,
  TaskItem.configure({ nested: true }),
  TextStyle,
  Color,
  TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
  TextVariantExtension,
  StoredImage,
  CalloutNode,
  MarkdownClipboard,
  ...learnExtensions,
  Placeholder.configure({
    placeholder: ({ node }) =>
      node.type.name === 'codeBlock' ? '' : node.type.name === 'heading' ? 'Überschrift' : 'Schreib etwas, oder tippe „/“ für Blöcke …',
    includeChildren: false,
  }),
];
