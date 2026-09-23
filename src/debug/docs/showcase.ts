import type { DebugDoc } from '../debugDocs';
import { SHOWCASE_TITLE, showcaseDoc } from '@/app/showcaseContent';

/** Formeln, Fußnoten, Taste, Tief-/Hochgestellt (auch unter `/showcase`). */
const doc: DebugDoc = { key: 'showcase', title: `Debug: ${SHOWCASE_TITLE}`, doc: showcaseDoc };
export default doc;
