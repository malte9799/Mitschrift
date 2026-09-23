import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { setBlockSelection } from '@/editor/BlockSelection';
import { CollectionCell } from './CollectionCell';
import { FieldMenu } from './FieldMenu';
import { Popover } from './Popover';
import { cellText, changeFieldType, fieldIcon, newSheet, nextOptionColor, parseCell, sortedRows, uid, type CellValue, type CollectionData, type Field, type Sheet } from './model';
import { confirmDialog } from '@/ui/Dialog';

/** Zelle als Zeilen-/Spaltenindex in der angezeigten (sortierten) Reihenfolge. */
interface CellPos {
  r: number;
  c: number;
}
/** Rechteckige Zellauswahl von `anchor` (Startzelle) bis `focus` (aktuelle Zelle). */
interface CellRange {
  anchor: CellPos;
  focus: CellPos;
}

const bounds = ({ anchor, focus }: CellRange) => ({
  r0: Math.min(anchor.r, focus.r),
  r1: Math.max(anchor.r, focus.r),
  c0: Math.min(anchor.c, focus.c),
  c1: Math.max(anchor.c, focus.c),
});
const clamp = (n: number, max: number) => Math.max(0, Math.min(n, max));
const single = (p: CellPos): CellRange => ({ anchor: p, focus: p });
const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

