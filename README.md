# Mitschrift

Schlichte Mitschriften-App im Stil von Craft – mit interaktiven, animierten Lern-Blöcken.
Entstanden aus dem Artikel-Editor des Schule-Projekts.

```bash
npm install
npm run dev      # Web http://localhost:5190
npm run build
```

Die Web-App läuft komplett statisch (local-first, IndexedDB im Browser) und wird bei jedem Push
auf `main` per GitHub-Action automatisch auf **GitHub Pages** deployt:
https://malte9799.github.io/Mitschrift/

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/app/` | Shell: Notizleiste, Notizseite, Modus-Umschalter, Theme, Willkommens-Notiz, Kalender |
| `src/editor/` | Tiptap-Editor (aus Schule portiert): Slash-Menü, Plus/Griff, Rubber-Band-Auswahl, Bubble-Toolbar, rechte Leiste |
| `src/editor/blockTypes.ts` | **Zentrale Block-Registry** – jeder einfügbare Block steht hier |
| `src/blocks/` | Interaktive Lern-Blöcke, je Ordner Node + React-View |
| `src/storage/` | `StorageAdapter`-Schnittstelle + IndexedDB-Umsetzung (local-first) |

## Kalender-Integrationen

Der Kalender (`/kalender`) kann Termine aus externen Quellen einblenden, je mit eigenem
Ein/Aus-Schalter (`src/app/integrations.ts`):

- **Untis** – vorerst entfernt (war eine kleine lokale Express-API in `server/`, Zugangsdaten
  durften nicht in den Browser). Der Quell-Typ `untis` bleibt für alte Termine im Datenschema.
- **itslearning** – nur als Platzhalter vorbereitet (Toggle + Typ vorhanden). itslearning verlangt für
  die offizielle REST-API meist eine Registrierung auf Schul-/Organisationsebene; ohne eigenen Zugang
  bliebe hier nur ein persönlicher iCal-Kalender-Export als Alternative.

## Bearbeiten vs. Lernen

Oben in der Leiste umschalten. Im Lernmodus ist der Editor schreibgeschützt, und die
Lern-Blöcke werden zu Übungen:

- **Aufklappen** – startet zugeklappt, zum Selbst-Abfragen
- **Lücke** – markierter Text (Toolbar-Symbol oder ⌘⇧L) wird zum Eingabefeld mit Prüfung
- **Karteikarten** – Stapel mit 3D-Umdrehen, „Gewusst“/„Nochmal“
- **Quiz** – Multiple Choice mit Erklärung und Auswertung

## Neuen Block hinzufügen

1. `src/blocks/<name>/` mit Tiptap-Node + React-NodeView anlegen (`useEditable(editor)` liefert den Modus)
2. In `src/blocks/index.ts` registrieren
3. Eintrag in `src/editor/blockTypes.ts` + Vorschau in `BlockThumbnails.tsx`

## Später

- **Diagramme/Visuals** – Schritte, Timeline, Stack, Balken, Zuordnen; animiert beim Scrollen (Vorlagen: `Schule/src/components/viz/*`)
- **Layout-Blöcke** – Karten, Spalten, Tabs, Seiten-in-Seiten wie Craft
- **Code & Mathe** – Syntax-Highlighting (lowlight), KaTeX, ausführbare Snippets
- **Desktop** – Tauri-Wrapper mit `StorageAdapter` für Markdown-Dateien auf Disk
- Sync, Markdown-Import/-Export, Ordner/Tags in der Oberfläche, Bilder per Drag & Paste
