import { ToggleNode } from './toggle/ToggleNode';
import { FlashcardsNode } from './flashcard/FlashcardsNode';
import { QuizNode } from './quiz/QuizNode';
import { ClozeMark } from './cloze/ClozeMark';
import { DiagramNode } from './diagram/DiagramNode';
import { MermaidNode } from './mermaid/MermaidNode';
import { CollectionNode } from './collection/CollectionNode';
import { tableExtensions } from './table/tableExtensions';

/** Alle interaktiven Blöcke. Neue Blöcke hier + in editor/blockTypes.ts registrieren. */
export const learnExtensions = [ToggleNode, FlashcardsNode, QuizNode, ClozeMark, DiagramNode, MermaidNode, CollectionNode, ...tableExtensions];
