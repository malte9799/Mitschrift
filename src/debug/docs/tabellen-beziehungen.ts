import type { DebugDoc } from '../debugDocs';
import { newSheet, uid, type CollectionData, type Field } from '@/blocks/collection/model';

const t = (text: string) => ({ type: 'text', text });
const h = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [t(text)] });
const p = (text: string) => ({ type: 'paragraph', content: text ? [t(text)] : [] });

// Sammlung „Kunden“: Titel, E-Mail.
const kundenId = uid();
const kundenSheet = newSheet('Kunden');
kundenSheet.rows = [
  { id: uid(), cells: {} },
  { id: uid(), cells: {} },
];
const kundenTitleField = kundenSheet.fields[0];
kundenSheet.fields.push({ id: uid(), name: 'E-Mail', type: 'email' } satisfies Field);
kundenSheet.rows[0].cells[kundenTitleField.id] = 'Anna Beispiel';
kundenSheet.rows[1].cells[kundenTitleField.id] = 'Ben Muster';

const kunden: CollectionData = { id: kundenId, title: 'Kunden', sheets: [kundenSheet] };

// Sammlung „Bestellungen“: Titel, Kunde (Verknüpfung → Kunden), Betrag.
const bestellungenId = uid();
const bestellungenSheet = newSheet('Bestellungen');
const kundeField: Field = { id: uid(), name: 'Kunde', type: 'relation', relation: { collectionId: kundenId, sheetId: kundenSheet.id }, relationMulti: false };
const betragField: Field = { id: uid(), name: 'Betrag', type: 'number' };
bestellungenSheet.fields.push(kundeField, betragField);
bestellungenSheet.rows = [
  { id: uid(), cells: {} },
  { id: uid(), cells: {} },
];
const bestellungenTitleField = bestellungenSheet.fields[0];
bestellungenSheet.rows[0].cells[bestellungenTitleField.id] = 'Bestellung #1';
bestellungenSheet.rows[0].cells[kundeField.id] = kundenSheet.rows[0].id;
bestellungenSheet.rows[0].cells[betragField.id] = 42.5;
bestellungenSheet.rows[1].cells[bestellungenTitleField.id] = 'Bestellung #2';
bestellungenSheet.rows[1].cells[kundeField.id] = kundenSheet.rows[1].id;
bestellungenSheet.rows[1].cells[betragField.id] = 17;

const bestellungen: CollectionData = { id: bestellungenId, title: 'Bestellungen', sheets: [bestellungenSheet] };

/** Zwei verknüpfte Sammlungen (Fremdschlüssel) – zum Testen von Verknüpfungsfeld und Beziehungsdiagramm. */
const doc: DebugDoc = {
  key: 'tabellen-beziehungen',
  title: 'Debug: Tabellen-Beziehungen & ER-Diagramm',
  doc: {
    type: 'doc',
    content: [
      h('Kunden'),
      { type: 'collection', attrs: { data: kunden } },
      h('Bestellungen'),
      p('Das Feld „Kunde“ ist eine Verknüpfung zur Sammlung „Kunden“. Über „Diagramm“ in der Werkzeugleiste der Sammlung entsteht ein Mermaid-ER-Diagramm aller Sammlungen im Dokument.'),
      { type: 'collection', attrs: { data: bestellungen } },
      p(''),
    ],
  },
};
export default doc;
