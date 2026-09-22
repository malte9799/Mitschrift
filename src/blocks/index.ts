import { ToggleNode } from './toggle/ToggleNode';
import { FlashcardsNode } from './flashcard/FlashcardsNode';
import { QuizNode } from './quiz/QuizNode';
import { ClozeMark } from './cloze/ClozeMark';

/** Alle interaktiven Lern-Blöcke. Neue Blöcke hier + in editor/blockTypes.ts registrieren. */
export const learnExtensions = [ToggleNode, FlashcardsNode, QuizNode, ClozeMark];
