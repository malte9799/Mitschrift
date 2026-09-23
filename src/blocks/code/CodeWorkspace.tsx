import { createElement, Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { Icon } from '@/ui/Icon';
import { useEditable, useEditorTick } from '@/editor/useEditable';
import { codeLanguages, lowlight } from './CodeBlock';
import {
  baseName,
  buildTree,
  createFile,
  deleteFile,
  dirName,
  ensureFileIds,
  findFile,
  listFiles,
  onOpenWorkspace,
  renameFile,
  renameFolder,
  setFileAttrs,
  writeFile,
  type CodeFile,
  type TreeFolder,
} from './files';

// ---------- Highlighting ----------

interface HastNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: { className?: string[] };
  children?: HastNode[];
}

function renderHast(n: HastNode, key: number): ReactNode {
  if (n.type === 'text') return n.value;
  const kids = (n.children ?? []).map(renderHast);
  if (n.type === 'element') return createElement('span', { key, className: n.properties?.className?.join(' ') }, kids);
  return createElement(Fragment, { key }, kids);
}

function highlight(text: string, language: string | null): ReactNode {
  try {
    const tree = language && lowlight.registered(language) ? lowlight.highlight(language, text) : lowlight.highlightAuto(text);
    return renderHast(tree as HastNode, 0);
  } catch {
    return text;
  }
}

// ---------- Textbearbeitung ----------

const INDENT = '  ';

/** Über execCommand einfügen, damit die native Rückgängig-Funktion der Textarea erhalten bleibt. */
function insertText(ta: HTMLTextAreaElement, text: string) {
  ta.focus();
  if (!document.execCommand('insertText', false, text)) {
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/** Markierte Zeilen ein- oder ausrücken. */
function indentLines(ta: HTMLTextAreaElement, outdent: boolean) {
  const { value, selectionStart: s, selectionEnd: e } = ta;
  const start = value.lastIndexOf('\n', s - 1) + 1;
  const endNl = value.indexOf('\n', e > s && value[e - 1] === '\n' ? e - 1 : e);
  const end = endNl === -1 ? value.length : endNl;
  const lines = value.slice(start, end).split('\n');
  let firstDelta = 0;
  const next = lines.map((line, i) => {
    if (!outdent) {
      if (i === 0) firstDelta = INDENT.length;
      return INDENT + line;
    }
    const cut = line.match(/^( {1,2}|\t)/)?.[0].length ?? 0;
    if (i === 0) firstDelta = -cut;
    return line.slice(cut);
  });
  const replaced = next.join('\n');
  ta.setSelectionRange(start, end);
  insertText(ta, replaced);
  ta.setSelectionRange(Math.max(start, s + firstDelta), start + replaced.length);
}

// ---------- Editorfläche ----------

function CodePane({ editor, file, readOnly }: { editor: Editor; file: CodeFile; readOnly: boolean }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const text = file.text;
  const html = useMemo(() => highlight(text, file.language), [text, file.language]);
  const lineCount = text.split('\n').length;

  useEffect(() => {
    taRef.current?.focus();
    taRef.current?.setSelectionRange(0, 0);
  }, [file.id]);

  function trackCursor() {
    const ta = taRef.current;
    if (!ta) return;
    const before = ta.value.slice(0, ta.selectionStart);
    const line = before.split('\n').length;
    setCursor({ line, col: ta.selectionStart - before.lastIndexOf('\n') });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault(); // Wird ohnehin laufend gespeichert.
      return;
    }
    if (readOnly) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const multi = ta.value.slice(ta.selectionStart, ta.selectionEnd).includes('\n');
      if (e.shiftKey || multi) indentLines(ta, e.shiftKey);
      else insertText(ta, INDENT);
    } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const { value, selectionStart: s } = ta;
      const line = value.slice(value.lastIndexOf('\n', s - 1) + 1, s);
      const indent = line.match(/^[ \t]*/)?.[0] ?? '';
      insertText(ta, `\n${indent}${/[{[(:]\s*$/.test(line) ? INDENT : ''}`);
    }
  }

  return (
    <div className="cw-pane">
      <div className="cw-scroll">
        <div className="cw-inner">
          <div className="cw-gutter" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, i) => (
              <span key={i} className={i + 1 === cursor.line ? 'is-current' : undefined}>
                {i + 1}
              </span>
            ))}
          </div>
          <div className="cw-code">
            <div className="cw-current" style={{ top: `calc(var(--cw-pad) + ${cursor.line - 1} * var(--cw-lh))` }} />
            <pre aria-hidden="true">
              <code className="hljs">
                {html}
                {'\n '}
              </code>
            </pre>
            <textarea
              ref={taRef}
              value={text}
              readOnly={readOnly}
              wrap="off"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              aria-label={`Inhalt von ${file.path}`}
              onChange={(e) => {
                writeFile(editor, file.id, e.target.value);
                trackCursor();
              }}
              onKeyDown={onKeyDown}
              onSelect={trackCursor}
              onKeyUp={trackCursor}
              onClick={trackCursor}
            />
          </div>
        </div>
      </div>
      <span className="cw-cursor">Zeile {cursor.line}, Spalte {cursor.col}</span>
    </div>
  );
}

