import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, h2, h3, kbd, note, noteLink, ol, p, table, tip, ul } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'kalender',
  title: 'Kalender & Aufgaben',
  parent: 'main',
  order: 90,
  section: 'Werkzeuge',
  doc: () => ({
    type: 'doc',
    content: [
      p('Klausuren, Abgaben, Referate: Der Kalender zeigt dir, was wann ansteht. Termine kannst du direkt anlegen – oder sie entstehen ganz nebenbei aus Aufgaben in deinen Notizen.'),

      h2('Der Kalender'),
      p('Du öffnest ihn über ', b('Kalender'), ' in der Seitenleiste oder mit ', kbd('⌃⌘K'), '. Er besteht aus zwei Teilen:'),
      ul(
        [b('Monatsansicht'), ' – jeder Tag mit farbigen Punkten für seine Termine (in der Farbe ihres Tags). Mit den Pfeilen blätterst du zum vorherigen oder nächsten Monat, ', b('Heute'), ' springt zurück zum aktuellen Tag.'],
        [b('Tagesliste'), ' – ein Klick auf einen Tag zeigt daneben alle seine Termine mit Uhrzeit, Tags und – falls vorhanden – der verknüpften Notiz.'],
      ),
      p('Oben siehst du, wie viele Termine insgesamt eingetragen sind. Mit den Tag-Knöpfen filterst du den Kalender, zum Beispiel auf ein einzelnes Fach.'),

      h2('Einen Termin anlegen'),
      ol(
        'Wähle im Kalender den Tag aus.',
        ['Klicke auf ', b('Termin'), '.'],
        'Fülle den Dialog aus und klicke auf Anlegen.',
      ),
      p('Schneller geht es mit einem ', b('Doppelklick'), ' auf den Tag – dann öffnet sich der Dialog sofort.'),
      table(
        ['Feld', 'Bedeutung'],
        [b('Titel'), 'Zum Beispiel „Mathe-Klausur“.'],
        [b('Datum'), 'Vorausgefüllt mit dem gewählten Tag.'],
        [b('Uhrzeit'), 'Optional – ohne Uhrzeit gilt der Termin für den ganzen Tag.'],
        [b('Beschreibung'), 'Optional: Raum, Themen, was mitzubringen ist …'],
        [b('Verknüpfte Notiz'), 'Optional: Eine Notiz, die zum Termin gehört – etwa deine Lernzettel. Sie lässt sich dann aus der Tagesliste direkt öffnen.'],
        [b('Tags'), 'Wie bei Notizen, zum Filtern und Einfärben.'],
        [b('Erledigt'), 'Beim Bearbeiten: hakt den Termin ab.'],
      ),
      p('Ein Klick auf einen Termin in der Tagesliste öffnet ihn wieder zum Bearbeiten oder Löschen.'),

      h2('Termine aus Aufgaben'),
      p('Der bequemste Weg zu einem Termin führt über eine Aufgabenliste in einer Notiz:'),
      ol(
        ['Lege eine Aufgabenliste an (', b('/aufgaben'), ' oder ', kbd('⇧⌘9'), ').'],
        ['Klicke hinter einer Aufgabe auf ', b('Fällig …'), ' und wähle ein Datum, auf Wunsch mit Uhrzeit.'],
        'Fertig: Die Aufgabe steht jetzt auch im Kalender – mit einem Verweis auf die Notiz, aus der sie stammt.',
      ),
      p('Beides bleibt verbunden: Änderst du das Datum, wandert der Termin mit. Hakst du die Aufgabe ab, wird der Termin als erledigt markiert. Entfernst du das Datum, verschwindet auch der Termin.'),
      tip('So sammelst du Hausaufgaben direkt in der Unterrichts-Mitschrift, in der sie aufgegeben wurden – und hast trotzdem alle Abgaben gemeinsam im Kalender.'),

      h3('Sammlungen mit Kalender-Ansicht'),
      p('Hat eine Sammlung ein Datumsfeld, kann sie ihre Zeilen in einer eigenen ', b('Kalender'), '-Ansicht zeigen – etwa alle Lernthemen nach „Wiederholen am“. Diese Einträge bleiben in der Sammlung und erscheinen nicht im großen Kalender. Mehr dazu in ', noteLink('bloecke-tabellen', 'Tabellen & Sammlungen'), '.'),

      h2('Integrationen'),
      p('Oben im Kalender stehen Schalter für externe Kalenderquellen. Damit lassen sich Termine aus anderen Diensten ein- und ausblenden, ohne dass sie mit deinen eigenen vermischt werden. Derzeit ist ', b('itslearning'), ' vorbereitet und als „bald“ gekennzeichnet – die Anbindung folgt später.'),
      note('Termine aus externen Quellen lassen sich in Mitschrift nur ansehen, nicht bearbeiten – sie werden beim nächsten Abgleich aus der Quelle aktualisiert.'),
    ],
  }),
};

export default page;