export function CollectionView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const editable = useEditable(editor);
  const data = node.attrs.data as CollectionData;
  const [activeId, setActiveId] = useState(data.sheets[0]?.id);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ fieldId: string; anchor: HTMLElement; edit: boolean } | null>(null);
  // Abgehakte Zeilen (nur Ansicht, wird nicht gespeichert).
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  // Markierte Zellen (Klick bzw. Ziehen im Rechteck), wie in einer Tabellenkalkulation.
  const [cellSel, setCellSel] = useState<CellRange | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  /** Der Klick nach einem Auswahl-Mausdruck soll nichts auslösen (Auswahlmenü öffnen o. Ä.). */
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const onUp = () => {
      draggingRef.current = false;
      setTimeout(() => (suppressClickRef.current = false));
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  // Klick außerhalb der Tabelle (Menüs ausgenommen) hebt die Zellauswahl auf.
  useEffect(() => {
    if (!cellSel) return;
    const onDown = (e: globalThis.MouseEvent) => {
      const t = e.target as Element;
      if (!gridRef.current?.contains(t) && !t.closest?.('.b-pop')) setCellSel(null);
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [cellSel]);

  // Zeilen/Felder gelöscht: Auswahl verwerfen, wenn sie nicht mehr passt.
  const activeSheet = data.sheets.find((s) => s.id === activeId) ?? data.sheets[0];
  const rowCount = activeSheet?.rows.length ?? 0;
  const colCount = activeSheet?.fields.length ?? 0;
  useEffect(() => {
    if (!cellSel) return;
    const b = bounds(cellSel);
    if (b.r1 >= rowCount || b.c1 >= colCount) setCellSel(null);
  }, [cellSel, rowCount, colCount]);

  const sheet = activeSheet;
  if (!sheet) return null;

  const save = (next: CollectionData) => updateAttributes({ data: next });
  const updateSheet = (fn: (s: Sheet) => Sheet) => save({ ...data, sheets: data.sheets.map((s) => (s.id === sheet.id ? fn(s) : s)) });
  const updateField = (field: Field) => updateSheet((s) => ({ ...s, fields: s.fields.map((f) => (f.id === field.id ? field : f)) }));
  const setCell = (rowId: string, fieldId: string, value: CellValue) =>
    updateSheet((s) => ({ ...s, rows: s.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [fieldId]: value } } : r)) }));
  /** Mehrere Zellen in einem Schritt setzen (Leeren, Einfügen) – ein Rückgängig-Schritt. */
  const setCells = (updates: { rowId: string; fieldId: string; value: CellValue }[]) =>
    updateSheet((s) => ({
      ...s,
      rows: s.rows.map((r) => {
        const mine = updates.filter((u) => u.rowId === r.id);
        if (!mine.length) return r;
        const cells = { ...r.cells };
        for (const u of mine) cells[u.fieldId] = u.value;
        return { ...r, cells };
      }),
    }));

  function addSheet() {
    const s = newSheet(`Tabelle ${data.sheets.length + 1}`);
    save({ ...data, sheets: [...data.sheets, s] });
    selectSheet(s.id);
    setRenaming(s.id);
  }

  async function deleteSheet(id: string) {
    const s = data.sheets.find((x) => x.id === id);
    if (!s || data.sheets.length < 2) return;
    if (!(await confirmDialog(`Tabellenblatt „${s.name}“ löschen?`, { confirmLabel: 'Löschen', danger: true }))) return;
    const rest = data.sheets.filter((x) => x.id !== id);
    save({ ...data, sheets: rest });
    selectSheet(rest[0].id);
  }

  function addField(anchor: HTMLElement) {
    const field: Field = { id: uid(), name: `Feld ${sheet.fields.length + 1}`, type: 'text' };
    updateSheet((s) => ({ ...s, fields: [...s.fields, field] }));
    // Menü öffnet sich, sobald der neue Spaltenkopf gerendert ist.
    requestAnimationFrame(() => {
      const th = anchor.closest('table')?.querySelector<HTMLElement>(`[data-field="${field.id}"]`);
      if (th) setMenu({ fieldId: field.id, anchor: th, edit: true });
    });
  }

  const rows = sortedRows(sheet);
  const checkedRows = rows.filter((r) => checked.has(r.id));
  const allChecked = rows.length > 0 && checkedRows.length === rows.length;
  const toggleRow = (id: string) =>
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectSheet = (id: string) => {
    setActiveId(id);
    setChecked(new Set());
    setCellSel(null);
  };

  // --- Zellauswahl ---------------------------------------------------------------------------

  const sel = cellSel && bounds(cellSel);
  const cellEl = (p: CellPos) => gridRef.current?.querySelector<HTMLElement>(`td[data-cell="${p.r}:${p.c}"]`);
  const focusGrid = () => gridRef.current?.focus({ preventScroll: true });

  /** Zelle bearbeiten: Eingabefeld fokussieren, Auswahlmenü öffnen bzw. Checkbox umschalten. */
  function editCell(p: CellPos) {
    const td = cellEl(p);
    const field = sheet.fields[p.c];
    const row = rows[p.r];
    if (!editable || !td || !field || !row) return;
    if (field.type === 'checkbox') return setCell(row.id, field.id, row.cells[field.id] !== true);
    const choice = td.querySelector<HTMLButtonElement>('button.b-cell-choice');
    if (choice) return choice.click();
    const input = td.querySelector('input');
    if (!input) return;
    input.focus();
    try {
      input.setSelectionRange(input.value.length, input.value.length);
    } catch {
      // Datumsfelder kennen keine Textauswahl.
    }
  }

  function selectCells(range: CellRange) {
    setCellSel(range);
    requestAnimationFrame(() => cellEl(range.focus)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
  }

  function rangeUpdates(fn: (field: Field, rowIndex: number, colIndex: number) => CellValue | undefined) {
    if (!sel) return [];
    const updates: { rowId: string; fieldId: string; value: CellValue }[] = [];
    for (let r = sel.r0; r <= sel.r1; r++)
      for (let c = sel.c0; c <= sel.c1; c++) {
        const row = rows[r];
        const field = sheet.fields[c];
        const value = row && field ? fn(field, r - sel.r0, c - sel.c0) : undefined;
        if (value !== undefined) updates.push({ rowId: row.id, fieldId: field.id, value });
      }
    return updates;
  }

  function onCellMouseDown(e: MouseEvent<HTMLTableCellElement>, p: CellPos) {
    if (e.button !== 0) return;
    const td = e.currentTarget;
    const t = e.target as Element;
    // Checkbox und Link-Symbol bleiben direkt bedienbar.
    if (t.closest('input[type="checkbox"], a')) return setCellSel(single(p));
    // In der Zelle wird gerade bearbeitet: Cursor setzen, Text markieren …
    if (td.contains(document.activeElement)) return;
    const isOnlySelected = sel && sel.r0 === p.r && sel.r1 === p.r && sel.c0 === p.c && sel.c1 === p.c;
    // Zweiter Klick auf die markierte Zelle: bearbeiten (Standardverhalten).
    if (isOnlySelected && !e.shiftKey && editable) return;
    e.preventDefault();
    suppressClickRef.current = true;
    draggingRef.current = true;
    setCellSel(e.shiftKey && cellSel ? { anchor: cellSel.anchor, focus: p } : single(p));
    focusGrid();
  }

  function onCellMouseEnter(p: CellPos) {
    if (draggingRef.current) setCellSel((cur) => cur && { anchor: cur.anchor, focus: p });
  }

  function onGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    const t = e.target as HTMLElement;
    if (!grid) return;
    if (t !== grid) {
      // Beim Bearbeiten: Escape bzw. Enter kehrt zur Zellauswahl zurück.
      if (!grid.contains(t) || !t.closest('td[data-cell]')) return;
      if (e.key === 'Escape' || (e.key === 'Enter' && t.tagName === 'INPUT')) {
        e.preventDefault();
        focusGrid();
      }
      return;
    }
    if (!cellSel) return;
    const maxR = rows.length - 1;
    const maxC = sheet.fields.length - 1;
    const { focus } = cellSel;
    const arrow = arrows[e.key];
    if (arrow) {
      e.preventDefault();
      const next = { r: clamp(focus.r + arrow[0], maxR), c: clamp(focus.c + arrow[1], maxC) };
      selectCells(e.shiftKey ? { anchor: cellSel.anchor, focus: next } : single(next));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const i = clamp(focus.r * (maxC + 1) + focus.c + (e.shiftKey ? -1 : 1), (maxR + 1) * (maxC + 1) - 1);
      selectCells(single({ r: Math.floor(i / (maxC + 1)), c: i % (maxC + 1) }));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setCellSel(single(focus));
      editCell(focus);
    } else if (e.key === 'Escape') {
      // Zurück eine Ebene: den ganzen Block markieren (ohne dass Escape die Block-Auswahl gleich wieder aufhebt).
      e.preventDefault();
      e.stopPropagation();
      setCellSel(null);
      const pos = getPos();
      if (typeof pos === 'number') setBlockSelection(editor, [pos]);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && editable) {
      e.preventDefault();
      e.stopPropagation();
      setCells(rangeUpdates(() => null));
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && editable) {
      // Lostippen ersetzt den Inhalt der Zelle, wie in einer Tabellenkalkulation: Das Feld bekommt
      // noch während des Tastendrucks den Fokus, das Zeichen ersetzt dann den markierten Inhalt.
      const field = sheet.fields[focus.c];
      if (!['text', 'number', 'url', 'email', 'phone'].includes(field.type)) return;
      const input = cellEl(focus)?.querySelector('input');
      if (!input) return;
      setCellSel(single(focus));
      input.focus();
      input.select();
    }
  }

  /** ⌘C / ⌘X: markierte Zellen als Tab-getrennten Text (passt in Tabellenkalkulationen). */
  function onGridCopy(e: ClipboardEvent<HTMLDivElement>) {
    if (e.target !== gridRef.current || !sel) return;
    const text = rows
      .slice(sel.r0, sel.r1 + 1)
      .map((row) =>
        sheet.fields
          .slice(sel.c0, sel.c1 + 1)
          .map((f) => cellText(f, row.cells[f.id] ?? null).replace(/[\t\n]/g, ' '))
          .join('\t'),
      )
      .join('\n');
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
    if (e.type === 'cut' && editable) setCells(rangeUpdates(() => null));
  }

  /** ⌘V: Tab-getrennten Text ab der markierten Zelle einfügen; ein einzelner Wert füllt die ganze Auswahl. */
  function onGridPaste(e: ClipboardEvent<HTMLDivElement>) {
    if (e.target !== gridRef.current || !cellSel || !sel || !editable) return;
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    const table = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((line) => line.split('\t'));
    const one = table.length === 1 && table[0].length === 1;
    const r1 = one ? sel.r1 : clamp(sel.r0 + table.length - 1, rows.length - 1);
    const c1 = one ? sel.c1 : clamp(sel.c0 + Math.max(...table.map((l) => l.length)) - 1, sheet.fields.length - 1);
    const range = { anchor: { r: sel.r0, c: sel.c0 }, focus: { r: r1, c: c1 } };
    const b = bounds(range);
    const cellRaw = (r: number, c: number) => (one ? table[0][0] : table[r - b.r0]?.[c - b.c0]);
    // Unbekannte Werte in Auswahlfeldern werden als neue Optionen angelegt.
    const fields = sheet.fields.map((f, c) => {
      if ((f.type !== 'select' && f.type !== 'multiselect') || c < b.c0 || c > b.c1) return f;
      const options = [...(f.options ?? [])];
      for (let r = b.r0; r <= b.r1; r++) {
        const raw = cellRaw(r, c) ?? '';
        for (const label of (f.type === 'multiselect' ? raw.split(',') : [raw]).map((l) => l.trim()).filter(Boolean))
          if (!options.some((o) => o.label.toLowerCase() === label.toLowerCase())) options.push({ id: uid(), label, color: nextOptionColor(options) });
      }
      return { ...f, options };
    });
    const cells = new Map<string, Record<string, CellValue>>();
    for (let r = b.r0; r <= b.r1; r++)
      for (let c = b.c0; c <= b.c1; c++) {
        const raw = cellRaw(r, c);
        if (raw === undefined) continue;
        const values = cells.get(rows[r].id) ?? {};
        values[fields[c].id] = parseCell(fields[c], raw);
        cells.set(rows[r].id, values);
      }
    updateSheet((s) => ({ ...s, fields, rows: s.rows.map((row) => (cells.has(row.id) ? { ...row, cells: { ...row.cells, ...cells.get(row.id) } } : row)) }));
    setCellSel(range);
  }

  /** Klassen für Markierungsfläche und -rahmen (nur die Außenkanten des Rechtecks). */
  function cellSelClass(r: number, c: number) {
    if (!sel || r < sel.r0 || r > sel.r1 || c < sel.c0 || c > sel.c1) return '';
    return ` is-sel${r === sel.r0 ? ' sel-t' : ''}${r === sel.r1 ? ' sel-b' : ''}${c === sel.c0 ? ' sel-l' : ''}${c === sel.c1 ? ' sel-r' : ''}`;
  }
  const menuField = menu && sheet.fields.find((f) => f.id === menu.fieldId);
  const menuIndex = menuField ? sheet.fields.indexOf(menuField) : -1;

  return (
    <NodeViewWrapper className={`b-block b-coll${checkedRows.length ? ' has-checked' : ''}`} data-interactive="" data-select-bg="">
      <div contentEditable={false}>
        {editable ? (
          <input className="b-coll-title" value={data.title} placeholder="Sammlung" onChange={(e) => save({ ...data, title: e.target.value })} />
        ) : (
          <h3 className="b-coll-title">{data.title || 'Sammlung'}</h3>
        )}

        <div className="b-coll-tabs" role="tablist" aria-label="Tabellenblätter">
          {data.sheets.map((s) =>
            renaming === s.id && editable ? (
              <input
                key={s.id}
                autoFocus
                className="b-coll-tab-input"
                defaultValue={s.name}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== s.name) save({ ...data, sheets: data.sheets.map((x) => (x.id === s.id ? { ...x, name } : x)) });
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') setRenaming(null);
                }}
              />
            ) : (
              <span key={s.id} className={`b-coll-tab${s.id === sheet.id ? ' active' : ''}`}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={s.id === sheet.id}
                  onClick={() => selectSheet(s.id)}
                  onDoubleClick={() => editable && setRenaming(s.id)}
                  title={editable ? 'Doppelklick zum Umbenennen' : undefined}
                >
                  {s.name}
                </button>
                {editable && s.id === sheet.id && data.sheets.length > 1 && (
                  <button type="button" className="b-coll-tab-del" aria-label={`${s.name} löschen`} onClick={() => deleteSheet(s.id)}>
                    <Icon name="x" />
                  </button>
                )}
              </span>
            ),
          )}
          {editable && (
            <button type="button" className="b-coll-tab-add" aria-label="Tabellenblatt hinzufügen" title="Tabellenblatt hinzufügen" onClick={addSheet}>
              <Icon name="plus" />
            </button>
          )}
        </div>

        <div
          ref={gridRef}
          className="b-coll-scroll"
          data-no-select-bg=""
          tabIndex={-1}
          onKeyDown={onGridKeyDown}
          onCopy={onGridCopy}
          onCut={onGridCopy}
          onPaste={onGridPaste}
        >
          <table className="b-coll-table">
            <thead>
              <tr>
                <th className="b-coll-num">
                  <Icon name="hash" />
                  {editable && rows.length > 0 && (
                    <label className="b-coll-rowcheck" title={allChecked ? 'Auswahl aufheben' : 'Alle auswählen'}>
                      <input
                        type="checkbox"
                        aria-label="Alle Zeilen auswählen"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = checkedRows.length > 0 && !allChecked;
                        }}
                        onChange={() => setChecked(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
                      />
                    </label>
                  )}
                </th>
                {sheet.fields.map((f) => (
                  <th key={f.id} data-field={f.id}>
                    {editable ? (
                      <button
                        type="button"
                        className={`b-coll-head${menu?.fieldId === f.id ? ' is-open' : ''}`}
                        onClick={(e) => {
                          const th = e.currentTarget.closest('th') as HTMLElement;
                          setMenu((m) => (m?.fieldId === f.id ? null : { fieldId: f.id, anchor: th, edit: false }));
                        }}
                      >
                        <Icon name={fieldIcon(f.type)} className="b-coll-head-icon" />
                        <span>{f.name}</span>
                        {sheet.sort?.fieldId === f.id && <Icon name={sheet.sort.dir === 'asc' ? 'arrowDown' : 'arrowUp'} className="b-coll-head-sort" />}
                        <Icon name="chevron" className="b-coll-head-chevron" />
                      </button>
                    ) : (
                      <span className="b-coll-head">
                        <Icon name={fieldIcon(f.type)} className="b-coll-head-icon" />
                        <span>{f.name}</span>
                      </span>
                    )}
                  </th>
                ))}
                {editable && (
                  <th className="b-coll-addcol">
                    <button type="button" aria-label="Feld hinzufügen" title="Feld hinzufügen" onClick={(e) => addField(e.currentTarget)}>
                      <Icon name="plus" />
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className={checked.has(row.id) ? 'is-checked' : undefined}>
                  <td className="b-coll-num">
                    <span>{i + 1}</span>
                    {editable && (
                      <label className="b-coll-rowcheck">
                        <input type="checkbox" aria-label={`Zeile ${i + 1} auswählen`} checked={checked.has(row.id)} onChange={() => toggleRow(row.id)} />
                      </label>
                    )}
                  </td>
                  {sheet.fields.map((f, fi) => (
                    <td
                      key={f.id}
                      className={`b-coll-cell is-${f.type}${cellSelClass(i, fi)}`}
                      data-cell={`${i}:${fi}`}
                      onMouseDown={(e) => onCellMouseDown(e, { r: i, c: fi })}
                      onMouseEnter={() => onCellMouseEnter({ r: i, c: fi })}
                      onFocus={(e) => e.target !== e.currentTarget && setCellSel(single({ r: i, c: fi }))}
                      onClickCapture={(e) => {
                        if (!suppressClickRef.current) return;
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <CollectionCell
                        field={f}
                        value={row.cells[f.id] ?? null}
                        editable={editable}
                        primary={fi === 0}
                        onChange={(v) => setCell(row.id, f.id, v)}
                        onFieldChange={updateField}
                      />
                    </td>
                  ))}
                  {editable && <td className="b-coll-addcol" />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editable && (
          <div className="b-coll-foot">
            <button type="button" className="b-coll-addrow" onClick={() => updateSheet((s) => ({ ...s, rows: [...s.rows, { id: uid(), cells: {} }] }))}>
              <Icon name="plus" /> Neue Zeile
            </button>
            {checkedRows.length > 0 && (
              <div className="b-coll-bulk">
                <span>
                  {checkedRows.length} {checkedRows.length === 1 ? 'Zeile' : 'Zeilen'} ausgewählt
                </span>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => {
                    updateSheet((s) => ({ ...s, rows: s.rows.filter((r) => !checked.has(r.id)) }));
                    setChecked(new Set());
                  }}
                >
                  <Icon name="trash" /> Löschen
                </button>
                <button type="button" onClick={() => setChecked(new Set())}>
                  Aufheben
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {menu && menuField && (
        <Popover anchor={menu.anchor} onClose={() => setMenu(null)} className="b-fieldmenu">
          <FieldMenu
            key={`${menuField.id}-${menu.edit}`}
            field={menuField}
            startInEdit={menu.edit}
            sortDir={sheet.sort?.fieldId === menuField.id ? sheet.sort.dir : null}
            canDelete={sheet.fields.length > 1}
            canMoveLeft={menuIndex > 0}
            canMoveRight={menuIndex < sheet.fields.length - 1}
            onSort={(dir) => updateSheet((s) => ({ ...s, sort: dir ? { fieldId: menuField.id, dir } : null }))}
            onUpdate={updateField}
            onChangeType={(type) => updateSheet((s) => changeFieldType(s, menuField.id, type))}
            onMove={(dir) =>
              updateSheet((s) => {
                const fields = [...s.fields];
                const j = menuIndex + dir;
                [fields[menuIndex], fields[j]] = [fields[j], fields[menuIndex]];
                return { ...s, fields };
              })
            }
            onDelete={() =>
              updateSheet((s) => ({
                ...s,
                fields: s.fields.filter((f) => f.id !== menuField.id),
                rows: s.rows.map((r) => {
                  const { [menuField.id]: _removed, ...cells } = r.cells;
                  return { ...r, cells };
                }),
                sort: s.sort?.fieldId === menuField.id ? null : s.sort,
              }))
            }
            onClose={() => setMenu(null)}
          />
        </Popover>
      )}
    </NodeViewWrapper>
  );
}
