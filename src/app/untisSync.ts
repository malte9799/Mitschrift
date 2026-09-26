import type { CalendarEvent } from '@/storage';
import { syncEvents } from './eventStore';

/** Adresse des lokalen Mitschrift-Servers (server/index.ts). Läuft nur, wenn `npm run dev` den Server mitstartet. */
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8779';

interface UntisLesson {
  id: number;
  date: string;
  startMinutes: number;
  endMinutes: number;
  subject: string;
  teacher?: string;
  room?: string;
  code?: 'cancelled' | 'irregular';
  info?: string;
}

interface TimetableResponse {
  lessons: UntisLesson[];
  configured: boolean;
  error?: string;
}

function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Ob zwei Lektionen direkt aufeinanderfolgen und als Doppelstunde zusammengehören (gleiches Fach/Lehrer/Raum/Code). */
function sameBlock(a: UntisLesson, b: UntisLesson): boolean {
  return a.date === b.date && a.endMinutes === b.startMinutes && a.subject === b.subject && a.teacher === b.teacher && a.room === b.room && a.code === b.code;
}

/** Fasst aufeinanderfolgende Stunden derselben Klasse zu Blöcken zusammen (z. B. zwei Englisch-Stunden → eine Doppelstunde). */
function mergeConsecutive(lessons: UntisLesson[]): UntisLesson[] {
  const sorted = [...lessons].sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
  const merged: UntisLesson[] = [];
  for (const l of sorted) {
    const last = merged.at(-1);
    if (last && sameBlock(last, l)) last.endMinutes = l.endMinutes;
    else merged.push({ ...l });
  }
  return merged;
}

function toEvent(l: UntisLesson): CalendarEvent {
  const bits = [l.room, l.teacher].filter(Boolean).join(' · ');
  const now = Date.now();
  return {
    id: `untis-${l.id}-${l.date}`,
    title: l.code === 'cancelled' ? `${l.subject} (entfällt)` : l.subject,
    date: l.date,
    time: hhmm(l.startMinutes),
    endTime: hhmm(l.endMinutes),
    notes: [bits, l.info].filter(Boolean).join('\n'),
    noteId: null,
    tags: [],
    source: 'untis',
    createdAt: now,
    updatedAt: now,
  };
}

export interface UntisSyncResult {
  ok: boolean;
  configured: boolean;
  count: number;
  error?: string;
}

/** Holt den Stundenplan vom lokalen Server (siehe server/) und schreibt ihn als Kalendertermine. */
export async function syncUntis(rangeStart: Date, rangeEnd: Date): Promise<UntisSyncResult> {
  const from = rangeStart.toLocaleDateString('sv-SE');
  const to = rangeEnd.toLocaleDateString('sv-SE');
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/untis/timetable?from=${from}&to=${to}`);
  } catch {
    return { ok: false, configured: false, count: 0, error: 'Server nicht erreichbar – läuft „npm run dev“ mit dem Untis-Server?' };
  }
  if (!res.ok) return { ok: false, configured: false, count: 0, error: `Server antwortete mit ${res.status}` };
  const data = (await res.json()) as TimetableResponse;
  const merged = mergeConsecutive(data.lessons);
  await syncEvents('untis', merged.map(toEvent));
  return { ok: !data.error, configured: data.configured, count: merged.length, error: data.error };
}
