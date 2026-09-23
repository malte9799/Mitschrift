import { storage, type Note } from '@/storage';
import { toHtml } from './html';
import { collectAssets, safeFilename, textOf, untitled, type ExportDoc, type PMNode } from './model';
import { termsInText } from '@/glossary/match';
import { toRtf } from './rtf';
import { toMarkdown, toPlainText } from './text';

export type ExportFormat = 'pdf' | 'md' | 'html' | 'txt' | 'rtf';

export const exportFormats: { format: ExportFormat; label: string }[] = [
  { format: 'pdf', label: 'PDF …' },
  { format: 'md', label: 'Markdown' },
  { format: 'html', label: 'HTML' },
  { format: 'txt', label: 'Reiner Text' },
  { format: 'rtf', label: 'Rich Text (RTF)' },
];

const files: Record<Exclude<ExportFormat, 'pdf'>, { ext: string; mime: string; build: (d: ExportDoc) => string }> = {
  md: { ext: 'md', mime: 'text/markdown', build: toMarkdown },
  html: { ext: 'html', mime: 'text/html', build: toHtml },
  txt: { ext: 'txt', mime: 'text/plain', build: toPlainText },
  rtf: { ext: 'rtf', mime: 'application/rtf', build: toRtf },
};

function download(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Druckt ein HTML-Dokument über einen unsichtbaren iframe. Im Druckdialog
 * „Als PDF sichern“ wählen – so bleibt Text durchsuchbar und scharf.
 */
function printHtml(html: string, title: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0';
  frame.srcdoc = html;
  document.body.append(frame);

  frame.addEventListener('load', async () => {
    const win = frame.contentWindow;
    if (!win) return frame.remove();
    await Promise.all([...win.document.images].map((img) => img.decode().catch(() => undefined)));
    await Promise.race([win.document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);

    // Chrome/Safari schlagen den Dokumenttitel als Dateinamen vor.
    const prevTitle = document.title;
    document.title = title;
    const cleanup = () => {
      document.title = prevTitle;
      frame.remove();
    };
    win.addEventListener('afterprint', () => setTimeout(cleanup, 100), { once: true });
    setTimeout(cleanup, 60_000);
    win.focus();
    win.print();
  });
}

/** Exportiert eine Notiz; `doc` ist der aktuelle Editor-Inhalt, falls vorhanden. */
export async function exportNote(note: Note, format: ExportFormat, doc?: PMNode) {
  const content: PMNode = doc ?? (note.content ? JSON.parse(note.content) : { type: 'doc', content: [] });
  const [assets, allTags, terms] = await Promise.all([
    collectAssets(content, { png: format === 'rtf', mermaid: format === 'pdf' || format === 'html', math: format === 'pdf' || format === 'html' }),
    storage.listTags(),
    storage.listTerms(),
  ]);
  assets.glossary = { all: terms, used: termsInText(terms, textOf(content)) };
  const tags = note.tags.map((id) => allTags.find((t) => t.id === id)?.name).filter((n): n is string => !!n);
  const data: ExportDoc = { title: note.title, tags, doc: content, assets };

  if (format === 'pdf') {
    printHtml(toHtml(data), untitled(note.title));
    return;
  }
  const f = files[format];
  download(f.build(data), `${safeFilename(note.title)}.${f.ext}`, f.mime);
}
