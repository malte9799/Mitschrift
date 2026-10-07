import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/ui/Icon';
import { Popover } from './Popover';
import { resolveSheet, formatDate, type Collections } from './compute';
import { formatNumber } from './formula';
import { rowTitle, sortedRows, cellHref, nextOptionColor, uid, type CellValue, type Field, type SelectOption } from './model';

interface CellProps {
  field: Field;
  value: CellValue;
  editable: boolean;
  /** Erstes Feld (Titel) – etwas kräftiger dargestellt. */
  primary: boolean;
  onChange: (value: CellValue) => void;
  /** Für neu angelegte Auswahl-Optionen. */
  onFieldChange: (field: Field) => void;
  /** Alle erreichbaren Sammlungen – zum Auflösen des Zielblatts von Verknüpfungsfeldern. */
  all?: Collections;
}

/** Eine Tabellenzelle, je nach Feldtyp mit passendem Eingabeelement. */
export function CollectionCell({ field, value, editable, primary, onChange, onFieldChange, all }: CellProps) {
  switch (field.type) {
    case 'formula':
    case 'rollup':
      // Berechnet: `value` ist bereits das Ergebnis.
      if (typeof value === 'boolean') return <span className="b-cell-text is-computed">{value ? '✓' : '–'}</span>;
      return <span className={`b-cell-text is-computed${typeof value === 'number' ? ' is-number' : ''}`}>{typeof value === 'number' ? formatNumber(value) : ((value as string) ?? '')}</span>;
    case 'checkbox':
      return (
        <label className="b-cell-check">
          <input type="checkbox" checked={value === true} disabled={!editable} onChange={(e) => onChange(e.target.checked)} />
        </label>
      );
    case 'number':
      return editable ? <NumberInput value={typeof value === 'number' ? value : null} onChange={onChange} /> : <span className="b-cell-text is-number">{typeof value === 'number' ? value.toLocaleString('de-DE') : ''}</span>;
    case 'date':
      return editable ? (
        <input type="date" className={`b-cell-input b-cell-date${value ? '' : ' is-empty'}`} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />
      ) : (
        <span className="b-cell-text">{value ? formatDate(value as string) : ''}</span>
      );
    case 'url':
    case 'email':
    case 'phone': {
      const text = (value as string) ?? '';
      const href = cellHref(field.type, text);
      const icon = field.type === 'url' ? 'external' : field.type === 'email' ? 'mail' : 'phone';
      if (!editable) {
        return href ? (
          <a className="b-cell-link" href={href} target={field.type === 'url' ? '_blank' : undefined} rel="noreferrer">
            {text}
          </a>
        ) : null;
      }
      return (
        <span className="b-cell-linkwrap">
          <input
            className="b-cell-input"
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={text}
            placeholder=""
            onChange={(e) => onChange(e.target.value || null)}
          />
          {href && (
            <a className="b-cell-open" href={href} target={field.type === 'url' ? '_blank' : undefined} rel="noreferrer" title="Öffnen" aria-label="Öffnen">
              <Icon name={icon} />
            </a>
          )}
        </span>
      );
    }
    case 'select':
    case 'multiselect':
      return <ChoiceCell field={field} value={value} editable={editable} onChange={onChange} onFieldChange={onFieldChange} />;
    case 'relation':
      return <RelationCell field={field} value={value} editable={editable} onChange={onChange} all={all} />;
    default:
      return editable ? (
        <input className={`b-cell-input${primary ? ' is-primary' : ''}`} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />
      ) : (
        <span className={`b-cell-text${primary ? ' is-primary' : ''}`}>{(value as string) ?? ''}</span>
      );
  }
}

/** Zahl als Entwurf tippen (auch „1,“), gespeichert wird beim Verlassen bzw. Enter. */
function NumberInput({ value, onChange }: { value: number | null; onChange: (v: CellValue) => void }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value).replace('.', ','));
  useEffect(() => setDraft(value === null ? '' : String(value).replace('.', ',')), [value]);
  const commit = () => {
    const t = draft.trim();
    if (!t) return onChange(null);
    const n = Number(t.replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(n)) onChange(n);
    else setDraft(value === null ? '' : String(value).replace('.', ','));
  };
  return (
    <input
      className="b-cell-input is-number"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
    />
  );
}

export function OptionChip({ option }: { option: SelectOption }) {
  return (
    <span className="b-chip" data-color={option.color}>
      {option.label}
    </span>
  );
}

