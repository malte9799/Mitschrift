import type { WhiteboardScene } from '../whiteboard/WhiteboardNode';

/** Mermaid-Code in eine Excalidraw-Zeichnung umwandeln (Elemente einzeln bearbeitbar, kein Bild). */
export async function mermaidToWhiteboard(code: string): Promise<{ scene: WhiteboardScene; svg: string }> {
  const [{ parseMermaidToExcalidraw }, { convertToExcalidrawElements, exportToSvg }] = await Promise.all([
    import('@excalidraw/mermaid-to-excalidraw'),
    import('@excalidraw/excalidraw'),
  ]);
  const { elements: skeleton, files } = await parseMermaidToExcalidraw(code);
  const elements = convertToExcalidrawElements(skeleton);
  const scene: WhiteboardScene = { elements, files: files ?? {} };
  // Vorschau gleich mitliefern – sonst zeigt die Notiz „Leeres Whiteboard“, bis jemand den Editor öffnet und etwas ändert.
  const svgEl = await exportToSvg({ elements, files: scene.files, appState: { exportBackground: false, exportWithDarkMode: false }, exportPadding: 16 });
  return { scene, svg: svgEl.outerHTML };
}
