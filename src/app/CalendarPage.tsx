import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { TagChip } from '@/ui/TagChip';
import { useTags } from '@/hooks/useTags';
import { useNotes } from '@/hooks/useNotes';
import type { CalendarEvent } from '@/storage';
import type { LayoutContext } from './AppLayout';
import { useEvents, openEventDialog } from './eventStore';
import { noteHref } from './noteLinks';
import { INTEGRATIONS, isSourceVisible, toggleSource, useVisibleSources } from './integrations';
import { plural } from '@/ui/plural';

const SOURCE_LABEL: Record<string, string> = { untis: 'Untis', itslearning: 'itslearning' };

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function toISO(d: Date) {
  return d.toLocaleDateString('sv-SE');
}

/** Alle Tage der Monatsansicht: voller Kalenderraster inkl. Rand-Tage aus Nachbarmonaten. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // Montag = 0 … Sonntag = 6
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/** Kalender: Monatsübersicht mit Terminen, plus Detailliste für den gewählten Tag. */
export function CalendarPage() {
  const events = useEvents();
  const tags = useTags();
  const notes = useNotes();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useOutletContext<LayoutContext>();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(() => toISO(today));
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const visibleSources = useVisibleSources();

  useEffect(() => {
    document.title = 'Kalender – Mitschrift';
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events ?? []) {
      if (!visibleSources.has(e.source)) continue;
      if (tagFilter && !e.tags.includes(tagFilter)) continue;
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [events, tagFilter, visibleSources]);

  const days = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const tagById = new Map((tags ?? []).map((t) => [t.id, t]));
  const notesById = new Map((notes ?? []).map((n) => [n.id, n]));
  const todayISO = toISO(today);
  const selectedEvents = byDate.get(selected) ?? [];

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  return (
    <div className="cal-screen">
      <header className="note-bar graph-bar">
        <div className="note-bar-left">
          <button type="button" className="icon-btn" onClick={toggleSidebar} aria-label={sidebarOpen ? 'Seitenleiste ausblenden' : 'Seitenleiste einblenden'}>
            <Icon name="menu" />
          </button>
          <h1 className="graph-title">Kalender</h1>
          {events && <span className="graph-stats">{plural(events.filter((e) => visibleSources.has(e.source)).length, 'Termin', 'Termine')}</span>}
        </div>
      </header>

      <main className="cal-page">
        <div className="cal-toolbar">
          <div className="cal-nav">
            <button type="button" className="icon-btn" aria-label="Vorheriger Monat" onClick={() => shiftMonth(-1)}>
              <Icon name="arrowLeft" />
            </button>
            <h2 className="cal-month">{cursor.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</h2>
            <button type="button" className="icon-btn" aria-label="Nächster Monat" onClick={() => shiftMonth(1)}>
              <Icon name="arrowRight" />
            </button>
            <button
              type="button"
              className="b-btn"
              onClick={() => {
                setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelected(todayISO);
              }}
            >
              Heute
            </button>
          </div>
          <button type="button" className="b-btn b-btn-primary" onClick={() => openEventDialog({ date: selected })}>
            <Icon name="plus" /> Termin
          </button>
        </div>

        <div className="cal-integrations" role="group" aria-label="Integrationen ein-/ausblenden">
          {INTEGRATIONS.map((i) => (
            <button
              key={i.source}
              type="button"
              className={`cal-integration${isSourceVisible(i.source) ? ' is-on' : ''}`}
              title={i.hint}
              onClick={() => toggleSource(i.source)}
            >
              <span className={`cal-integration-dot is-${i.source}`} aria-hidden="true" />
              {i.label}
              {i.comingSoon && <span className="cal-integration-soon">bald</span>}
            </button>
          ))}
        </div>

        {tags && tags.length > 0 && (
          <div className="gl-tagfilter cal-tagfilter" role="group" aria-label="Nach Tag filtern">
            {tags.map((t) => (
              <TagChip key={t.id} tag={t} active={tagFilter === t.id} onClick={() => setTagFilter(tagFilter === t.id ? null : t.id)} />
            ))}
          </div>
        )}

        <div className="cal-layout">
          <div className="cal-grid">
            <div className="cal-weekdays">
              {WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="cal-days">
              {days.map((d) => {
                const iso = toISO(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const dayEvents = byDate.get(iso) ?? [];
                return (
                  <button
                    type="button"
                    key={iso}
                    className={`cal-day${inMonth ? '' : ' is-outside'}${iso === todayISO ? ' is-today' : ''}${iso === selected ? ' is-selected' : ''}`}
                    onClick={() => setSelected(iso)}
                    onDoubleClick={() => openEventDialog({ date: iso })}
                  >
                    <span className="cal-day-num">{d.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span className="cal-day-dots" aria-hidden="true">
                        {dayEvents.slice(0, 4).map((e) => {
                          const color = e.tags.map((id) => tagById.get(id)?.color).find(Boolean);
                          return <span key={e.id} className="cal-dot" data-color={color ?? 'graphite'} />;
                        })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cal-agenda">
            <h3>
              {new Date(selected).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              {selected === todayISO && <span className="cal-agenda-today"> · heute</span>}
            </h3>
            {selectedEvents.length === 0 ? (
              <p className="cal-empty">Keine Termine an diesem Tag.</p>
            ) : (
              <ul className="cal-agenda-list">
                {selectedEvents.map((e) => (
                  <li
                    key={e.id}
                    className={`cal-event is-${e.source}${e.completed ? ' is-completed' : ''}`}
                    onClick={() => openEventDialog({ id: e.id })}
                  >
                    <div className="cal-event-head">
                      {e.time && (
                        <span className="cal-event-time">
                          {e.time}
                          {e.endTime && `–${e.endTime}`}
                        </span>
                      )}
                      <span className="cal-event-title">{e.title}</span>
                      {e.source !== 'manual' && <span className="cal-event-source">{SOURCE_LABEL[e.source]}</span>}
                    </div>
                    {e.notes && <p className="cal-event-notes">{e.notes}</p>}
                    <div className="cal-event-meta">
                      {e.tags.map((id) => tagById.get(id)).map((tag) => tag && <TagChip key={tag.id} tag={tag} />)}
                      {e.noteId && notesById.has(e.noteId) && (
                        <button
                          type="button"
                          className="gl-row-note"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            navigate(noteHref(e.noteId!));
                          }}
                        >
                          <Icon name="note" /> {notesById.get(e.noteId)!.title || 'Ohne Titel'}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
