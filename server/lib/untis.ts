import { WebUntisQR, WebUntisSecretAuth } from 'webuntis';
import { authenticator } from 'otplib';

export interface UntisLesson {
  id: number;
  /** ISO-Datum, z. B. "2026-09-18". */
  date: string;
  /** Minuten seit Mitternacht. */
  startMinutes: number;
  endMinutes: number;
  subject: string;
  teacher?: string;
  room?: string;
  code?: 'cancelled' | 'irregular';
  info?: string;
}

function untisTimeToMinutes(time: number): number {
  // WebUntis liefert Zeiten als HHMM-Zahl, z. B. 815 für 08:15.
  return Math.floor(time / 100) * 60 + (time % 100);
}

function untisDateToISO(date: number): string {
  const s = String(date);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/**
 * Baut den WebUntis-Client. Zwei Wege werden unterstützt:
 * - UNTIS_QR_URI: die komplette "untis://setschool?..."-URI aus dem QR-Code
 *   (Profil → Freigaben → Datenzugriff), enthält Schule, Server, Nutzer und
 *   ein TOTP-Secret statt eines Passworts.
 * - UNTIS_SCHOOL/UNTIS_USERNAME/UNTIS_SECRET/UNTIS_SERVER einzeln, falls die
 *   QR-URI nicht zur Hand ist.
 */
function buildClient() {
  const qrUri = process.env.UNTIS_QR_URI;
  if (qrUri) return new WebUntisQR(qrUri, 'Mitschrift', authenticator);

  const school = process.env.UNTIS_SCHOOL;
  const username = process.env.UNTIS_USERNAME;
  const secret = process.env.UNTIS_SECRET;
  const server = process.env.UNTIS_SERVER;
  if (!school || !username || !secret || !server) return undefined;
  return new WebUntisSecretAuth(school, username, secret, server, 'Mitschrift', authenticator);
}

export function untisConfigured(): boolean {
  return buildClient() !== undefined;
}

/** Teilt einen Datumsbereich in monatsweise Abschnitte – WebUntis liefert bei zu großen Spannen (oder außerhalb des Schuljahres) sonst gar kein Ergebnis statt einer leeren Liste. */
function splitIntoMonths(rangeStart: Date, rangeEnd: Date): [Date, Date][] {
  const chunks: [Date, Date][] = [];
  let cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cur <= rangeEnd) {
    const chunkEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    chunks.push([cur < rangeStart ? rangeStart : cur, chunkEnd > rangeEnd ? rangeEnd : chunkEnd]);
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return chunks;
}

/**
 * Holt den Stundenplan für einen Datumsbereich direkt von WebUntis (keine eigene Session-Wiederverwendung).
 * Fragt monatsweise ab: Für Monate außerhalb des Schuljahres (z. B. Sommerferien) liefert WebUntis manchmal
 * gar kein Ergebnis statt einer leeren Liste – das würde sonst den ganzen Abruf zum Absturz bringen, obwohl
 * die übrigen Monate echte Daten hätten.
 */
export async function fetchUntisTimetable(rangeStart: Date, rangeEnd: Date): Promise<UntisLesson[]> {
  const untis = buildClient();
  if (!untis) {
    throw new Error('UNTIS_QR_URI (oder UNTIS_SCHOOL/UNTIS_USERNAME/UNTIS_SECRET/UNTIS_SERVER) fehlt in .env');
  }

  await untis.login();
  try {
    const all: UntisLesson[] = [];
    for (const [chunkStart, chunkEnd] of splitIntoMonths(rangeStart, rangeEnd)) {
      let lessons: Awaited<ReturnType<typeof untis.getOwnTimetableForRange>>;
      try {
        lessons = await untis.getOwnTimetableForRange(chunkStart, chunkEnd);
      } catch (err) {
        // Vermutlich ein Monat ohne Zeitraster (z. B. Ferien) – überspringen statt den ganzen Abruf abzubrechen.
        console.warn(`Untis: kein Ergebnis für ${chunkStart.toISOString().slice(0, 10)}–${chunkEnd.toISOString().slice(0, 10)}, überspringe:`, err instanceof Error ? err.message : err);
        continue;
      }
      all.push(
        ...lessons.map((l) => ({
          id: l.id,
          date: untisDateToISO(l.date),
          startMinutes: untisTimeToMinutes(l.startTime),
          endMinutes: untisTimeToMinutes(l.endTime),
          subject: l.su[0]?.longname || l.su[0]?.name || l.lstext || 'Unterricht',
          teacher: l.te[0]?.longname || l.te[0]?.name,
          room: l.ro[0]?.name,
          code: l.code,
          info: l.info || l.substText,
        })),
      );
    }
    return all.sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
  } finally {
    await untis.logout().catch(() => {});
  }
}