// ---------- Dateibaum ----------

type Renaming = { kind: 'file'; id: string } | { kind: 'folder'; path: string } | { kind: 'new'; dir: string } | null;

function NameInput({ initial, onDone }: { initial: string; onDone: (value: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // Nur den Namen ohne Endung markieren – wie in VS Code.
    const base = initial.lastIndexOf('/') + 1;
    const dot = initial.lastIndexOf('.');
    el.setSelectionRange(base, dot > base ? dot : initial.length);
  }, [initial]);
  const finish = (v: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(v);
  };
  return (
    <input
      ref={ref}
      className="cw-name-input"
      defaultValue={initial}
      spellCheck={false}
      onKeyDown={(e) => {
        e.stopPropagation();
        // preventDefault: Der Fokus springt sofort in die neue Datei – das Enter soll dort nicht ankommen.
        if (e.key === 'Enter' || e.key === 'Escape') e.preventDefault();
        if (e.key === 'Enter') finish(e.currentTarget.value);
        if (e.key === 'Escape') finish(null);
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  );
}

interface TreeProps {
  folder: TreeFolder;
  depth: number;
  activeId: string | null;
  editable: boolean;
  collapsed: Set<string>;
  renaming: Renaming;
  duplicates: Set<string>;
  onToggle: (path: string) => void;
  onOpen: (id: string) => void;
  onRename: (r: Renaming) => void;
  onRenameDone: (value: string | null) => void;
  onDelete: (id: string) => void;
}

function Tree(props: TreeProps) {
  const { folder, depth, activeId, editable, collapsed, renaming, duplicates } = props;
  const pad = { paddingLeft: `${10 + depth * 14}px` };
  return (
    <>
      {folder.children.map((entry) => {
        if (entry.kind === 'folder') {
          const open = !collapsed.has(entry.path);
          const isRenaming = renaming?.kind === 'folder' && renaming.path === entry.path;
          return (
            <Fragment key={`d:${entry.path}`}>
              {isRenaming ? (
                <div className="cw-row is-editing" style={pad}>
                  <Icon name="folder" />
                  <NameInput initial={entry.path} onDone={props.onRenameDone} />
                </div>
              ) : (
                <div className="cw-row-wrap">
                  <button
                    type="button"
                    className="cw-row is-folder"
                    style={pad}
                    onClick={() => props.onToggle(entry.path)}
                    onDoubleClick={() => editable && props.onRename({ kind: 'folder', path: entry.path })}
                    aria-expanded={open}
                  >
                    <Icon name="chevron" className={open ? undefined : 'is-closed'} />
                    <span>{entry.name}</span>
                  </button>
                  {editable && (
                    <span className="cw-row-actions">
                      <button type="button" title="Neue Datei in diesem Ordner" onClick={() => props.onRename({ kind: 'new', dir: entry.path })}>
                        <Icon name="plus" />
                      </button>
                      <button type="button" title="Ordner umbenennen" onClick={() => props.onRename({ kind: 'folder', path: entry.path })}>
                        <Icon name="pencil" />
                      </button>
                    </span>
                  )}
                </div>
              )}
              {open && <Tree {...props} folder={entry} depth={depth + 1} />}
              {open && renaming?.kind === 'new' && renaming.dir === entry.path && (
                <div className="cw-row is-editing" style={{ paddingLeft: `${10 + (depth + 1) * 14}px` }}>
                  <Icon name="file" />
                  <NameInput initial={`${entry.path}/`} onDone={props.onRenameDone} />
                </div>
              )}
            </Fragment>
          );
        }
        const f = entry.file;
        if (renaming?.kind === 'file' && renaming.id === f.id) {
          return (
            <div key={f.id} className="cw-row is-editing" style={pad}>
              <Icon name="file" />
              <NameInput initial={f.path} onDone={props.onRenameDone} />
            </div>
          );
        }
        return (
          <div key={f.id} className="cw-row-wrap">
            <button
              type="button"
              className={`cw-row${f.id === activeId ? ' is-active' : ''}${f.named ? '' : ' is-unnamed'}`}
              style={pad}
              onClick={() => props.onOpen(f.id)}
              onDoubleClick={() => editable && props.onRename({ kind: 'file', id: f.id })}
              title={duplicates.has(f.path) ? `${f.path} – Name kommt mehrfach vor` : f.path}
            >
              <Icon name="file" />
              <span>{entry.name}</span>
              {duplicates.has(f.path) && <em className="cw-dup">!</em>}
            </button>
            {editable && (
              <span className="cw-row-actions">
                <button type="button" title="Umbenennen" onClick={() => props.onRename({ kind: 'file', id: f.id })}>
                  <Icon name="pencil" />
                </button>
                <button type="button" title="Löschen" onClick={() => props.onDelete(f.id)}>
                  <Icon name="trash" />
                </button>
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

// ---------- Arbeitsbereich ----------

function Workspace({ editor, initialId, onClose }: { editor: Editor; initialId: string; onClose: () => void }) {
  useEditorTick(editor);
  const editable = useEditable(editor);
  const files = listFiles(editor.state.doc);
  const [tabs, setTabs] = useState<string[]>([initialId]);
  const [activeId, setActiveId] = useState<string | null>(initialId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<Renaming>(null);
  const [copied, setCopied] = useState(false);

  // Neu hinzugekommene Blöcke (z. B. eingefügt) bekommen ebenfalls eine ID.
  const missingIds = files.some((f, i) => !f.id || files.findIndex((g) => g.id === f.id) !== i);
  useEffect(() => {
    if (missingIds) ensureFileIds(editor);
  }, [missingIds, editor]);

  // Gelöschte Dateien aus den Tabs entfernen.
  const known = new Set(files.map((f) => f.id));
  const openTabs = tabs.filter((id) => known.has(id));
  const active = activeId && known.has(activeId) ? files.find((f) => f.id === activeId)! : null;
  useEffect(() => {
    if (activeId && !known.has(activeId)) setActiveId(openTabs[openTabs.length - 1] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, known.size]);

  const tree = useMemo(() => buildTree(files), [files.map((f) => `${f.id}=${f.path}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const f of files) (seen.has(f.path) ? dup : seen).add(f.path);
    return dup;
  }, [files.map((f) => f.path).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);

  function open(id: string) {
    setTabs((t) => (t.includes(id) ? t : [...t, id]));
    setActiveId(id);
  }

  function closeTab(id: string) {
    const rest = openTabs.filter((t) => t !== id);
    setTabs(rest);
    if (activeId === id) setActiveId(rest[Math.max(0, openTabs.indexOf(id) - 1)] ?? null);
  }

  function finishRename(value: string | null) {
    const r = renaming;
    setRenaming(null);
    if (!r || value === null) return;
    if (r.kind === 'file') {
      const f = findFile(editor, r.id);
      if (f && value.trim() && value !== f.path) renameFile(editor, r.id, value);
    } else if (r.kind === 'folder') {
      if (value.trim() && value !== r.path) {
        renameFolder(editor, r.path, value);
        setCollapsed(new Set());
      }
    } else {
      const name = value.trim();
      if (!name || name.endsWith('/')) return;
      open(createFile(editor, name));
    }
  }

  function showInDocument() {
    if (!active) return;
    onClose();
    requestAnimationFrame(() => {
      const f = findFile(editor, active.id);
      if (!f) return;
      editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, f.pos + 1)).scrollIntoView());
      editor.view.focus();
    });
  }

  const lines = active ? active.text.split('\n').length : 0;

  async function copy() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.text);
      setCopied(true);
    } catch {
      /* Zwischenablage nicht verfügbar */
    }
  }

  return (
    <div
      className="cw"
      data-own-keys=""
      role="dialog"
      aria-modal="true"
      aria-label="Code-Editor"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <aside className="cw-side">
        <div className="cw-side-head">
          <span>Dateien</span>
          {editable && (
            <span className="cw-side-actions">
              <button type="button" title="Neue Datei" onClick={() => setRenaming({ kind: 'new', dir: '' })}>
                <Icon name="plus" />
              </button>
            </span>
          )}
        </div>
        <div className="cw-tree">
          {renaming?.kind === 'new' && renaming.dir === '' && (
            <div className="cw-row is-editing" style={{ paddingLeft: '10px' }}>
              <Icon name="file" />
              <NameInput initial="" onDone={finishRename} />
            </div>
          )}
          <Tree
            folder={tree}
            depth={0}
            activeId={active?.id ?? null}
            editable={editable}
            collapsed={collapsed}
            renaming={renaming}
            duplicates={duplicates}
            onToggle={(p) =>
              setCollapsed((c) => {
                const n = new Set(c);
                if (n.has(p)) n.delete(p);
                else n.add(p);
                return n;
              })
            }
            onOpen={open}
            onRename={setRenaming}
            onRenameDone={finishRename}
            onDelete={(id) => deleteFile(editor, id)}
          />
          {!files.length && <p className="cw-tree-empty">Noch keine Codeblöcke im Dokument.</p>}
        </div>
        <p className="cw-side-hint">
          Jeder Codeblock der Notiz ist eine Datei. Mit „/“ im Namen entstehen Ordner, z. B. <code>src/main.py</code>.
        </p>
      </aside>

      <section className="cw-main">
        <header className="cw-tabs">
          <div className="cw-tabs-list" role="tablist">
            {openTabs.map((id) => {
              const f = files.find((x) => x.id === id)!;
              return (
                <div key={id} className={`cw-tab${id === active?.id ? ' is-active' : ''}`} role="tab" aria-selected={id === active?.id}>
                  <button type="button" className="cw-tab-name" onClick={() => setActiveId(id)} title={f.path}>
                    <Icon name="file" />
                    {baseName(f.path)}
                    {dirName(f.path) && <small>{dirName(f.path)}</small>}
                  </button>
                  <button type="button" className="cw-tab-close" onClick={() => closeTab(id)} aria-label={`${f.path} schließen`}>
                    <Icon name="x" />
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" className="cw-done" onClick={onClose} title="Schließen (Esc)">
            <Icon name="check" /> Fertig
          </button>
        </header>

        {active ? (
          <>
            <CodePane key={active.id} editor={editor} file={active} readOnly={!editable} />
            <footer className="cw-status">
              {editable ? (
                <label className="cw-status-btn cw-lang">
                  <select
                    value={active.language ?? ''}
                    onChange={(e) => setFileAttrs(editor, active.id, { language: e.target.value || null })}
                    aria-label="Sprache"
                  >
                    <option value="">Automatisch</option>
                    {codeLanguages.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  {codeLanguages.find((l) => l.value === active.language)?.label ?? 'Automatisch'}
                  <Icon name="chevron" />
                </label>
              ) : (
                <span className="cw-status-btn">{codeLanguages.find((l) => l.value === active.language)?.label ?? 'Automatisch'}</span>
              )}
              <span className="cw-status-path">{active.path}</span>
              <span className="cw-spacer" />
              <span>{lines === 1 ? '1 Zeile' : `${lines} Zeilen`}</span>
              <button type="button" className="cw-status-btn" onClick={copy}>
                <Icon name={copied ? 'check' : 'copy'} /> {copied ? 'Kopiert' : 'Kopieren'}
              </button>
              <button type="button" className="cw-status-btn" onClick={showInDocument}>
                <Icon name="arrowRight" /> Im Dokument zeigen
              </button>
            </footer>
          </>
        ) : (
          <div className="cw-empty">
            <Icon name="code" />
            <p>Keine Datei geöffnet.</p>
            {editable && (
              <button type="button" className="b-chip-btn" onClick={() => setRenaming({ kind: 'new', dir: '' })}>
                <Icon name="plus" /> Neue Datei
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/** Einmal je Notiz-Editor einbinden: öffnet den Vollbild-Code-Editor, wenn ein Codeblock es anfordert. */
export function CodeWorkspaceHost({ editor }: { editor: Editor }) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => onOpenWorkspace(editor, setOpenId), [editor]);

  // Der Notiz-Editor darf den Fokus nicht behalten, und die Seite dahinter soll nicht scrollen.
  useEffect(() => {
    if (!openId) return;
    (editor.view.dom as HTMLElement).blur();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openId, editor]);

  // Beim Notizwechsel schließen.
  useEffect(() => () => setOpenId(null), [editor]);

  if (!openId) return null;
  return createPortal(<Workspace editor={editor} initialId={openId} onClose={() => setOpenId(null)} />, document.body);
}
