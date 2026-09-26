import { Router } from 'express';
import { fetchUntisTimetable, untisConfigured } from '../lib/untis.js';

export const untisRouter = Router();

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Stundenplan für einen Zeitraum (?from=YYYY-MM-DD&to=YYYY-MM-DD). Holt live von WebUntis;
 * das Zwischenspeichern übernimmt der Browser (Mitschrift schreibt die Stunden als Kalendertermine).
 */
untisRouter.get('/timetable', async (req, res) => {
  const from = typeof req.query.from === 'string' ? req.query.from : isoDate(new Date());
  const toDefault = new Date();
  toDefault.setDate(toDefault.getDate() + 14);
  const to = typeof req.query.to === 'string' ? req.query.to : isoDate(toDefault);

  if (!untisConfigured()) {
    res.json({ lessons: [], configured: false, error: 'Untis ist nicht eingerichtet (.env fehlt).' });
    return;
  }

  try {
    const rangeStart = new Date(`${from}T00:00:00`);
    const rangeEnd = new Date(`${to}T00:00:00`);
    const lessons = await fetchUntisTimetable(rangeStart, rangeEnd);
    res.json({ lessons, configured: true });
  } catch (err) {
    console.error('Untis-Abruf fehlgeschlagen:', err);
    res.status(502).json({ lessons: [], configured: true, error: err instanceof Error ? err.message : 'Unbekannter Fehler' });
  }
});