function ChoiceCell({ field, value, editable, onChange, onFieldChange }: Omit<CellProps, 'primary'>) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const multi = field.type === 'multiselect';
  const selectedIds = multi ? ((value as string[] | null) ?? []) : value ? [value as string] : [];
  const options = field.options ?? [];
  const chosen = selectedIds.map((id) => options.find((o) => o.id === id)).filter((o): o is SelectOption => !!o);

  const chips = chosen.map((o) => <OptionChip key={o.id} option={o} />);
  if (!editable) return <span className="b-cell-chips">{chips}</span>;

  function toggle(id: string) {
    if (multi) onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    else {
      onChange(selectedIds[0] === id ? null : id);
      setOpen(false);
    }
  }

  function create(label: string) {
    const option: SelectOption = { id: uid(), label, color: nextOptionColor(options) };
    onFieldChange({ ...field, options: [...options, option] });
    if (multi) onChange([...selectedIds, option.id]);
    else {
      onChange(option.id);
      setOpen(false);
    }
  }

  return (
    <>
      <button ref={anchor} type="button" className={`b-cell-choice${open ? ' is-open' : ''}`} onClick={() => setOpen((o) => !o)}>
        <span className="b-cell-chips">{chips}</span>
      </button>
      {open && anchor.current && (
        <Popover anchor={anchor.current} onClose={() => setOpen(false)} className="b-optpick">
          <OptionPicker options={options} selected={selectedIds} onToggle={toggle} onCreate={create} />
        </Popover>
      )}
    </>
  );
}

/** Chip für eine verknüpfte Zeile (Titel aus dem Zielblatt). */
function RelationChip({ label }: { label: string }) {
  return (
    <span className="b-chip b-chip-relation">
      <Icon name="fieldRelation" />
      {label}
    </span>
  );
}

function RelationCell({ field, value, editable, onChange, all }: Omit<CellProps, 'primary' | 'onFieldChange'>) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const target = field.relation;
  const targetSheet = all && target ? resolveSheet(all, target.collectionId, target.sheetId) : undefined;
  const multi = !!field.relationMulti;
  const selectedIds = multi ? ((value as string[] | null) ?? []) : value ? [value as string] : [];
  const targetRows = targetSheet ? sortedRows(targetSheet) : [];
  const titleOf = (rowId: string) => {
    const row = targetRows.find((r) => r.id === rowId);
    return row ? rowTitle(targetSheet!, row) : null;
  };
  const chips = selectedIds.map((id) => titleOf(id)).filter((s): s is string => !!s);

  if (!target) return <span className="b-cell-text is-muted">Kein Zielblatt gewählt</span>;

  if (!editable) return <span className="b-cell-chips">{chips.map((label, i) => <RelationChip key={selectedIds[i]} label={label} />)}</span>;

  function toggle(id: string) {
    if (multi) onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    else {
      onChange(selectedIds[0] === id ? null : id);
      setOpen(false);
    }
  }

  return (
    <>
      <button ref={anchor} type="button" className={`b-cell-choice${open ? ' is-open' : ''}`} onClick={() => setOpen((o) => !o)}>
        <span className="b-cell-chips">{chips.length ? chips.map((label, i) => <RelationChip key={selectedIds[i]} label={label} />) : <span className="b-cell-placeholder">Zeile wählen …</span>}</span>
      </button>
      {open && anchor.current && (
        <Popover anchor={anchor.current} onClose={() => setOpen(false)} className="b-optpick">
          <RelationPicker rows={targetRows.map((r) => ({ id: r.id, label: rowTitle(targetSheet!, r) }))} selected={selectedIds} onToggle={toggle} />
        </Popover>
      )}
    </>
  );
}

function RelationPicker({ rows, selected, onToggle }: { rows: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => r.label.toLowerCase().includes(q));

  return (
    <>
      <input autoFocus className="b-pop-input" value={query} placeholder="Zeile suchen …" onChange={(e) => setQuery(e.target.value)} />
      <div className="b-pop-list">
        {filtered.map((r) => (
          <button key={r.id} type="button" className="b-pop-item" onClick={() => onToggle(r.id)}>
            <RelationChip label={r.label} />
            {selected.includes(r.id) && <Icon name="check" className="b-pop-check" />}
          </button>
        ))}
        {filtered.length === 0 && <p className="b-pop-empty">{rows.length === 0 ? 'Zielblatt hat noch keine Zeilen.' : 'Keine Treffer.'}</p>}
      </div>
    </>
  );
}

function OptionPicker({
  options,
  selected,
  onToggle,
  onCreate,
}: {
  options: SelectOption[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreate: (label: string) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim();
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const canCreate = q.length > 0 && !options.some((o) => o.label.toLowerCase() === q.toLowerCase());

  return (
    <>
      <input
        autoFocus
        className="b-pop-input"
        value={query}
        placeholder="Option suchen oder anlegen …"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          if (filtered[0] && !canCreate) onToggle(filtered[0].id);
          else if (canCreate) {
            onCreate(q);
            setQuery('');
          }
        }}
      />
      <div className="b-pop-list">
        {filtered.map((o) => (
          <button key={o.id} type="button" className="b-pop-item" onClick={() => onToggle(o.id)}>
            <OptionChip option={o} />
            {selected.includes(o.id) && <Icon name="check" className="b-pop-check" />}
          </button>
        ))}
        {canCreate && (
          <button
            type="button"
            className="b-pop-item"
            onClick={() => {
              onCreate(q);
              setQuery('');
            }}
          >
            <Icon name="plus" className="b-pop-icon" /> „{q}“ anlegen
          </button>
        )}
        {!canCreate && filtered.length === 0 && <p className="b-pop-empty">Noch keine Optionen – Namen eintippen.</p>}
      </div>
    </>
  );
}
