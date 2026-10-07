import { ToggleNode } from './toggle/ToggleNode';
import { FlashcardsNode } from './flashcard/FlashcardsNode';
import { QuizNode } from './quiz/QuizNode';
import { ClozeMark } from './cloze/ClozeMark';
import { DiagramNode } from './diagram/DiagramNode';
import { MermaidNode } from './mermaid/MermaidNode';
import { WhiteboardNode } from './whiteboard/WhiteboardNode';
import { CollectionNode } from './collection/CollectionNode';
import { LinkedCollectionNode } from './collection/LinkedCollectionNode';
import { tableExtensions } from './table/tableExtensions';
import { PlotNode } from './plot/PlotNode';
import { TimelineNode } from './timeline/TimelineNode';
import { GlossaryListNode } from './glossary/GlossaryListNode';
import { GalleryNode } from './gallery/GalleryNode';
import { SvgNode } from './svg/SvgNode';
import { AttachmentNode } from './attachment/AttachmentNode';

/** Alle interaktiven Blöcke. Neue Blöcke hier + in editor/blockTypes.ts registrieren. */
export const learnExtensions = [
  ToggleNode,
  FlashcardsNode,
  QuizNode,
  ClozeMark,
  DiagramNode,
  MermaidNode,
  WhiteboardNode,
  CollectionNode,
  LinkedCollectionNode,
  PlotNode,
  TimelineNode,
  GlossaryListNode,
  GalleryNode,
  SvgNode,
  AttachmentNode,
  ...tableExtensions,
];
