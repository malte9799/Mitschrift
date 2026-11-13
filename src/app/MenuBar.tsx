import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { Editor } from '@tiptap/react';
import { blockTypes, type BlockCategory, type BlockTypeId } from '@/editor/blockTypes';
import { OPEN_LINK_EVENT } from '@/editor/Toolbar';
import { exportFormats, exportNote, type ExportFormat } from '@/export';
import { createNote } from './actions';
import { noteHref } from './noteLinks';
import { version as APP_VERSION } from '../../package.json';
import { builtinTemplates, userTemplates } from './templates';
import { FOCUS_SEARCH_EVENT, useActiveNote } from './activeNote';
import { useTheme } from './theme';
import { codeThemeMeta, useCodeTheme } from './codeTheme';
import { welcomeNote } from './welcome';
import { alertDialog, confirmDialog } from '@/ui/Dialog';
import { formatShortcut, matchesShortcut } from '@/ui/shortcut';
import { reloadTerms, setHighlight, useHighlight } from '@/glossary/store';
import { termFromSelection } from '@/editor/Toolbar';
import { downloadBackup, lastBackupAt, readBackup, restoreBackup } from '@/storage/backup';
import { storageStatus, type StorageStatus } from '@/storage/persist';
import { chooseFolder, disconnectFolder, folderSupported, useVaultState } from '@/storage/vault';
import { notifyNotesChanged, useNotes } from '@/hooks/useNotes';
import { notifyTagsChanged } from '@/hooks/useTags';
import { reloadEvents } from './eventStore';
import { plural } from '@/ui/plural';
import { resetZoom, useDocZoom, zoomIn, zoomOut } from './docZoom';
import { registerCommandSource, togglePalette, type PaletteCommand } from './paletteStore';

export type MenuEntry =
  | {
      type?: 'item';
      label: string;
      /** Anzeige im macOS-Stil, z. B. „⇧⌘S“. */
      shortcut?: string;
      /** Tastenkürzel global abfangen; sonst nur Anzeige (Editor/Browser erledigen es selbst). */
      bind?: boolean;
      action?: () => void;
      disabled?: boolean;
      checked?: boolean;
      submenu?: MenuEntry[];
    }
  | { type: 'separator' };

type Item = Exclude<MenuEntry, { type: 'separator' }>;

interface MenuDef {
  label: string;
  items: MenuEntry[];
  /** Fett gesetzter App-Name ganz links. */
  app?: boolean;
}

interface MenuBarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const SEP: MenuEntry = { type: 'separator' };
const isItem = (e: MenuEntry | undefined): e is Item => !!e && e.type !== 'separator';
const selectable = (e: MenuEntry | undefined) => isItem(e) && !e.disabled;

/** Im Menü ausgeschrieben, wo die Kurzform (z. B. „H1“) für Leisten gedacht ist. */
const menuLabels: Partial<Record<BlockTypeId, string>> = {
  heading1: 'Überschrift 1',
  heading2: 'Überschrift 2',
  heading3: 'Überschrift 3',
};

/** Vom Editor selbst behandelte Kürzel, hier nur zur Anzeige. */
const blockShortcuts: Partial<Record<BlockTypeId, string>> = {
  heading1: '⌥⌘1',
  heading2: '⌥⌘2',
  heading3: '⌥⌘3',
  paragraph: '⌥⌘0',
  quote: '⇧⌘B',
  bulletList: '⇧⌘8',
  numberedList: '⇧⌘7',
  taskList: '⇧⌘9',
};

/** Ist gerade Text (Editor, Eingabefeld, Seite) oder ein ganzer Block markiert? */
function nothingSelected(editor: Editor | null): boolean {
  if (document.querySelector('.is-block-selected')) return false;
  if (editor?.view.hasFocus() && !editor.state.selection.empty) return false;
  const el = document.activeElement;
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.selectionStart !== el.selectionEnd) return false;
  const sel = window.getSelection();
  return !sel || sel.isCollapsed;
}

