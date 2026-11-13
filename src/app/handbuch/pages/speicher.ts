import type { HandbuchPage } from '@/app/handbuch/registry';
import { b, codeBlock, h2, h3, note, noteLink, ol, p, tip, ul, warning } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'speicher',
  title: 'Speicherort & Datensicherheit',
  parent: 'main',
  order: 120,
  section: 'Daten & Einstellungen',
  doc: () => ({
    type: 'doc',
    content: [
      p('Mitschrift ist „local-first“: Deine Notizen liegen auf deinem Gerät – nicht auf einem fremden Server. Es gibt kein Konto, kein Passwort und niemanden, der mitliest. Das bedeutet aber auch: Du bist selbst dafür verantwortlich, deine Daten zu sichern. Dieses Kapitel erklärt, wo sie liegen und wie du sie schützt.'),

      h2('Zwei Speicherorte'),
      p('Unter ', b('Mitschrift → Speicherort'), ' in der Menüleiste wählst du, wo deine Notizen liegen:'),
      h3('Browser-Speicher (Standard)'),
      p('Die Notizen liegen in einer Datenbank deines Browsers. Das funktioniert überall – in Chrome, Edge, Firefox und Safari, am Computer wie auf dem Tablet – und ohne jede Einrichtung.'),
      ul(
        'Jeder Browser hat seinen eigenen Speicher. Notizen, die du in Chrome schreibst, siehst du in Safari nicht.',
        ['Löschst du die ', b('Website-Daten'), ' bzw. den ', b('Verlauf samt Cookies und Website-Daten'), ' deines Browsers, sind auch die Notizen weg.'],
      ),
      h3('Ordner auf deinem Computer'),
      p('In ', b('Chrome'), ' und ', b('Edge'), ' am Computer kannst du stattdessen einen ', b('Ordner'), ' wählen – etwa in deinem Dokumente-Ordner oder in einem Cloud-Ordner wie iCloud Drive, OneDrive oder Dropbox. Jede Notiz liegt dann als Datei in diesem Ordner:'),
      codeBlock('plaintext', 'Mein Ordner/\n├─ Zellbiologie.mitschrift.json   ← die Notiz selbst\n├─ Zellbiologie.md                ← lesbare Kopie als Markdown\n├─ Anhänge/                       ← Bilder und Dateien\n└─ .mitschrift/                   ← Tags, Glossar, Termine'),
      ul(
        [b('Die .mitschrift.json-Datei'), ' ist die eigentliche Notiz – verlustfrei mit allen Blöcken.'],
        [b('Die .md-Datei'), ' daneben ist eine lesbare Kopie, die du in anderen Programmen öffnen und durchsuchen kannst. Mitschrift liest sie nie zurück – Änderungen daran gehen also nicht in die Notiz über.'],
        [b('Änderungen von außen'), ' – etwa durch die Synchronisation deines Cloud-Ordners – erkennt Mitschrift und lädt sie automatisch.'],
      ),
      ol(
        ['Wähle ', b('Mitschrift → Speicherort → Ordner wählen …'), '.'],
        'Such einen Ordner aus und erlaube den Zugriff.',
        'Mitschrift fragt, ob deine bisherigen Notizen in den Ordner übernommen werden sollen. Enthält der Ordner schon Mitschrift-Notizen, werden beide zusammengeführt – bei gleichen Notizen gewinnt die neuere Fassung.',
      ),
      p('Mit ', b('Browser-Speicher'), ' im selben Menü trennst du den Ordner wieder. Die Dateien bleiben dort liegen, und Mitschrift fragt, ob die Notizen zurück in den Browser übernommen werden sollen.'),
      note('Der Browser merkt sich den Ordner. Nach einem Neustart kann es aber sein, dass er dich einmal fragt, ob Mitschrift weiter darauf zugreifen darf – dann einfach ', b('Zugriff erlauben'), '.'),
      tip('Ein Ordner in iCloud Drive, OneDrive oder Dropbox ist eine einfache Möglichkeit, Notizen automatisch zu sichern und auf mehreren Computern zu nutzen.'),

      h2('Dauerhafter Speicher'),
      p('Browser dürfen die Daten einer Website bei Speichermangel oder nach längerer Inaktivität löschen. Mitschrift bittet den Browser deshalb, deine Notizen ', b('dauerhaft'), ' aufzubewahren. Ob das geklappt hat, siehst du unter ', b('Mitschrift → Über Mitschrift'), ':'),
      ul(
        [b('„Speicher: dauerhaft“'), ' – alles in Ordnung, der Browser löscht die Notizen nicht von selbst.'],
        [b('„Speicher: nicht geschützt“'), ' – der Browser darf die Notizen in Ausnahmefällen löschen. Mach hier besonders regelmäßig Backups – oder installiere Mitschrift als App, dann wird der Speicher meist dauerhaft.'],
        [b('„Speicher: Ordner …“'), ' – die Notizen liegen als Dateien in deinem Ordner.'],
      ),
      p('Dort stehen außerdem der belegte Speicherplatz und das Datum deines letzten Backups.'),

      h2('So bist du auf der sicheren Seite'),
      ol(
        ['Mach regelmäßig ein ', b('Backup'), ' (', noteLink('export', 'Export, Drucken & Backup'), ') und speichere es außerhalb des Browsers.'],
        ['Nutze – wenn möglich – einen ', b('Ordner'), ' als Speicherort, idealerweise in einem Cloud-Ordner.'],
        ['Installiere Mitschrift als ', b('App'), ' (Seitenleiste unten → App installieren).'],
        ['Lösche nicht den Browser-Verlauf „mit Website-Daten“, solange deine Notizen nur im Browser liegen.'],
      ),
      warning('Privates Surfen bzw. Inkognito-Fenster eignen sich nicht für Mitschrift: Beim Schließen des Fensters löscht der Browser alles, was du dort geschrieben hast.'),

      h2('Offline arbeiten'),
      p('Nach dem ersten Öffnen funktioniert Mitschrift auch ohne Internet – im Zug, im Flugzeug oder bei schlechtem WLAN in der Schule. Nur Inhalte aus dem Netz, also Bilder per Link oder eingebettete Videos, brauchen eine Verbindung. Gibt es eine neue Version von Mitschrift, lädt sie im Hintergrund und wird übernommen, sobald du kurz nicht tippst – deine Änderungen sind dann schon gespeichert.'),
    ],
  }),
};

export default page;
