import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';

/**
 * Virtuelles Dateisystem: Jeder Codeblock des Dokuments ist eine Datei. Der Pfad steht im
 * Attribut `filename` (z. B. „src/utils/math.ts“), Ordner ergeben sich aus den Schrägstrichen.
 * `fileId` hält die Datei stabil, auch wenn sich Positionen im Dokument verschieben.
 */
export interface CodeFile {
  id: string;
  pos: number;
  node: PMNode;
  /** Gesetzter Pfad oder ein Ersatzname wie „unbenannt-2.py“. */
  path: string;
  named: boolean;
  language: string | null;
  text: string;
}

/** Dateiendung → highlight.js-Sprache. */
const EXT_LANG: Record<string, string> = {
  sh: 'bash', bash: 'bash', zsh: 'bash', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp',
  css: 'css', diff: 'diff', patch: 'diff', go: 'go', graphql: 'graphql', gql: 'graphql', html: 'xml', htm: 'xml',
  xml: 'xml', svg: 'xml', ini: 'ini', toml: 'ini', cfg: 'ini', java: 'java', js: 'javascript', mjs: 'javascript',
  cjs: 'javascript', jsx: 'javascript', json: 'json', kt: 'kotlin', kts: 'kotlin', less: 'less', lua: 'lua',
  mk: 'makefile', md: 'markdown', markdown: 'markdown', m: 'objectivec', pl: 'perl', php: 'php', txt: 'plaintext',
  py: 'python', r: 'r', rb: 'ruby', rs: 'rust', scss: 'scss', sql: 'sql', swift: 'swift', ts: 'typescript',
  tsx: 'typescript', vb: 'vbnet', yml: 'yaml', yaml: 'yaml',
};

/** Sprache → bevorzugte Endung für Ersatznamen. */
const LANG_EXT: Record<string, string> = {
  bash: 'sh', c: 'c', cpp: 'cpp', csharp: 'cs', css: 'css', diff: 'diff', go: 'go', graphql: 'graphql', xml: 'html',
  ini: 'ini', java: 'java', javascript: 'js', json: 'json', kotlin: 'kt', less: 'less', lua: 'lua', makefile: 'mk',
  markdown: 'md', objectivec: 'm', perl: 'pl', php: 'php', plaintext: 'txt', python: 'py', r: 'r', ruby: 'rb',
  rust: 'rs', scss: 'scss', shell: 'sh', sql: 'sql', swift: 'swift', typescript: 'ts', vbnet: 'vb', yaml: 'yml',
};

export function languageForPath(path: string): string | null {
  const base = path.split('/').pop() ?? '';
  if (/^makefile$/i.test(base)) return 'makefile';
  if (/^dockerfile$/i.test(base)) return 'bash';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? (EXT_LANG[base.slice(dot + 1).toLowerCase()] ?? null) : null;
}

/** Pfad säubern: keine führenden/doppelten Schrägstriche, keine Leer-Segmente. */
export function normalizePath(path: string): string {
  return path
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s && s !== '.' && s !== '..')
    .join('/');
}

export const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
export const dirName = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

const newId = () => Math.random().toString(36).slice(2, 10);

/** Alle Codeblöcke als Dateien, in Dokumentreihenfolge. */
export function listFiles(doc: PMNode): CodeFile[] {
  const files: CodeFile[] = [];
  let unnamed = 0;
  doc.descendants((node, pos) => {
    if (node.type.name !== 'codeBlock') return true;
    const language = (node.attrs.language as string | null) || null;
    const filename = normalizePath((node.attrs.filename as string | null) ?? '');
    const path = filename || `unbenannt-${++unnamed}.${(language && LANG_EXT[language]) || 'txt'}`;
    files.push({ id: node.attrs.fileId ?? '', pos, node, path, named: !!filename, language, text: node.textContent });
    return false;
  });
  return files;
}

export function findFile(editor: Editor, id: string): CodeFile | undefined {
  return listFiles(editor.state.doc).find((f) => f.id === id);
}

/** Vergibt fehlende oder doppelte (z. B. durch Kopieren entstandene) IDs – ohne Rückgängig-Eintrag. */
export function ensureFileIds(editor: Editor) {
  const seen = new Set<string>();
  const tr = editor.state.tr;
  for (const f of listFiles(editor.state.doc)) {
    if (f.id && !seen.has(f.id)) {
      seen.add(f.id);
      continue;
    }
    const id = newId();
    seen.add(id);
    tr.setNodeAttribute(f.pos, 'fileId', id);
  }
  if (tr.docChanged) editor.view.dispatch(tr.setMeta('addToHistory', false));
}