/** Menüeinträge flach mit Pfad – für die Suchpalette. Deaktivierte und reine Untermenüs fallen weg. */
function paletteCommands(menus: MenuDef[]): PaletteCommand[] {
  const out: PaletteCommand[] = [];
  const walk = (entries: MenuEntry[], path: string[]) => {
    for (const e of entries) {
      if (!isItem(e) || e.disabled) continue;
      if (e.submenu) walk(e.submenu, [...path, e.label]);
      else if (e.action && e.label !== 'Suchen & Befehle …') out.push({ label: e.label, path, shortcut: e.shortcut, checked: e.checked, action: e.action });
    }
  };
  for (const m of menus) walk(m.items, [m.label]);
  return out;
}

function allItems(entries: MenuEntry[]): Item[] {
  return entries.flatMap((e) => (isItem(e) ? [e, ...(e.submenu ? allItems(e.submenu) : [])] : []));
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t: number;
    const tick = () => {
      setNow(new Date());
      t = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    t = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    return () => window.clearTimeout(t);
  }, []);
  return now;
}

async function pasteInto(editor: Editor | null) {
  try {
    if (editor?.view.hasFocus()) {
      for (const item of await navigator.clipboard.read()) {
        if (item.types.includes('text/html')) {
          editor.view.pasteHTML(await (await item.getType('text/html')).text());
          return;
        }
      }
      editor.view.pasteText(await navigator.clipboard.readText());
      return;
    }
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      document.execCommand('insertText', false, await navigator.clipboard.readText());
    }
  } catch {
    void alertDialog(`Der Browser erlaubt das Einsetzen über das Menü nicht. Bitte ${formatShortcut('⌘V')} verwenden.`);
  }
}

