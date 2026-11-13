import type { HandbuchPage } from '@/app/handbuch/registry';
import { h1, note, p, pageLink, t, tip } from '@/app/handbuch/blocks';

const page: HandbuchPage = {
  key: 'verknuepfen',
  title: 'Verknüpfen & Graph-Ansicht',
  parent: 'main',
  doc: () => ({
    type: 'doc',
    content: [
      note(
        t('Das hier gilt für deine eigenen Notizen – dieses Handbuch selbst ist technisch keine Notiz und taucht deshalb nicht in deiner Notizliste, der Suche oder dem Graphen auf.'),
      ),

      h1('Notizen verlinken'),
      p(
        t('Tippe „'),
        t('[[', ['code']),
        t('“ in einer leeren Zeile, um eine bestehende Notiz zu suchen und zu verlinken – oder gleich eine neue anzulegen, wahlweise als '),
        t('Unterseite', ['bold']),
        t(' der aktuellen Notiz. Du kannst auch eine Notiz aus der Seitenleiste in den Text ziehen.'),
      ),
      p(
        t('Ein Link erscheint zunächst als normaler Text-Link; ein Klick öffnet die Notiz. Über das Einfügen-Menü („'),
        t('/', ['code']),
        t('“ → „Notiz als Zeile“ bzw. „Notiz als Karte“) fügst du sie stattdessen als eigenen Block ein – eine '),
        t('Zeile', ['bold']),
        t(' oder '),
        t('Karte', ['bold']),
        t(' mit Titel und Vorschau.'),
      ),
      tip(
        t('Am Ende jeder Notiz siehst du automatisch, welche Unterseiten sie hat und von welchen anderen Notizen aus auf sie verlinkt wird – ganz ohne das selbst zu pflegen.'),
      ),

      h1('Unterseiten'),
      p(
        t('Eine Notiz kann Unterseiten haben – sichtbar als Baum in der Seitenleiste, mit Pfad („Breadcrumbs“) oben in der Notiz. Neue Unterseite: das Plus neben der Notiz in der Seitenleiste, „'),
        t('Ablage → Neue Unterseite', ['bold']),
        t('“, oder beim Anlegen über „'),
        t('[[', ['code']),
        t('“.'),
      ),

      h1('Graph-Ansicht'),
      p(
        t('Die „Graph-Ansicht“ in der Seitenleiste zeigt alle deine Notizen als Punkte, verbunden durch ihre Links (durchgezogene Linie mit Pfeil) und Unterseiten-Beziehungen (gestrichelt). Zoomen, Verschieben und Anklicken funktionieren direkt im Graphen.'),
      ),
      p(t('Probier es an einer eigenen Notiz mit ein paar Unterseiten aus – so siehst du am schnellsten, wie sich Verlinkung und Hierarchie im Graphen zeigen.')),

      ...pageLink('bloecke', 'Weiter zu: Blöcke', t('Alle Blocktypen, nach Thema sortiert, mit echtem Beispiel.')),
    ],
  }),
};

export default page;
