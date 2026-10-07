import { useState } from 'react';
import { Icon } from '@/ui/Icon';
import { Popover } from './Popover';
import { filterOpLabel, filterOps, newFilter, opNeedsValue } from './compute';
import { fieldIconOf, isChoiceType, uid, viewTypes, type Field, type Filter, type FilterOp, type Sheet, type View, type ViewType } from './model';

interface ViewBarProps {
  sheet: Sheet;
  views: View[];
  view: View;
  editable: boolean;
  onSelect: (id: string) => void;
  /** Geänderte Ansichten speichern (Reihenfolge = Reihenfolge der Reiter). */
  onChange: (views: View[]) => void;
}

type Menu = { kind: 'view' | 'add' | 'filter' | 'sort' | 'group'; anchor: HTMLElement };

const viewIcon = (type: ViewType) => viewTypes.find((v) => v.type === type)!.icon;

/** Leiste über der Sammlung: Ansichten als Reiter, rechts Filter, Sortierung und Gruppierung der aktiven Ansicht. */
export function ViewBar({ sheet, views, view, editable, onSelect, onChange }: ViewBarProps) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const toggle = (kind: Menu['kind'], anchor: HTMLElement) => setMenu((m) => (m?.kind === kind ? null : { kind, anchor }));
  const patch = (p: Partial<View>) => onChange(views.map((v) => (v.id === view.id ? { ...v, ...p } : v)));
  const filters = (view.filters ?? []).filter((f) => sheet.fields.some((x) => x.id === f.fieldId));
  const sortField = sheet.fields.find((f) => f.id === view.sort?.fieldId);
  const groupField = sheet.fields.find((f) => f.id === view.groupBy);
  // Board gruppiert immer (Spalten), der Kalender hat stattdessen ein Datumsfeld.
  const groupLabel = view.type === 'board' ? 'Spalten' : view.type === 'calendar' ? 'Datum' : 'Gruppe';
  const groupChoices = view.type === 'calendar' ? sheet.fields.filter((f) => f.type === 'date') : view.type === 'board' ? sheet.fields.filter((f) => isChoiceType(f.type) || f.type === 'checkbox') : sheet.fields;
  const groupActive = view.type === 'calendar' ? !!view.dateFieldId : !!groupField;

  function addView(type: ViewType) {
    const label = viewTypes.find((v) => v.type === type)!.label;
    const v: View = { id: uid(), name: label, type, sort: null, filters: [] };
    onChange([...views, v]);
    onSelect(v.id);
    setMenu(null);
  }

  function setFilter(id: string, p: Partial<Filter>) {
    patch({ filters: filters.map((f) => (f.id === id ? { ...f, ...p } : f)) });
  }

  return (
    <div className="b-coll-viewbar">
      <div className="b-coll-views" role="tablist" aria-label="Ansichten">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={v.id === view.id}
            className={`b-coll-view${v.id === view.id ? ' active' : ''}`}
            title={editable && v.id === view.id ? 'Ansicht bearbeiten' : undefined}
            onClick={(e) => (v.id === view.id && editable ? toggle('view', e.currentTarget) : (onSelect(v.id), setMenu(null)))}
          >
            <Icon name={viewIcon(v.type)} /> {v.name}
          </button>
        ))}
        {editable && (
          <button type="button" className="b-coll-view is-add" aria-label="Ansicht hinzufügen" title="Ansicht hinzufügen" onClick={(e) => toggle('add', e.currentTarget)}>
            <Icon name="plus" />
          </button>
        )}
      </div>

      {editable && (
        <div className="b-coll-viewtools">
          <button type="button" className={`b-coll-tool${filters.length ? ' is-set' : ''}`} onClick={(e) => toggle('filter', e.currentTarget)}>
            <Icon name="sliders" /> Filter{filters.length ? ` · ${filters.length}` : ''}
          </button>
          <button type="button" className={`b-coll-tool${sortField ? ' is-set' : ''}`} onClick={(e) => toggle('sort', e.currentTarget)}>
            <Icon name={view.sort?.dir === 'desc' ? 'sortDesc' : 'sortAsc'} /> {sortField ? sortField.name : 'Sortieren'}
          </button>
          <button type="button" className={`b-coll-tool${groupActive ? ' is-set' : ''}`} onClick={(e) => toggle('group', e.currentTarget)}>
            <Icon name="group" /> {groupField && view.type !== 'calendar' ? groupField.name : groupLabel}
          </button>
        </div>
      )}

      {menu?.kind === 'add' && (
        <Popover anchor={menu.anchor} onClose={() => setMenu(null)}>
          <div className="b-pop-list">
            <p className="b-pop-label">Neue Ansicht</p>
            {viewTypes.map((t) => (
              <button key={t.type} type="button" className="b-pop-item" onClick={() => addView(t.type)}>
                <Icon name={t.icon} className="b-pop-icon" /> {t.label}
              </button>
            ))}
          </div>
        </Popover>
      )}

      {menu?.kind === 'view' && (
        <Popover anchor={menu.anchor} onClose={() => setMenu(null)}>
          <input className="b-pop-input" aria-label="Name der Ansicht" value={view.name} onChange={(e) => patch({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && setMenu(null)} />
          <div className="b-pop-list">
            <p className="b-pop-label">Darstellung</p>
            {viewTypes.map((t) => (
              <button key={t.type} type="button" className={`b-pop-item${t.type === view.type ? ' is-active' : ''}`} onClick={() => patch({ type: t.type })}>
                <Icon name={t.icon} className="b-pop-icon" /> {t.label}
                {t.type === view.type && <Icon name="check" className="b-pop-check" />}
              </button>
            ))}
            <hr className="b-pop-sep" />
            <button
              type="button"
              className="b-pop-item"
              onClick={() => {
                const copy = { ...view, id: uid(), name: `${view.name} (Kopie)`, filters: filters.map((f) => ({ ...f, id: uid() })) };
                onChange([...views, copy]);
                onSelect(copy.id);
                setMenu(null);
              }}
            >
              <Icon name="copy" className="b-pop-icon" /> Duplizieren
            </button>
            <button
              type="button"
              className="b-pop-item is-danger"
              disabled={views.length < 2}
              onClick={() => {
                const rest = views.filter((v) => v.id !== view.id);
                onChange(rest);
                onSelect(rest[0].id);
                setMenu(null);
              }}
            >
              <Icon name="trash" className="b-pop-icon" /> Ansicht löschen
            </button>
          </div>
        </Popover>
      )}

      {menu?.kind === 'filter' && (
        <Popover anchor={menu.anchor} onClose={() => setMenu(null)} className="b-filterpop" align="end">
          <p className="b-pop-label">Zeilen zeigen, bei denen alles zutrifft</p>
          {filters.map((f) => {
            const field = sheet.fields.find((x) => x.id === f.fieldId)!;
            return (
              <div key={f.id} className="b-filter-row">
                <select
                  className="b-field-native"
                  aria-label="Feld"
                  value={f.fieldId}
                  onChange={(e) => {
                    const next = sheet.fields.find((x) => x.id === e.target.value)!;
                    setFilter(f.id, { fieldId: next.id, op: filterOps(next)[0], value: '' });
                  }}
                >
                  {sheet.fields.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <select className="b-field-native" aria-label="Bedingung" value={f.op} onChange={(e) => setFilter(f.id, { op: e.target.value as FilterOp })}>
                  {filterOps(field).map((op) => (
                    <option key={op} value={op}>
                      {filterOpLabel(op)}
                    </option>
                  ))}
                </select>
                {opNeedsValue(f.op) && <FilterValue field={field} value={f.value ?? ''} onChange={(value) => setFilter(f.id, { value })} />}
                <button type="button" className="b-field-option-del" aria-label="Filter entfernen" onClick={() => patch({ filters: filters.filter((x) => x.id !== f.id) })}>
                  <Icon name="x" />
                </button>
              </div>
            );
          })}
          {filters.length === 0 && <p className="b-pop-empty">Noch kein Filter – alle Zeilen sind sichtbar.</p>}
          <button type="button" className="b-pop-item" onClick={() => patch({ filters: [...filters, newFilter(sheet.fields[0])] })}>
            <Icon name="plus" className="b-pop-icon" /> Filter hinzufügen
          </button>
        </Popover>
      )}

      {menu?.kind === 'sort' && (
        <Popover anchor={menu.anchor} onClose={() => setMenu(null)} align="end">
          <div className="b-pop-list">
            <p className="b-pop-label">Sortieren nach</p>
            {sheet.fields.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`b-pop-item${view.sort?.fieldId === f.id ? ' is-active' : ''}`}
                // Erneuter Klick auf das aktive Feld dreht die Richtung um.
                onClick={() => patch({ sort: { fieldId: f.id, dir: view.sort?.fieldId === f.id && view.sort.dir === 'asc' ? 'desc' : 'asc' } })}
              >
                <Icon name={fieldIconOf(f)} className="b-pop-icon" /> {f.name}
                {view.sort?.fieldId === f.id && <Icon name={view.sort.dir === 'asc' ? 'arrowDown' : 'arrowUp'} className="b-pop-check" />}
              </button>
            ))}
            {sortField && (
              <>
                <hr className="b-pop-sep" />
                <button type="button" className="b-pop-item" onClick={() => (patch({ sort: null }), setMenu(null))}>
                  <Icon name="x" className="b-pop-icon" /> Sortierung aufheben
                </button>
              </>
            )}
          </div>
        </Popover>
      )}

      {menu?.kind === 'group' && (
        <Popover anchor={menu.anchor} onClose={() => setMenu(null)} align="end">
          <div className="b-pop-list">
            <p className="b-pop-label">{view.type === 'calendar' ? 'Datumsfeld' : view.type === 'board' ? 'Spalten nach' : 'Gruppieren nach'}</p>
            {groupChoices.map((f) => {
              const active = view.type === 'calendar' ? view.dateFieldId === f.id : view.groupBy === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`b-pop-item${active ? ' is-active' : ''}`}
                  onClick={() => (patch(view.type === 'calendar' ? { dateFieldId: f.id } : { groupBy: f.id }), setMenu(null))}
                >
                  <Icon name={fieldIconOf(f)} className="b-pop-icon" /> {f.name}
                  {active && <Icon name="check" className="b-pop-check" />}
                </button>
              );
            })}
            {groupChoices.length === 0 && <p className="b-pop-empty">Kein passendes Feld in diesem Blatt.</p>}
            {groupField && view.type !== 'calendar' && view.type !== 'board' && (
              <>
                <hr className="b-pop-sep" />
                <button type="button" className="b-pop-item" onClick={() => (patch({ groupBy: null }), setMenu(null))}>
                  <Icon name="x" className="b-pop-icon" /> Gruppierung aufheben
                </button>
              </>
            )}
          </div>
        </Popover>
      )}
    </div>
  );
}

/** Vergleichswert eines Filters, passend zum Feldtyp. */
function FilterValue({ field, value, onChange }: { field: Field; value: string; onChange: (value: string) => void }) {
  if (isChoiceType(field.type))
    return (
      <select className="b-field-native" aria-label="Wert" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Option wählen …</option>
        {(field.options ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  return <input className="b-field-native" aria-label="Wert" type={field.type === 'date' ? 'date' : 'text'} inputMode={field.type === 'number' ? 'decimal' : undefined} value={value} placeholder="Wert" onChange={(e) => onChange(e.target.value)} />;
}
