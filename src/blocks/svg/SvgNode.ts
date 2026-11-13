import { Extension, Node, mergeAttributes, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { jsonAttr } from '../jsonAttr';
import { SvgView } from './SvgView';
import { cleanSvg, looksLikeSvg, prefersInvert } from './model';

export type SvgAlign = 'left' | 'center' | 'right' | 'floatLeft' | 'floatRight';
/** '' = keiner, 'card' = Kartenfarbe (folgt dem Theme), 'grid'/'dots' = Papier, sonst eine Farbe. */
export type SvgBackground = string;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    svg: {
      insertSvg: (svg?: string) => ReturnType;
    };
  }
}

/** Attribute für ein frisch eingefügtes SVG. */
export function svgAttrs(svg: string) {
  return { svg, dark: prefersInvert(svg) ? 'invert' : 'keep' };
}

const isSvgFile = (f: File) => f.type === 'image/svg+xml' || /\.svg$/i.test(f.name);

async function insertFiles(editor: Editor, files: File[], pos?: number) {
  const nodes = [];
  for (const file of files) {
    const svg = cleanSvg(await file.text());
    if (svg) nodes.push({ type: 'svg', attrs: svgAttrs(svg) });
  }
  if (!nodes.length) return;
  if (pos == null) editor.chain().focus().insertContent(nodes).run();
  else editor.chain().focus().insertContentAt(pos, nodes).run();
}

/** SVG-Code oder .svg-Dateien per Einfügen/Ablegen als SVG-Block übernehmen. */
const SvgPaste = Extension.create({
  name: 'svgPaste',
  // Vor der Markdown-Zwischenablage: SVG-Code soll nicht als Text/HTML landen.
  priority: 1000,

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('svgPaste'),
        props: {
          handlePaste(view, event) {
            // Im Codeblock bleibt SVG-Code Text.
            if (view.state.selection.$from.parent.type.spec.code) return false;
            const data = event.clipboardData;
            const files = [...(data?.files ?? [])].filter(isSvgFile);
            if (files.length) {
              void insertFiles(editor, files);
              return true;
            }
            const text = data?.getData('text/plain') ?? '';
            if (!looksLikeSvg(text)) return false;
            const svg = cleanSvg(text);
            if (!svg) return false;
            editor.chain().focus().insertContent({ type: 'svg', attrs: svgAttrs(svg) }).run();
            return true;
          },
          handleDrop(view, event, _slice, moved) {
            if (moved || !editor.isEditable) return false;
            const files = [...(event.dataTransfer?.files ?? [])].filter(isSvgFile);
            if (!files.length) return false;
            event.preventDefault();
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
            // Hinter den Block, über dem losgelassen wurde.
            let pos: number | undefined;
            if (at) {
              const $pos = view.state.doc.resolve(at.pos);
              pos = $pos.depth > 0 ? $pos.after(1) : at.pos;
            }
            void insertFiles(editor, files, pos);
            return true;
          },
        },
      }),
    ];
  },
});

/**
 * SVG-Grafik: eingefügter SVG-Code, dargestellt als Bild, mit Stil-Optionen (Farben, Linien,
 * Hintergrund, Größe, Position, Drehung) und eigenem Vollbild-Editor.
 */
export const SvgNode = Node.create({
  name: 'svg',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      svg: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-svg') ?? '',
        renderHTML: (a) => ({ 'data-svg': a.svg }),
      },
      colors: jsonAttr<Record<string, string>>('colors', {}),
      strokeScale: jsonAttr('stroke-scale', 1),
      rotate: jsonAttr('rotate', 0),
      flipH: jsonAttr('flip-h', false),
      flipV: jsonAttr('flip-v', false),
      /** Breite in % der Spalte; null = natürliche Größe. */
      width: jsonAttr<number | null>('width', null),
      align: jsonAttr<SvgAlign>('align', 'center'),
      background: jsonAttr<SvgBackground>('background', ''),
      padding: jsonAttr('padding', 0),
      border: jsonAttr('border', false),
      opacity: jsonAttr('opacity', 1),
      /** Im Dunkelmodus: 'keep' = unverändert, 'invert' = Helligkeit umkehren. */
      dark: jsonAttr<'keep' | 'invert'>('dark', 'keep'),
      /** null = keine Beschriftung. */
      caption: jsonAttr<string | null>('caption', null),
      alt: jsonAttr('alt', ''),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-svg-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-svg-block': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SvgView);
  },

  addCommands() {
    return {
      insertSvg:
        (svg = '') =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: svg ? svgAttrs(svg) : {} }),
    };
  },

  addExtensions() {
    return [SvgPaste];
  },
});
