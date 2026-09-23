import type { DebugDoc } from '../debugDocs';

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const code = (filename: string | null, language: string | null, text: string) => ({
  type: 'codeBlock',
  attrs: { filename, language },
  content: [{ type: 'text', text }],
});

/** Vollbild-Code-Editor: Codeblöcke als virtuelles Dateisystem (Ordner, unbenannte Datei, mehrere Sprachen). */
const doc: DebugDoc = {
  key: 'code-workspace',
  title: 'Debug: Code-Editor & Dateisystem',
  doc: {
    type: 'doc',
    content: [
      p('Doppelklick auf einen Codeblock (oder ⤢ in der Kopfzeile) öffnet den Vollbild-Editor. Jeder Codeblock ist eine Datei, „/“ im Namen erzeugt Ordner.'),
      p('Zum Testen: Datei umbenennen (Endung → Sprache), neue Datei im Ordner anlegen, Datei löschen, Tab/Shift+Tab, Enter nach „:“ oder „{“, „Im Dokument zeigen“, Lernmodus = schreibgeschützt.'),
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Python' }] },
      code('src/main.py', 'python', 'from utils import add\n\n\ndef main():\n    print(add(1, 2))  # 3\n\n\nif __name__ == "__main__":\n    main()'),
      code('src/utils.py', 'python', 'def add(a, b):\n    """Addiert zwei Zahlen."""\n    return a + b'),
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Web' }] },
      code('web/index.html', 'xml', '<!doctype html>\n<html lang="de">\n  <head>\n    <link rel="stylesheet" href="style.css" />\n  </head>\n  <body>\n    <h1>Hallo</h1>\n    <script src="app.ts"></script>\n  </body>\n</html>'),
      code('web/style.css', 'css', 'body {\n  font-family: system-ui, sans-serif;\n  color: #1c1c1e;\n}\n\nh1 {\n  font-weight: 600;\n}'),
      code('web/app.ts', 'typescript', "const title = document.querySelector<HTMLHeadingElement>('h1');\n\nif (title) {\n  title.textContent = `Hallo, ${new Date().getFullYear()}`;\n}"),
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Ohne Namen & doppelt' }] },
      p('Ohne Dateinamen → „unbenannt-1.sh“ (kursiv im Baum). Zwei Dateien mit gleichem Pfad bekommen ein „!“.'),
      code(null, 'bash', 'npm install\nnpm run dev'),
      code('README.md', 'markdown', '# Projekt\n\nErste Version.'),
      code('README.md', 'markdown', '# Projekt\n\nZweite Version mit gleichem Namen.'),
    ],
  },
};

export default doc;
