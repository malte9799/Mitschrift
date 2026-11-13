import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { themeMeta, useTheme, type Theme } from './theme';
import { codeThemeMeta, useCodeTheme, type CodeTheme } from './codeTheme';
import { ZOOM_STEPS, setZoom, useDocZoom } from './docZoom';
import { setHighlight, useHighlight } from '@/glossary/store';
import { lastBackupAt } from '@/storage/backup';
import { requestPersistence, storageStatus, type StorageStatus } from '@/storage/persist';
import { folderSupported, useVaultState } from '@/storage/vault';
import { Icon } from '@/ui/Icon';
import { formatShortcut } from '@/ui/shortcut';
import { version as APP_VERSION } from '../../package.json';
import { useFocusTrap } from '@/ui/useFocusTrap';

/** Aktionen, die im Menü liegen (sie brauchen dessen Dialoge und Router-Zugriff) und hier nur angestoßen werden. */
export interface SettingsActions {
  pickFolder: () => void;
  unlinkFolder: () => void;
  backup: () => void;
  restore: () => void;
  openWelcome: () => void;
}

type SectionId = 'general' | 'appearance' | 'storage' | 'shortcuts' | 'about';

const NAV: { label: string; items: { id: SectionId; label: string; icon: 'sliders' | 'palette' | 'folder' | 'kbd' | 'sparkle' }[] }[] = [
  {
    label: 'Präferenzen',
    items: [
      { id: 'general', label: 'Allgemein', icon: 'sliders' },
      { id: 'appearance', label: 'Erscheinungsbild', icon: 'palette' },
    ],
  },
  { label: 'Daten', items: [{ id: 'storage', label: 'Speicher & Backup', icon: 'folder' }] },
  {
    label: 'Hilfe',
    items: [
      { id: 'shortcuts', label: 'Tastenkürzel', icon: 'kbd' },
      { id: 'about', label: 'Über Mitschrift', icon: 'sparkle' },
    ],
  },
];
const SECTION_LABEL = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.id, i.label]))) as Record<SectionId, string>;

interface Entry {
  section: SectionId;
  /** Zwischenüberschrift innerhalb des Bereichs. */
  group: string;
  title: string;
  hint?: string;
  keywords?: string;
  control?: ReactNode;
}

const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  {
    group: 'Allgemein',
    items: [
      ['Suchen & Befehle', '⌘K'],
      ['Einstellungen', '⌘,'],
      ['Seitenleiste durchsuchen', '⌘F'],
      ['Seitenleiste ein-/ausblenden', '⌘B'],
      ['Block-Leiste ein-/ausblenden', '⇧⌘B'],
      ['Dokument vergrößern / verkleinern', '⌘+ / ⌘−'],
      ['Originalgröße', '⌘0'],
    ],
  },
  {
    group: 'Notizen',
    items: [
      ['Neue Notiz', '⌥⌘N'],
      ['Neue Unterseite', '⇧⌥⌘N'],
      ['Als Begriff ins Glossar', '⇧⌘G'],
      ['Bearbeitungsmodus', '⌃⌘E'],
      ['Lernmodus', '⌃⌘L'],
      ['Präsentieren', '⌥⌘P'],
      ['Ab aktueller Stelle präsentieren', '⇧⌥⌘P'],
      ['Drucken', '⌘P'],
    ],
  },
  {
    group: 'Ansichten',
    items: [
      ['Übersicht', '⌃⌘H'],
      ['Graph-Ansicht', '⌃⌘G'],
      ['Glossar', '⌃⌘B'],
      ['Kalender', '⌃⌘K'],
      ['Vollbild', '⌃⌘F'],
    ],
  },
];

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}


/** Zuletzt besuchten Bereich merken, solange die Seite offen ist. */
let lastSection: SectionId = 'general';

const BASE_THEMES: Theme[] = ['light', 'dark', 'system'];
const PALETTES = themeMeta.filter((t) => !BASE_THEMES.includes(t.value));
const norm = (t: string) => t.toLowerCase();

