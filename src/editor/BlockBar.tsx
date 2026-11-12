import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { NodeSelection, Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { Mapping } from '@tiptap/pm/transform';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';
import { Icon, type IconName } from '@/ui/Icon';
import { Popover } from '@/blocks/collection/Popover';
import { TableOptions } from '@/blocks/table/TableMenu';
import { useBarMode } from '@/debug/barMode';
import { getBlockSelection, setBlockSelection } from './BlockSelection';
import { deleteUnits, outermost } from './blockUnits';
import { convertToGallery, mergeGalleries } from './convertToGallery';
import { DividerOptions } from './DividerOptions';

/**
 * Einheitliche Optionsleiste für Blöcke: mittig unter dem markierten Block bzw. dem Block,
 * in dem gerade gearbeitet wird (Cursor, Eingabefeld, letzter Klick). Blöcke liefern ihre
 * Optionen per {@link useBlockBar} – die landen per Portal in der Leiste, behalten aber den
 * Zustand ihres Blocks (offene Menüs, Bearbeiten-Modus …). Tabellen und Trennlinien bringt die Leiste selbst mit.
 *
 * Sind mehrere Blöcke desselben Typs markiert, zeigt die Leiste die Optionen des ersten; was
 * sie an dessen Einstellungen ändert, übernimmt {@link groupEditPlugin} für alle markierten.
 */

interface Reg {
  getPos: () => number | undefined;
}

type BuiltIn = 'table' | 'divider' | 'gallerySource';

/** Blöcke, aus denen sich mehrere zusammen zu einer Galerie umwandeln lassen. */
const GALLERY_SOURCE_TYPES = new Set(['image', 'svg']);

type Target = {
  pos: number;
  reg: Reg | null;
  builtIn: BuiltIn | null;
  via: 'selected' | 'inside';
  /** Alle markierten Blöcke (gleichen Typs), `pos` ist der erste davon. */
  group: number[];
  /** Typname der Gruppe, wenn mehrere Blöcke gleichen Typs markiert sind. */
  groupType: string | null;
};

class BarStore {
  /** Block (Position), in dem zuletzt geklickt wurde – hält den Block aktiv, auch ohne Fokus. */
  sticky: number | null = null;
  regs = new Set<Reg>();
  target: Target | null = null;
  slot: HTMLElement | null = null;
  panelSlot: HTMLElement | null = null;
  /** Titel der offenen Unteroption – ersetzt (im „pinned“-Modus) die Hauptleiste, bis „Zurück“. */
  panel: { title: string; onClose: () => void } | null = null;
  recompute = () => {};
  private listeners = new Set<() => void>();
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  emit() {
    for (const fn of this.listeners) fn();
  }
}

const stores = new WeakMap<Editor, BarStore>();
function barStore(editor: Editor): BarStore {
  let s = stores.get(editor);
  if (!s) stores.set(editor, (s = new BarStore()));
  return s;
}

/** Merkt sich den Block, in dem geklickt wurde (null = keiner). */
export function setBarSticky(editor: Editor, pos: number | null) {
  const s = barStore(editor);
  if (s.sticky === pos) return;
  s.sticky = pos;
  s.recompute();
}

export function barSticky(editor: Editor): number | null {
  return barStore(editor).sticky;
}

/**
 * Meldet einen Block mit Optionen an. `render` bringt die Optionen in die Leiste, solange der
 * Block aktiv ist; `active` z. B. für Griffe, die nur am aktiven Block erscheinen.
 */
export function useBlockBar(editor: Editor, getPos: () => number | undefined) {
  const store = barStore(editor);
  const getPosRef = useRef(getPos);
  getPosRef.current = getPos;
  const [reg] = useState<Reg>(() => ({ getPos: () => getPosRef.current() }));
  useEffect(() => {
    store.regs.add(reg);
    store.recompute();
    return () => {
      store.regs.delete(reg);
      store.recompute();
    };
  }, [store, reg]);
  const active = useSyncExternalStore(store.subscribe, () => store.target?.reg === reg);
  const slot = useSyncExternalStore(store.subscribe, () => store.slot);
  return {
    active,
    render: (children: ReactNode) => (active && slot ? createPortal(children, slot) : null),
  };
}

/**
 * Unteroption eines Blocks: im gewohnten Modus ein Popover am Knopf, im „pinned“-Modus (Dev-Schalter,
 * s. {@link useBarMode}) ersetzt der Inhalt stattdessen die Hauptleiste, mit Zurück-Pfeil davor. Blöcke
 * schreiben ihre Unteroption einmal – welche Darstellung greift, entscheidet dieser Hook.
 *
 * `label` erscheint im „pinned“-Modus als Titel neben dem Zurück-Pfeil, im Popover-Modus als
 * Tooltip/aria-label des öffnenden Knopfs (wie bisher).
 */
export function useBarSubmenu(
  editor: Editor,
  opts: {
    icon: IconName;
    label: string;
    text?: string;
    active?: boolean;
    /** Zweite Ebene (z. B. „Mehr“ → „Bild ersetzen“): eigener Titel, Zurück geht eine Ebene hoch statt ganz zu schließen. */
    sub?: { title: string; onBack: () => void } | null;
    /** Nur im Popover-Modus: Klasse/Ausrichtung des Popovers (wie {@link Popover}). */
    popoverClassName?: string;
    popoverAlign?: 'start' | 'end';
  },
) {
  const store = barStore(editor);
  const mode = useBarMode();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const panelSlot = useSyncExternalStore(store.subscribe, () => store.panelSlot);
  const pinned = mode === 'pinned';
  const title = opts.sub?.title ?? opts.label;
  const onBack = opts.sub?.onBack;

  // Im „pinned“-Modus übernimmt die Leiste selbst Titel und Zurück-Pfeil, solange offen.
  useEffect(() => {
    if (!pinned || !open) return;
    const close = () => (onBack ? onBack() : setOpen(false));
    store.panel = { title, onClose: close };
    store.emit();
    return () => {
      if (store.panel?.onClose === close) {
        store.panel = null;
        store.emit();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned, open, title, onBack]);

  const close = () => {
    setOpen(false);
    setAnchor(null);
  };

  /** Öffnet die Unteroption an einem beliebigen Element – z. B. ein Knopf außerhalb der Leiste. */
  const openAt = (el: HTMLElement) => {
    setAnchor(el);
    setOpen(true);
  };

  const button = (
    <BarButton
      icon={opts.icon}
      label={opts.label}
      text={opts.text}
      chevron
      active={opts.active || open}
      onClick={(e) => (open ? close() : openAt(e.currentTarget))}
    />
  );

  const submenu = (children: ReactNode) => {
    if (!open) return null;
    if (pinned) return panelSlot ? createPortal(children, panelSlot) : null;
    return anchor ? (
      <Popover anchor={anchor} onClose={close} className={opts.popoverClassName} align={opts.popoverAlign}>
        {children}
      </Popover>
    ) : null;
  };

  return { open, close, openAt, button, submenu };
}

interface Candidate {
  pos: number;
  node: PMNode;
  reg: Reg | null;
  builtIn: BuiltIn | null;
}

function candidates(editor: Editor, store: BarStore): Candidate[] {
  const { doc } = editor.state;
  const out: Candidate[] = [];
  for (const reg of store.regs) {
    const pos = reg.getPos();
    const node = typeof pos === 'number' ? doc.nodeAt(pos) : null;
    if (node && typeof pos === 'number') out.push({ pos, node, reg, builtIn: null });
  }
  doc.descendants((node, pos) => {
    if (node.type.name === 'table' || node.type.name === 'horizontalRule') {
      out.push({ pos, node, reg: null, builtIn: node.type.name === 'table' ? 'table' : 'divider' });
      return false;
    }
    return !node.isTextblock && !node.isAtom;
  });
  return out;
}

/** Welcher Block bekommt die Leiste? Markierung vor letztem Klick vor Fokus/Cursor. */
function resolve(editor: Editor, store: BarStore): Target | null {
  const { state, view } = editor;
  const cands = candidates(editor, store);
  const contains = (c: Candidate, p: number) => c.pos <= p && p < c.pos + c.node.nodeSize;
  /** Innerster passender Block (verschachtelt: der mit der größten Position). */
  const pick = (pred: (c: Candidate) => boolean, via: Target['via']): Target | null => {
    const c = cands.filter(pred).sort((a, b) => b.pos - a.pos)[0];
    return c ? { pos: c.pos, reg: c.reg, builtIn: c.builtIn, via, group: [c.pos], groupType: null } : null;
  };

  const sel = getBlockSelection(state);
  if (sel.length) {
    const units = outermost(state.doc, sel);
    if (units.length === 1) return pick((c) => contains(c, units[0].pos), 'selected');
    // Mehrere Bild-/SVG-Blöcke gemischten Typs: keine eigenen Optionen, nur „In Galerie umwandeln“.
    if (units.every((u) => GALLERY_SOURCE_TYPES.has(u.node.type.name))) {
      const type = units[0].node.type;
      if (units.some((u) => u.node.type !== type)) {
        return { pos: units[0].pos, reg: null, builtIn: 'gallerySource', via: 'selected', group: units.map((u) => u.pos), groupType: null };
      }
    }
    // Mehrere: nur Blöcke gleichen Typs mit eigenen Optionen (Tabellen-Befehle wirken nur auf eine).
    const type = units[0].node.type;
    if (type.name === 'table' || units.some((u) => u.node.type !== type)) return null;
    if (!units.every((u) => cands.some((c) => c.pos === u.pos))) return null;
    const first = cands.find((c) => c.pos === units[0].pos)!;
    return { pos: first.pos, reg: first.reg, builtIn: first.builtIn, via: 'selected', group: units.map((u) => u.pos), groupType: type.name };
  }

  const ae = document.activeElement;
  if (ae && ae !== view.dom && view.dom.contains(ae)) {
    const hit = pick((c) => !!view.nodeDOM(c.pos)?.contains(ae), 'inside');
    if (hit) return hit;
  }
  if (store.sticky !== null) {
    const sticky = store.sticky;
    const hit = pick((c) => contains(c, sticky), 'inside');
    if (hit) return hit;
  }
  if (view.hasFocus()) {
    const { selection } = state;
    const { from } = selection;
    return pick((c) => (selection instanceof NodeSelection && selection.from === c.pos) || (c.pos < from && from < c.pos + c.node.nodeSize), 'inside');
  }
  return null;
}

const sameTarget = (a: Target | null, b: Target | null) =>
  a === b ||
  (!!a && !!b && a.pos === b.pos && a.reg === b.reg && a.via === b.via && a.group.length === b.group.length && a.group.every((p, i) => p === b.group[i]));

/** Attribute mit Inhalt statt Einstellung – die bleiben je Block, auch wenn mehrere markiert sind. */
const CONTENT_ATTRS = new Set(['code', 'svg', 'latex', 'text', 'summary', 'filename', 'fileId', 'alt', 'src', 'title']);

function isSetting(nodeType: string, key: string, value: unknown): boolean {
  // Der Titel einer Hervorhebung gehört zu ihrem Stil (wie „Tipp“, „Wichtig“).
  if (CONTENT_ATTRS.has(key) && !(nodeType === 'callout' && key === 'title')) return false;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return true;
  return typeof value === 'string' && value.length <= 200;
}

const sameValue = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * Mehrere Blöcke gleichen Typs markiert: Ändert sich eine Einstellung des ersten (Farbe, Stil,
 * Sprache …), bekommen die übrigen markierten Blöcke dieselbe – in derselben Rückgängig-Stufe.
 */
function groupEditPlugin(store: BarStore) {
  return new Plugin({
    key: new PluginKey('blockBarGroup'),
    appendTransaction(trs: readonly Transaction[], oldState, newState) {
      const t = store.target;
      if (!t || t.group.length < 2 || !trs.some((tr) => tr.docChanged)) return null;
      // Rückgängig/Wiederholen stellt jeden Block selbst wieder her.
      if (trs.some((tr) => tr.getMeta('history$'))) return null;
      const before = oldState.doc.nodeAt(t.pos);
      const mapping = new Mapping();
      for (const tr of trs) mapping.appendMapping(tr.mapping);
      // Ohne `deleted`-Prüfung: setNodeMarkup ersetzt die Rand-Token, der Block gälte sonst als gelöscht.
      // Ob an der Stelle noch derselbe Block steht, sagt der Typ-Vergleich.
      const after = newState.doc.nodeAt(mapping.map(t.pos, -1));
      if (!before || !after || before.type !== after.type) return null;
      const type = after.type.name;
      const changed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(after.attrs)) {
        if (!sameValue(before.attrs[key], value) && isSetting(type, key, value)) changed[key] = value;
      }
      if (!Object.keys(changed).length) return null;
      const tr = newState.tr;
      for (const p of t.group) {
        if (p === t.pos) continue;
        const at = mapping.map(p, -1);
        const node = tr.doc.nodeAt(at);
        if (node?.type !== after.type) continue;
        if (Object.entries(changed).every(([k, v]) => sameValue(node.attrs[k], v))) continue;
        tr.setNodeMarkup(at, undefined, { ...node.attrs, ...changed });
      }
      return tr.steps.length ? tr : null;
    },
  });
}

/** Knopf in der Optionsleiste. */
export function BarButton({
  icon,
  label,
  text,
  active,
  chevron,
  danger,
  disabled,
  onClick,
}: {
  icon: IconName;
  label: string;
  /** Sichtbare Beschriftung neben dem Symbol. */
  text?: string;
  active?: boolean;
  chevron?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={`c-bar-btn${active ? ' is-active' : ''}${danger ? ' is-danger' : ''}${text ? ' has-text' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} />
      {text && <span>{text}</span>}
      {chevron && <Icon name="chevron" className="c-bar-chev" />}
    </button>
  );
}

export function BarSep() {
  return <span className="c-bar-sep" />;
}

/** Die Leiste selbst – einmal pro Editor. */
export function BlockBar({ editor }: { editor: Editor }) {
  const store = barStore(editor);
  const mode = useBarMode();
  const pinned = mode === 'pinned';
  const [target, setTarget] = useState<Target | null>(null);
  const panel = useSyncExternalStore(store.subscribe, () => store.panel);
  const barRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(target);
  targetRef.current = target;

  // Modus gewechselt oder Ziel verloren: keine verwaiste Unteroption stehen lassen.
  useEffect(() => {
    if (!target || !pinned) {
      store.panel?.onClose();
    }
  }, [target, pinned, store]);

  useEffect(() => {
    const plugin = groupEditPlugin(store);
    editor.registerPlugin(plugin);
    return () => {
      if (!editor.isDestroyed) editor.unregisterPlugin(plugin.spec.key!);
    };
  }, [editor, store]);

  // Ziel neu bestimmen – gebündelt pro Frame, Fokuswechsel folgen erst nach dem Mausdruck.
  useEffect(() => {
    let raf = 0;
    const run = () => {
      raf = 0;
      if (editor.isDestroyed) return;
      const next = editor.isEditable ? resolve(editor, store) : null;
      if (sameTarget(store.target, next)) return;
      store.target = next;
      setTarget(next);
      store.emit();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    store.recompute = schedule;
    const onTransaction = ({ transaction: tr }: { transaction: import('@tiptap/pm/state').Transaction }) => {
      if (tr.docChanged && store.sticky !== null) {
        // Nicht über `deleted`: Attribut-Änderungen (setNodeMarkup – Slider, Formel …) ersetzen die
        // Rand-Token des Blocks, er gälte sonst als gelöscht. Steht dort noch derselbe Block, bleibt er aktiv.
        const type = tr.before.nodeAt(store.sticky)?.type;
        const pos = tr.mapping.map(store.sticky, -1);
        store.sticky = type && tr.doc.nodeAt(pos)?.type === type ? pos : null;
      }
      // Cursor per Tastatur aus dem gemerkten Block bewegt: der Klick zählt nicht mehr.
      if (!tr.docChanged && tr.selectionSet && store.sticky !== null && editor.view.hasFocus()) {
        const node = editor.state.doc.nodeAt(store.sticky);
        const { from } = editor.state.selection;
        if (!node || from < store.sticky || from > store.sticky + node.nodeSize) store.sticky = null;
      }
      schedule();
    };
    editor.on('transaction', onTransaction);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      store.recompute = () => {};
      editor.off('transaction', onTransaction);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
    };
  }, [editor, store]);

  // Position: mittig unter dem Block, bei hohen Blöcken am unteren Fensterrand festgehalten.
  // Im „pinned“-Modus bleibt die Leiste fix am unteren Rand (siehe CSS), keine JS-Platzierung nötig.
  useEffect(() => {
    if (pinned) {
      // Von „floating“ gewechselt: inline gesetzte Position/Sichtbarkeit nicht mitschleppen.
      const bar = barRef.current;
      if (bar) {
        bar.style.left = '';
        bar.style.top = '';
        bar.style.visibility = '';
      }
      return;
    }
    if (!target) return;
    let raf = 0;
    const place = () => {
      raf = requestAnimationFrame(place);
      const bar = barRef.current;
      const t = targetRef.current;
      if (!bar || !t) return;
      const el = editor.view.nodeDOM(t.pos);
      if (!(el instanceof HTMLElement)) return;
      // Mehrere markiert: unter dem letzten, damit die Leiste keinen davon verdeckt.
      const lastEl = t.group.length > 1 ? editor.view.nodeDOM(t.group[t.group.length - 1]) : el;
      const first = el.getBoundingClientRect();
      const last = lastEl instanceof HTMLElement ? lastEl.getBoundingClientRect() : first;
      const r = new DOMRect(first.left, first.top, first.width, last.bottom - first.top);
      const w = bar.offsetWidth;
      const h = bar.offsetHeight;
      const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
      bar.style.left = `${Math.round(left)}px`;
      // bar.style.top = `${Math.round(Math.min(r.bottom + 10, window.innerHeight - h - 14))}px`;
      // Block ganz aus dem Bild gescrollt: Leiste ausblenden.
      bar.style.visibility = r.bottom < 0 || r.top > window.innerHeight - h ? 'hidden' : '';
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [editor, target, pinned]);

  const setSlot = (el: HTMLDivElement | null) => {
    if (store.slot === el) return;
    store.slot = el;
    store.emit();
  };
  const setPanelSlot = (el: HTMLDivElement | null) => {
    if (store.panelSlot === el) return;
    store.panelSlot = el;
    store.emit();
  };

  /** Jeden Block direkt hinter sich verdoppeln; markiert werden die Kopien. */
  function duplicate() {
    const t = targetRef.current;
    if (!t) return;
    const tr = editor.state.tr;
    const copies: number[] = [];
    for (const p of t.group) {
      const from = tr.mapping.map(p);
      const node = tr.doc.nodeAt(from);
      if (!node) continue;
      tr.insert(from + node.nodeSize, node.copy(node.content));
      copies.push(from + node.nodeSize);
    }
    editor.view.dispatch(tr);
    setBarSticky(editor, null);
    setBlockSelection(editor, copies.map((p, i) => tr.mapping.slice(i + 1).map(p)));
  }

  function remove() {
    const t = targetRef.current;
    if (!t) return;
    setBarSticky(editor, null);
    setBlockSelection(editor, []);
    editor.view.dispatch(deleteUnits(editor.state.tr, t.group));
  }

  function toGallery() {
    const t = targetRef.current;
    if (!t) return;
    convertToGallery(editor, t.group);
    setBarSticky(editor, null);
    setBlockSelection(editor, []);
  }

  function mergeSelectedGalleries() {
    const t = targetRef.current;
    if (!t) return;
    mergeGalleries(editor, t.group);
    setBarSticky(editor, null);
    setBlockSelection(editor, []);
  }

  const showPanel = pinned && !!panel;
  return createPortal(
    <div
      ref={barRef}
      className={`c-block-bar${pinned ? ' is-pinned' : ''}${showPanel ? ' is-panel' : ''}`}
      hidden={!target}
      onMouseDown={(e) => {
        // Fokus bleibt, wo er war (Cursor in der Tabelle, Eingabefeld im Block) – außer bei Feldern in der Leiste.
        if (!(e.target as Element).closest('input,select,textarea')) e.preventDefault();
        // Menüs aus der Leiste nehmen den Fokus mit – der Block bleibt trotzdem aktiv.
        const t = targetRef.current;
        if (t && t.via === 'inside') setBarSticky(editor, t.pos);
      }}
    >
      {showPanel && (
        <div className="c-bar-panel-head">
          <BarButton icon="arrowLeft" label="Zurück" onClick={() => panel!.onClose()} />
          <span className="c-bar-panel-title">{panel!.title}</span>
        </div>
      )}
      <div className="c-block-bar-row" hidden={showPanel}>
        {target && target.group.length > 1 && <span className="c-bar-count">{target.group.length} Blöcke</span>}
        <div ref={setSlot} className="c-block-bar-slot" />
        {target?.builtIn === 'table' && <TableOptions editor={editor} pos={target.pos} inCell={target.via === 'inside'} />}
        {target?.builtIn === 'divider' && <DividerOptions editor={editor} pos={target.pos} />}
        {target?.builtIn === 'gallerySource' && <BarButton icon="gallery" label="Markierte in Galerie umwandeln" onClick={toGallery} />}
        {target?.groupType === 'gallery' && target.group.length > 1 && <BarButton icon="gallery" label="Galerien zusammenführen" onClick={mergeSelectedGalleries} />}
        <BarSep />
        <BarButton icon="copy" label={target && target.group.length > 1 ? 'Alle duplizieren' : 'Duplizieren'} onClick={duplicate} />
        <BarButton icon="trash" label={target && target.group.length > 1 ? 'Alle löschen' : 'Block löschen'} danger onClick={remove} />
      </div>
      <div ref={setPanelSlot} className="c-block-bar-panel" hidden={!showPanel} />
    </div>,
    document.body,
  );
}