/** Ersetzt den Inhalt einer Datei (= des Codeblocks). */
export function writeFile(editor: Editor, id: string, text: string) {
  const f = findFile(editor, id);
  if (!f || f.text === text) return;
  const { state } = editor;
  const content = text ? state.schema.text(text) : [];
  editor.view.dispatch(state.tr.replaceWith(f.pos + 1, f.pos + f.node.nodeSize - 1, content));
}

export function setFileAttrs(editor: Editor, id: string, attrs: Record<string, unknown>) {
  const f = findFile(editor, id);
  if (!f) return;
  const tr = editor.state.tr;
  for (const [k, v] of Object.entries(attrs)) tr.setNodeAttribute(f.pos, k, v);
  editor.view.dispatch(tr);
}

/** Umbenennen/Verschieben; passt die Sprache an, wenn die Endung eine eindeutige ergibt. */
export function renameFile(editor: Editor, id: string, path: string) {
  const clean = normalizePath(path);
  const lang = clean ? languageForPath(clean) : null;
  setFileAttrs(editor, id, lang ? { filename: clean || null, language: lang } : { filename: clean || null });
}

/** Neue Datei als Codeblock am Ende des Dokuments. Gibt die neue ID zurück. */
export function createFile(editor: Editor, path: string, text = ''): string {
  const id = newId();
  const clean = normalizePath(path);
  const { state } = editor;
  const node = state.schema.nodes.codeBlock.create(
    { fileId: id, filename: clean || null, language: clean ? languageForPath(clean) : null },
    text ? state.schema.text(text) : undefined,
  );
  editor.view.dispatch(state.tr.insert(state.doc.content.size, node));
  return id;
}

/** Löscht den Codeblock – ConfirmDelete fragt bei Inhalt selbst nach. */
export function deleteFile(editor: Editor, id: string) {
  const f = findFile(editor, id);
  if (f) editor.view.dispatch(editor.state.tr.delete(f.pos, f.pos + f.node.nodeSize));
}

/** Alle Dateien eines Ordners verschieben (Ordner umbenennen). */
export function renameFolder(editor: Editor, from: string, to: string) {
  const target = normalizePath(to);
  const tr = editor.state.tr;
  for (const f of listFiles(editor.state.doc)) {
    if (!f.named || !f.path.startsWith(`${from}/`)) continue;
    tr.setNodeAttribute(f.pos, 'filename', normalizePath(`${target}/${f.path.slice(from.length + 1)}`));
  }
  if (tr.docChanged) editor.view.dispatch(tr);
}

// ---------- Baum ----------

export interface TreeFolder {
  kind: 'folder';
  name: string;
  path: string;
  children: TreeEntry[];
}
export interface TreeFile {
  kind: 'file';
  name: string;
  file: CodeFile;
}
export type TreeEntry = TreeFolder | TreeFile;

/** Baut den Ordnerbaum; Ordner zuerst, dann alphabetisch. */
export function buildTree(files: CodeFile[]): TreeFolder {
  const root: TreeFolder = { kind: 'folder', name: '', path: '', children: [] };
  for (const file of files) {
    const parts = file.path.split('/');
    let dir = root;
    for (const part of parts.slice(0, -1)) {
      const path = dir.path ? `${dir.path}/${part}` : part;
      let next = dir.children.find((c): c is TreeFolder => c.kind === 'folder' && c.name === part);
      if (!next) dir.children.push((next = { kind: 'folder', name: part, path, children: [] }));
      dir = next;
    }
    dir.children.push({ kind: 'file', name: parts[parts.length - 1], file });
  }
  const sort = (f: TreeFolder) => {
    f.children.sort((a, b) =>
      a.kind !== b.kind ? (a.kind === 'folder' ? -1 : 1) : a.name.localeCompare(b.name, 'de', { numeric: true }),
    );
    f.children.forEach((c) => c.kind === 'folder' && sort(c));
  };
  sort(root);
  return root;
}

// ---------- Öffnen ----------

type Listener = (id: string) => void;
const openers = new WeakMap<Editor, Listener>();

/** Der Arbeitsbereich eines Editors meldet sich hier an. */
export function onOpenWorkspace(editor: Editor, l: Listener) {
  openers.set(editor, l);
  return () => {
    if (openers.get(editor) === l) openers.delete(editor);
  };
}

/** Öffnet den Vollbild-Editor mit der Datei am Codeblock `pos`. */
export function openWorkspaceAt(editor: Editor, pos: number) {
  ensureFileIds(editor);
  const node = editor.state.doc.nodeAt(pos);
  if (node?.type.name === 'codeBlock') openers.get(editor)?.(node.attrs.fileId as string);
}