/** Menüleiste im Stil der macOS-Leiste: App-Menü, Ablage, Bearbeiten, Format, Einfügen, Darstellung, Hilfe. */
export function MenuBar({ sidebarOpen, toggleSidebar }: MenuBarProps) {
  const active = useActiveNote();
  const { theme, setTheme } = useTheme();
  const { theme: codeTheme, setCodeTheme } = useCodeTheme();
  const glossaryHighlight = useHighlight();
  const docZoom = useDocZoom();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const now = useClock();
  const [open, setOpen] = useState<number | null>(null);
  /** Hervorgehobener Eintrag je Ebene: [Index im Menü, Index im Untermenü …]. */
  const [path, setPath] = useState<number[]>([]);
  const [about, setAbout] = useState(false);
  const vault = useVaultState();
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement);
  const barRef = useRef<HTMLElement>(null);
  const titleRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const note = active?.note ?? null;
  const allNotes = useNotes();
  const ownTemplates = userTemplates(allNotes ?? []);
  // Editor-Befehle nur im Bearbeiten-Modus.
  const ed = active && !active.learning ? active.editor : null;
  const hasSelection = !!ed && !ed.state.selection.empty;

  async function newNote(init?: Parameters<typeof createNote>[0]) {
    const n = await createNote(init);
    navigate(`/n/${n.id}`);
  }

  function runExport(format: ExportFormat) {
    if (!active) return;
    exportNote(active.note, format, active.editor?.getJSON()).catch((err) => {
      console.error(err);
      void alertDialog(`Export fehlgeschlagen${err instanceof Error && err.message ? `: ${err.message}` : '.'} Versuch es noch einmal oder wähle ein anderes Format.`);
    });
  }

  /** Vorhandene Willkommens-Notiz öffnen, statt bei jedem Klick eine neue anzulegen. */
  function openWelcome() {
    const welcome = welcomeNote();
    const existing = (allNotes ?? []).find((n) => n.title === welcome.title);
    if (existing) navigate(noteHref(existing.id));
    else void newNote(welcome);
  }

  function runBackup() {
    downloadBackup().catch((err) => {
      console.error(err);
      void alertDialog(`Backup fehlgeschlagen${err instanceof Error && err.message ? `: ${err.message}` : '.'} Prüfe, ob genug Speicherplatz frei ist, und versuch es noch einmal.`);
    });
  }

  function runRestore() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const { dump, exportedAt } = await readBackup(file);
        const ok = await confirmDialog(
          `Backup vom ${new Date(exportedAt).toLocaleString('de-DE')} mit ${plural(dump.notes.length, 'Notiz', 'Notizen')} einspielen? ` +
            'Vorhandene Notizen bleiben erhalten; bei gleichen Notizen gewinnt die neuere Fassung.',
          { confirmLabel: 'Einspielen' },
        );
        if (!ok) return;
        const r = await restoreBackup(dump);
        notifyNotesChanged();
        notifyTagsChanged();
        await Promise.all([reloadTerms(), reloadEvents()]);
        await alertDialog(`Backup eingespielt: ${r.added} neu, ${r.updated} aktualisiert, ${r.skipped} unverändert.`);
      } catch (err) {
        console.error(err);
        await alertDialog(err instanceof Error ? err.message : 'Backup konnte nicht gelesen werden.');
      }
    };
    input.click();
  }

  async function pickFolder() {
    try {
      await chooseFolder({
        confirmMigration: ({ folderName, folderHasData, count, fromFolder }) => {
          const from = fromFolder ? 'dem bisherigen Ordner' : 'dem Browser-Speicher';
          const what = count === 1 ? 'Die Notiz' : `Die ${count} Notizen`;
          return confirmDialog(
            folderHasData
              ? `„${folderName}“ enthält schon Mitschrift-Notizen. ${what} aus ${from} dazunehmen? Bei gleichen Notizen gewinnt die neuere Fassung.`
              : `${what} aus ${from} nach „${folderName}“ übernehmen? Sie liegen dann als Dateien in diesem Ordner.`,
            { confirmLabel: 'Übernehmen', cancelLabel: 'Nicht übernehmen' },
          );
        },
      });
    } catch (err) {
      console.error(err);
      await alertDialog('Der Ordner konnte nicht geöffnet werden.');
    }
  }

  async function unlinkFolder() {
    if (vault.kind !== 'folder') return;
    const ok = await confirmDialog(
      `Ordner „${vault.name}“ trennen? Die Dateien bleiben dort liegen; Mitschrift nutzt danach wieder den Browser-Speicher.`,
      { confirmLabel: 'Trennen' },
    );
    if (!ok) return;
    const copy = await confirmDialog('Die Notizen aus dem Ordner auch in den Browser-Speicher übernehmen?', {
      confirmLabel: 'Übernehmen',
      cancelLabel: 'Nicht übernehmen',
    });
    await disconnectFolder(copy);
  }

  function focusSearch() {
    if (!sidebarOpen) toggleSidebar();
    window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
  }

  const blockItem = (id: BlockTypeId, checked?: boolean): Item => {
    const def = blockTypes.find((b) => b.id === id)!;
    return { label: menuLabels[id] ?? def.label, shortcut: blockShortcuts[id], checked, disabled: !ed, action: () => ed && def.run(ed) };
  };
  const byCategory = (cat: BlockCategory) => blockTypes.filter((b) => b.category === cat).map((b) => blockItem(b.id));
  const mark = (label: string, name: string, shortcut: string, run: (e: Editor) => void): Item => ({
    label,
    shortcut,
    checked: !!ed?.isActive(name),
    disabled: !ed,
    action: () => ed && run(ed),
  });
  const align = (label: string, value: string, shortcut?: string): Item => ({
    label,
    shortcut,
    checked: !!ed?.isActive({ textAlign: value }),
    disabled: !ed,
    action: () => ed?.chain().focus().setTextAlign(value).run(),
  });

  const menus: MenuDef[] = [
    {
      label: 'Mitschrift',
      app: true,
      items: [
        { label: 'Über Mitschrift', action: () => setAbout(true) },
        SEP,
        {
          label: 'Speicherort',
          submenu: [
            { label: 'Browser-Speicher', checked: vault.kind === 'browser', action: () => void unlinkFolder() },
            ...(vault.kind === 'folder' ? [{ label: `Ordner „${vault.name}“`, checked: true, action: () => undefined }] : []),
            SEP,
            folderSupported
              ? { label: vault.kind === 'folder' ? 'Anderen Ordner wählen …' : 'Ordner wählen …', action: () => void pickFolder() }
              : { label: 'Ordner wählen (nur Chrome/Edge)', disabled: true },
          ],
        },
        SEP,
        {
          label: 'Erscheinungsbild',
          submenu: [
            { label: 'Hell', checked: theme === 'light', action: () => setTheme('light') },
            { label: 'Dunkel', checked: theme === 'dark', action: () => setTheme('dark') },
            { label: 'Automatisch', checked: theme === 'system', action: () => setTheme('system') },
            SEP,
            { label: 'Mist', checked: theme === 'mist', action: () => setTheme('mist') },
            { label: 'Linen', checked: theme === 'linen', action: () => setTheme('linen') },
            { label: 'Sepia', checked: theme === 'sepia', action: () => setTheme('sepia') },
            SEP,
            { label: 'Graphite', checked: theme === 'graphite', action: () => setTheme('graphite') },
            { label: 'Slate', checked: theme === 'slate', action: () => setTheme('slate') },
            { label: 'Midnight', checked: theme === 'midnight', action: () => setTheme('midnight') },
          ],
        },
      ],
    },
    {
      label: 'Ablage',
      items: [
        { label: 'Neue Notiz', shortcut: '⌥⌘N', bind: true, action: () => void newNote() },
        { label: 'Neue Unterseite', shortcut: '⇧⌥⌘N', bind: true, disabled: !note, action: () => note && void newNote({ parentId: note.id, tags: note.tags }) },
        {
          label: 'Neue Notiz aus Vorlage',
          submenu: [
            ...builtinTemplates.map((t) => ({ label: t.name, action: () => void newNote(t.init()) })),
            ...(ownTemplates.length ? [SEP, ...ownTemplates.map((t) => ({ label: t.name, action: () => void newNote(t.init()) }))] : []),
          ],
        },
        { label: 'Suchen & Befehle …', shortcut: '⌘K', bind: true, action: togglePalette },
        { label: 'Seitenleiste durchsuchen …', shortcut: '⌘F', bind: true, action: focusSearch },
        SEP,
        {
          label: 'Exportieren',
          disabled: !note,
          submenu: exportFormats.map((f) => ({ label: f.label, action: () => runExport(f.format) })),
        },
        { label: 'Drucken …', shortcut: '⌘P', bind: true, disabled: !note, action: () => runExport('pdf') },
        SEP,
        { label: 'Backup aller Notizen sichern …', action: runBackup },
        { label: 'Backup einspielen …', action: runRestore },
        SEP,
        {
          label: note?.starred ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen',
          disabled: !note,
          action: () => active?.toggleStar(),
        },
        { label: 'Als Vorlage verwenden', checked: !!note?.template, disabled: !note, action: () => active?.toggleTemplate() },
        { label: 'Notiz löschen …', disabled: !note, action: () => active?.remove() },
      ],
    },
    {
      label: 'Bearbeiten',
      items: [
        { label: 'Widerrufen', shortcut: '⌘Z', disabled: !ed?.can().undo(), action: () => ed?.chain().focus().undo().run() },
        { label: 'Wiederholen', shortcut: '⇧⌘Z', disabled: !ed?.can().redo(), action: () => ed?.chain().focus().redo().run() },
        SEP,
        { label: 'Ausschneiden', shortcut: '⌘X', action: () => document.execCommand('cut') },
        { label: 'Kopieren', shortcut: '⌘C', action: () => document.execCommand('copy') },
        { label: 'Einsetzen', shortcut: '⌘V', action: () => void pasteInto(ed) },
        { label: 'Alles auswählen', shortcut: '⌘A', disabled: !ed, action: () => ed?.chain().focus().selectAll().run() },
        SEP,
        { label: 'Link hinzufügen …', disabled: !hasSelection, action: () => window.dispatchEvent(new Event(OPEN_LINK_EVENT)) },
        { label: 'Als Begriff ins Glossar …', shortcut: '⇧⌘G', bind: true, disabled: !ed, action: () => ed && termFromSelection(ed) },
      ],
    },
    {
      label: 'Format',
      items: [
        mark('Fett', 'bold', '⌘B', (e) => e.chain().focus().toggleBold().run()),
        mark('Kursiv', 'italic', '⌘I', (e) => e.chain().focus().toggleItalic().run()),
        mark('Unterstrichen', 'underline', '⌘U', (e) => e.chain().focus().toggleUnderline().run()),
        mark('Durchgestrichen', 'strike', '⇧⌘S', (e) => e.chain().focus().toggleStrike().run()),
        mark('Inline-Code', 'code', '⌘E', (e) => e.chain().focus().toggleCode().run()),
        mark('Als Lücke markieren', 'cloze', '⇧⌘L', (e) => e.chain().focus().toggleCloze().run()),
        SEP,
        {
          label: 'Textstil',
          disabled: !ed,
          submenu: [
            blockItem('heading1', !!ed?.isActive('heading', { level: 1 })),
            blockItem('heading2', !!ed?.isActive('heading', { level: 2 })),
            blockItem('heading3', !!ed?.isActive('heading', { level: 3 })),
            SEP,
            blockItem('paragraph', !!ed?.isActive('paragraph', { variant: null })),
            blockItem('strong', !!ed?.isActive('paragraph', { variant: 'strong' })),
            blockItem('caption', !!ed?.isActive('paragraph', { variant: 'caption' })),
            SEP,
            blockItem('quote', !!ed?.isActive('blockquote')),
          ],
        },
        {
          label: 'Liste',
          disabled: !ed,
          submenu: [
            blockItem('bulletList', !!ed?.isActive('bulletList')),
            blockItem('numberedList', !!ed?.isActive('orderedList')),
            blockItem('taskList', !!ed?.isActive('taskList')),
          ],
        },
        {
          label: 'Ausrichtung',
          disabled: !ed,
          submenu: [align('Linksbündig', 'left'), align('Zentriert', 'center', '⇧⌘E'), align('Rechtsbündig', 'right', '⇧⌘R'), align('Blocksatz', 'justify', '⇧⌘J')],
        },
        SEP,
        { label: 'Formatierung entfernen', disabled: !ed, action: () => ed?.chain().focus().unsetAllMarks().clearNodes().run() },
      ],
    },
    {
      label: 'Einfügen',
      items: [
        ...byCategory('hervorheben'),
        blockItem('toggle'),
        SEP,
        ...byCategory('rich'),
        SEP,
        ...byCategory('interaktiv'),
        SEP,
        ...byCategory('trennlinien'),
        SEP,
        ...byCategory('medien'),
      ],
    },
    {
      label: 'Darstellung',
      items: [
        { label: 'Bearbeitungsmodus', shortcut: '⌃⌘E', bind: true, checked: !!active && !active.learning, disabled: !active, action: () => active?.setLearning(false) },
        { label: 'Lernmodus', shortcut: '⌃⌘L', bind: true, checked: !!active?.learning, disabled: !active, action: () => active?.setLearning(true) },
        SEP,
        // ⌘+/⌘−/⌘0 werden unten von Hand geprüft (Taste statt Code: „+“ liegt je nach Tastatur woanders).
        { label: 'Dokument vergrößern', shortcut: '⌘+', action: zoomIn },
        { label: 'Dokument verkleinern', shortcut: '⌘−', action: zoomOut },
        { label: `Originalgröße${docZoom !== 1 ? ` (jetzt ${Math.round(docZoom * 100)} %)` : ''}`, shortcut: '⌘0', disabled: docZoom === 1, action: resetZoom },
        SEP,
        { label: 'Übersicht', shortcut: '⌃⌘H', bind: true, checked: pathname === '/', action: () => navigate('/') },
        { label: 'Graph-Ansicht', shortcut: '⌃⌘G', bind: true, checked: pathname === '/graph', action: () => navigate('/graph') },
        { label: 'Glossar', shortcut: '⌃⌘B', bind: true, checked: pathname === '/glossar', action: () => navigate('/glossar') },
        { label: 'Kalender', shortcut: '⌃⌘K', bind: true, checked: pathname === '/kalender', action: () => navigate('/kalender') },
        { label: 'Begriffe hervorheben', checked: glossaryHighlight, action: () => setHighlight(!glossaryHighlight) },
        SEP,
        { label: 'Präsentieren', shortcut: '⌥⌘P', bind: true, disabled: !active, action: () => active?.present() },
        { label: 'Ab aktueller Stelle präsentieren', shortcut: '⇧⌥⌘P', bind: true, disabled: !active, action: () => active?.present(true) },
        SEP,
        // ⌘B/⇧⌘B werden unten von Hand geprüft: nur, wenn nichts markiert ist (sonst Fett/Zitat im Editor).
        { label: sidebarOpen ? 'Seitenleiste ausblenden' : 'Seitenleiste einblenden', shortcut: '⌘B', action: toggleSidebar },
        {
          label: active?.panelOpen ? 'Block-Leiste ausblenden' : 'Block-Leiste einblenden',
          shortcut: '⇧⌘B',
          disabled: !active || active.learning,
          action: () => active?.togglePanel(),
        },
        SEP,
        {
          label: 'Code-Theme',
          submenu: codeThemeMeta.map((t) => ({
            label: t.label,
            checked: codeTheme === t.value,
            action: () => setCodeTheme(t.value),
          })),
        },
        SEP,
        {
          label: fullscreen ? 'Vollbildmodus beenden' : 'Vollbildmodus',
          shortcut: '⌃⌘F',
          disabled: !document.fullscreenEnabled,
          action: () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()),
        },
      ],
    },
    {
      label: 'Hilfe',
      items: [
        { label: 'Willkommens-Notiz öffnen', action: openWelcome },
        { label: 'Über Mitschrift', action: () => setAbout(true) },
      ],
    },
  ];

  const menusRef = useRef(menus);
  menusRef.current = menus;
  const activeRef = useRef(active);
  activeRef.current = active;
  const toggleSidebarRef = useRef(toggleSidebar);
  toggleSidebarRef.current = toggleSidebar;

  // Die Suchpalette (⌘K) bekommt alle ausführbaren Menüeinträge mit ihrem Pfad.
  useEffect(() => {
    registerCommandSource(() => paletteCommands(menusRef.current));
  }, []);

  function close() {
    setOpen(null);
    setPath([]);
  }

  function run(item: Item) {
    if (item.disabled || item.submenu) return;
    close();
    item.action?.();
  }

  // Globale Tastenkürzel (nur Einträge mit `bind`).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      // Dokument-Zoom statt Browser-Zoom: nur der Inhalt wird größer, die Leisten bleiben.
      if (!e.altKey) {
        const zoomAction = e.key === '+' || e.key === '=' ? zoomIn : e.key === '-' || e.key === '_' ? zoomOut : e.code === 'Digit0' || e.key === '0' ? resetZoom : null;
        if (zoomAction) {
          e.preventDefault();
          e.stopPropagation();
          zoomAction();
          return;
        }
      }
      // ⌘B / ⇧⌘B: Seitenleisten umschalten – aber nur, wenn weder Text noch Blöcke markiert sind.
      const left = matchesShortcut(e, '⌘B');
      const right = !left && matchesShortcut(e, '⇧⌘B');
      if ((left || right) && nothingSelected(activeRef.current?.editor ?? null)) {
        const note = activeRef.current;
        if (left || (note && !note.learning)) {
          e.preventDefault();
          e.stopPropagation();
          if (left) toggleSidebarRef.current();
          else note?.togglePanel();
          return;
        }
      }
      const hit = menusRef.current.flatMap((m) => allItems(m.items)).find((i) => i.bind && i.shortcut && !i.disabled && matchesShortcut(e, i.shortcut));
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      run(hit);
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liest immer den aktuellen Stand aus menusRef
  }, []);

  // Offenes Menü: Klick daneben schließt, Pfeiltasten navigieren wie unter macOS.
  useEffect(() => {
    if (open === null) return;
    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      const menus = menusRef.current;
      const levels: MenuEntry[][] = [menus[open].items];
      for (const i of path.slice(0, -1)) {
        const sub = levels[levels.length - 1][i];
        if (isItem(sub) && sub.submenu) levels.push(sub.submenu);
      }
      const depth = Math.max(0, path.length - 1);
      const list = levels[depth] ?? levels[0];
      const current = path.length ? list[path[depth]] : undefined;

      const step = (dir: 1 | -1) => {
        const n = list.length;
        let i = path.length ? path[depth] : dir === 1 ? -1 : n;
        for (let k = 0; k < n; k++) {
          i = (i + dir + n) % n;
          if (selectable(list[i])) break;
        }
        setPath([...path.slice(0, depth), i]);
      };
      const switchMenu = (dir: 1 | -1) => {
        setOpen((open + dir + menus.length) % menus.length);
        setPath([]);
      };

      switch (e.key) {
        case 'ArrowDown':
          step(1);
          break;
        case 'ArrowUp':
          step(-1);
          break;
        case 'ArrowRight':
          if (isItem(current) && current.submenu && !current.disabled) setPath([...path, current.submenu.findIndex(selectable)]);
          else switchMenu(1);
          break;
        case 'ArrowLeft':
          if (path.length > 1) setPath(path.slice(0, -1));
          else switchMenu(-1);
          break;
        case 'Enter':
        case ' ':
          if (isItem(current) && current.submenu && !current.disabled) setPath([...path, current.submenu.findIndex(selectable)]);
          else if (isItem(current)) run(current);
          break;
        case 'Escape':
          if (path.length > 1) setPath(path.slice(0, -1));
          else close();
          break;
        case 'Tab':
          close();
          return;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run/close sind stabil genug, Menüs kommen aus menusRef
  }, [open, path]);

  const clock = `${now.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}  ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <>
      <nav
        ref={barRef}
        className="mb"
        role="menubar"
        aria-label="Menüleiste"
        // Fokus und Textauswahl im Editor behalten, während das Menü benutzt wird.
        onMouseDown={(e) => e.preventDefault()}
      >
        <span className="mb-logo" aria-hidden="true" />
        {menus.map((m, i) => (
          <div key={m.label} className="mb-root">
            <button
              ref={(el) => (titleRefs.current[i] = el)}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={open === i}
              className={`mb-title${open === i ? ' is-open' : ''}${m.app ? ' is-app' : ''}`}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                if (open === i) close();
                else {
                  setOpen(i);
                  setPath([]);
                }
              }}
              onClick={(e) => {
                // Nur Tastatur (Enter/Leertaste auf dem fokussierten Titel) – Maus läuft über mousedown.
                if (e.detail !== 0) return;
                setOpen(i);
                setPath([m.items.findIndex(selectable)]);
              }}
              onMouseEnter={() => {
                if (open !== null && open !== i) {
                  setOpen(i);
                  setPath([]);
                }
              }}
            >
              {m.label}
            </button>
            {open === i && (
              <MenuList
                items={m.items}
                depth={0}
                path={path}
                setPath={setPath}
                onRun={run}
                anchor={titleRefs.current[i]}
                label={m.label}
              />
            )}
          </div>
        ))}
        <span className="mb-spacer" />
        <time className="mb-clock" dateTime={now.toISOString()}>
          {clock}
        </time>
      </nav>
      <AboutDialog open={about} onClose={() => setAbout(false)} />
    </>
  );
}

interface MenuListProps {
  items: MenuEntry[];
  depth: number;
  path: number[];
  setPath: (p: number[]) => void;
  onRun: (item: Item) => void;
  /** Nur für die oberste Ebene: Titel-Knopf, unter dem das Menü erscheint. */
  anchor?: HTMLElement | null;
  label: string;
}

function MenuList({ items, depth, path, setPath, onRun, anchor, label }: MenuListProps) {
  const ref = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState<{ left?: number; flip?: boolean }>({});
  const highlighted = path[depth];

  // Im Fenster halten: oberste Ebene unter dem Titel, Untermenüs notfalls nach links klappen.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    if (depth === 0 && anchor) {
      const r = anchor.getBoundingClientRect();
      setPos({ left: Math.max(4, Math.min(r.left, window.innerWidth - w - 4)) });
    } else {
      const parent = el.parentElement!.getBoundingClientRect();
      setPos({ flip: parent.right + w > window.innerWidth - 4 });
    }
  }, [depth, anchor]);

  return (
    <ul
      ref={ref}
      role="menu"
      aria-label={label}
      className={`mb-menu${depth > 0 ? ' is-sub' : ''}${pos.flip ? ' is-flipped' : ''}`}
      style={depth === 0 ? { left: pos.left } : undefined}
      onMouseLeave={() => {
        // Maus verlässt das Menü: Hervorhebung weg – außer ein Untermenü ist offen.
        const cur = items[highlighted];
        if (path.length === depth + 1 && !(isItem(cur) && cur.submenu)) setPath(path.slice(0, depth));
      }}
    >
      {items.map((item, i) => {
        if (!isItem(item)) return <li key={`sep-${i}`} role="separator" className="mb-sep" />;
        const isOn = highlighted === i && !item.disabled;
        return (
          <li
            key={item.label}
            role={item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={item.checked}
            aria-disabled={item.disabled || undefined}
            aria-haspopup={item.submenu ? 'menu' : undefined}
            className={`mb-item${isOn ? ' is-on' : ''}${item.disabled ? ' is-disabled' : ''}`}
            onMouseEnter={() => setPath([...path.slice(0, depth), i])}
            onClick={() => onRun(item)}
          >
            <span className="mb-check" aria-hidden="true">
              {item.checked ? '✓' : ''}
            </span>
            <span className="mb-label">{item.label}</span>
            {item.shortcut && <span className="mb-shortcut">{formatShortcut(item.shortcut)}</span>}
            {item.submenu && <span className="mb-arrow" aria-hidden="true" />}
            {item.submenu && isOn && !item.disabled && (
              <MenuList items={item.submenu} depth={depth + 1} path={path} setPath={setPath} onRun={onRun} label={item.label} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const [status, setStatus] = useState<StorageStatus | null>(null);
  useEffect(() => {
    if (open) void storageStatus().then(setStatus);
  }, [open]);
  const lastBackup = open ? lastBackupAt() : null;
  const vault = useVaultState();

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="mb-about-backdrop" onMouseDown={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="mb-about"
            role="dialog"
            aria-modal="true"
            aria-label="Über Mitschrift"
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', bounce: 0.25, duration: 0.35 }}
          >
            <span className="mb-about-logo" aria-hidden="true" />
            <h2>Mitschrift</h2>
            <p className="mb-about-version">Version {APP_VERSION}</p>
            <p>Notizen mit Lern-Blöcken – Karteikarten, Quiz und Lückentext direkt im Text.</p>
            {status && (
              <p className="mb-about-storage">
                {vault.kind === 'folder'
                  ? `Speicher: Ordner „${vault.name}“ – jede Notiz liegt dort als Datei.`
                  : status.persisted
                  ? 'Speicher: dauerhaft – der Browser löscht die Notizen nicht von selbst.'
                  : 'Speicher: nicht geschützt – der Browser darf die Notizen bei Platzmangel oder Inaktivität löschen.'}
                {status.usage != null && ` Belegt: ${formatBytes(status.usage)}.`}
                <br />
                {lastBackup ? `Letztes Backup: ${new Date(lastBackup).toLocaleDateString('de-DE')}.` : 'Noch kein Backup gesichert.'}
              </p>
            )}
            <button type="button" className="b-btn" onClick={onClose} autoFocus>
              OK
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
