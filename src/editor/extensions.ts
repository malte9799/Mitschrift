import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { CalloutNode } from './CalloutNode';
import { StoredImage } from './StoredImage';
import { learnExtensions } from '@/blocks';

export const noteExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false },
  }),
  StoredImage,
  CalloutNode,
  ...learnExtensions,
  Placeholder.configure({
    placeholder: ({ node }) => (node.type.name === 'heading' ? 'Überschrift' : 'Schreib etwas, oder tippe „/“ für Blöcke …'),
    includeChildren: false,
  }),
];
