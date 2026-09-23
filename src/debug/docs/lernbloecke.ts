import type { DebugDoc } from '../debugDocs';
import { welcomeNote } from '@/app/welcome';

/** Aufklappen, Lückentext, Karteikarten, Quiz – Inhalt der Willkommens-Notiz. */
const doc: DebugDoc = {
  key: 'lernbloecke',
  title: 'Debug: Lern-Blöcke',
  doc: JSON.parse(welcomeNote().content ?? '{"type":"doc","content":[]}') as object,
};
export default doc;