/** Einstellungen (⌘,): Bereichsliste mit Suche links, Inhalt rechts. */
export function SettingsDialog({ open, onClose, actions }: { open: boolean; onClose: () => void; actions: SettingsActions }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="mb-about-backdrop" onMouseDown={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SettingsPanel panelRef={ref} onClose={onClose} actions={actions} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useEntries(actions: SettingsActions): Entry[] {
  const zoom = useDocZoom();
  const highlight = useHighlight();
  const { theme, setTheme } = useTheme();
  const { theme: codeTheme, setCodeTheme } = useCodeTheme();
  const vault = useVaultState();
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    void storageStatus().then(setStatus);
  }, []);
  async function protect() {
    const ok = await requestPersistence();
    setDenied(!ok);
    setStatus(await storageStatus());
  }
  const lastBackup = lastBackupAt();

  return [
    {
      section: 'general',
      group: 'Dokument',
      title: 'Dokument-Zoom',
      hint: 'Skaliert Notizen und Handbuch, nicht die Leisten.',
      keywords: 'größe skalieren zoom',
      control: (
        <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
          {ZOOM_STEPS.map((z) => (
            <option key={z} value={z}>
              {Math.round(z * 100)} %
            </option>
          ))}
        </select>
      ),
    },
    {
      section: 'general',
      group: 'Dokument',
      title: 'Begriffe hervorheben',
      hint: 'Glossar-Begriffe im Text unterstreichen.',
      keywords: 'glossar',
      control: <input type="checkbox" role="switch" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />,
    },
    {
      section: 'general',
      group: 'Einstieg',
      title: 'Willkommens-Notiz',
      hint: 'Die Einführungsnotiz erneut öffnen.',
      keywords: 'einführung start hilfe',
      control: (
        <button type="button" className="b-btn" onClick={actions.openWelcome}>
          Öffnen
        </button>
      ),
    },
    {
      section: 'appearance',
      group: 'Darstellung',
      title: 'Design',
      hint: 'Hell, dunkel oder passend zum System.',
      keywords: 'theme hell dunkel automatisch system',
      control: (
        <div className="mb-seg" role="radiogroup" aria-label="Design">
          {BASE_THEMES.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={theme === t} onClick={() => setTheme(t)}>
              {themeMeta.find((m) => m.value === t)?.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      section: 'appearance',
      group: 'Darstellung',
      title: 'Farbpalette',
      hint: 'Eigenständige Paletten statt Hell/Dunkel.',
      keywords: 'mist linen sepia graphite slate midnight theme',
      control: (
        <select value={BASE_THEMES.includes(theme) ? '' : theme} onChange={(e) => setTheme((e.target.value || 'system') as Theme)}>
          <option value="">Keine</option>
          {PALETTES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      section: 'appearance',
      group: 'Code',
      title: 'Code-Theme',
      hint: 'Farben für Syntax-Highlighting in Codeblöcken.',
      keywords: 'syntax highlighting farben',
      control: (
        <select value={codeTheme} onChange={(e) => setCodeTheme(e.target.value as CodeTheme)}>
          {codeThemeMeta.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      section: 'storage',
      group: 'Speicherort',
      title: 'Speicherort',
      hint: vault.kind === 'folder' ? `Ordner „${vault.name}“ – jede Notiz liegt dort als Datei.` : 'Browser-Speicher',
      keywords: 'ordner vault dateien',
      control: (
        <span className="mb-settings-btns">
          {vault.kind === 'folder' && (
            <button type="button" className="b-btn" onClick={actions.unlinkFolder}>
              Trennen
            </button>
          )}
          <button type="button" className="b-btn" onClick={actions.pickFolder} disabled={!folderSupported} title={folderSupported ? undefined : 'Nur in Chrome/Edge'}>
            {vault.kind === 'folder' ? 'Anderer Ordner …' : 'Ordner wählen …'}
          </button>
        </span>
      ),
    },
    ...(status
      ? [
          {
            section: 'storage' as const,
            group: 'Speicherort',
            title: 'Schutz vor automatischem Löschen',
            hint:
              (status.persisted
                ? 'Geschützt – der Browser löscht die Notizen nicht von selbst.'
                : status.persisted === null
                ? 'Dieser Browser kann den Speicher nicht schützen.'
                : denied
                ? 'Der Browser hat abgelehnt. Er gewährt den Schutz meist erst, wenn Mitschrift als App installiert oder häufig genutzt wird. Sicherer: einen Ordner als Speicherort wählen oder regelmäßig ein Backup sichern.'
                : 'Nicht geschützt – der Browser darf bei Platzmangel löschen. Einen Ordner als Speicherort zu wählen oder Backups zu sichern schützt zuverlässig.') +
              (status.usage != null ? ` Belegt: ${formatBytes(status.usage)}.` : ''),
            control:
              status.persisted === false ? (
                <button type="button" className="b-btn" onClick={() => void protect()}>
                  Schutz anfordern
                </button>
              ) : undefined,
            keywords: 'speicherplatz persistent',
          },
        ]
      : []),
    {
      section: 'storage',
      group: 'Backup',
      title: 'Backup',
      hint: lastBackup ? `Letztes Backup: ${new Date(lastBackup).toLocaleDateString('de-DE')}.` : 'Noch kein Backup gesichert.',
      keywords: 'sichern einspielen wiederherstellen export',
      control: (
        <span className="mb-settings-btns">
          <button type="button" className="b-btn" onClick={actions.restore}>
            Einspielen …
          </button>
          <button type="button" className="b-btn" onClick={actions.backup}>
            Sichern …
          </button>
        </span>
      ),
    },
    ...SHORTCUTS.flatMap((g) =>
      g.items.map(([title, keys]) => ({
        section: 'shortcuts' as const,
        group: g.group,
        title,
        keywords: 'tastenkürzel tastatur shortcut',
        control: <kbd className="mb-kbd">{formatShortcut(keys)}</kbd>,
      })),
    ),
    {
      section: 'about',
      group: 'Mitschrift',
      title: 'Version',
      hint: 'Notizen mit Lern-Blöcken – Karteikarten, Quiz und Lückentext direkt im Text.',
      control: <span className="mb-settings-value">{APP_VERSION}</span>,
    },
  ];
}

function SettingsPanel({ panelRef, onClose, actions }: { panelRef: RefObject<HTMLDivElement>; onClose: () => void; actions: SettingsActions }) {
  const [section, setSection] = useState<SectionId>(lastSection);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const entries = useEntries(actions);
  useFocusTrap(panelRef, true, () => searchRef.current);
  const pick = (id: SectionId) => {
    lastSection = id;
    setSection(id);
    setQuery('');
  };

  const q = norm(query.trim());
  const shown = useMemo(() => {
    if (!q) return entries.filter((e) => e.section === section);
    return entries.filter((e) => norm(`${e.title} ${e.hint ?? ''} ${e.keywords ?? ''} ${SECTION_LABEL[e.section]} ${e.group}`).includes(q));
  }, [entries, q, section]);

  // Gruppen in Reihenfolge; bei der Suche mit Bereichsname davor.
  const groups: { key: string; title: string; items: Entry[] }[] = [];
  for (const e of shown) {
    const title = q ? `${SECTION_LABEL[e.section]} · ${e.group}` : e.group;
    let g = groups.find((x) => x.title === title);
    if (!g) groups.push((g = { key: title, title, items: [] }));
    g.items.push(e);
  }

  return (
    <motion.div
      ref={panelRef}
      className="mb-settings"
      role="dialog"
      aria-modal="true"
      aria-label="Einstellungen"
      onMouseDown={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
    >
      <header className="mb-settings-head">
        <h2>Einstellungen</h2>
        <button type="button" className="mb-settings-close" onClick={onClose} aria-label="Schließen">
          <Icon name="x" />
        </button>
      </header>
      <div className="mb-settings-body">
        <nav className="mb-settings-nav" aria-label="Bereiche">
          <label className="mb-settings-search">
            <Icon name="search" />
            <input ref={searchRef} type="search" placeholder="Suchen" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Einstellungen durchsuchen" />
          </label>
          {NAV.map((g) => (
            <div key={g.label} className="mb-settings-navgroup">
              <span className="mb-settings-navlabel">{g.label}</span>
              {g.items.map((s) => (
                <button key={s.id} type="button" className="mb-settings-tab" aria-current={!q && section === s.id ? 'page' : undefined} onClick={() => pick(s.id)}>
                  <Icon name={s.icon} />
                  {s.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="mb-settings-content">
          {groups.length === 0 && <p className="mb-settings-empty">Keine Einstellung gefunden für „{query}“.</p>}
          {groups.map((g) => (
            <section key={g.key} className="mb-settings-group">
              <h3>{g.title}</h3>
              {g.items.map((e) => (
                <div key={`${e.section}-${e.title}`} className="mb-settings-row">
                  <div className="mb-settings-text">
                    <span className="mb-settings-title">{e.title}</span>
                    {e.hint && <span className="mb-settings-hint">{e.hint}</span>}
                  </div>
                  {e.control && <div className="mb-settings-control">{e.control}</div>}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
