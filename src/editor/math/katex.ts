type Katex = typeof import('katex').default;

// KaTeX ist groß – erst laden, wenn wirklich eine Formel angezeigt wird.
let katex: Katex | null = null;
let loading: Promise<Katex> | null = null;

export function loadKatex(): Promise<Katex> {
  loading ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([m]) => (katex = m.default));
  return loading;
}

/** KaTeX, falls schon geladen (für synchrone Exporte nach `loadKatex()`). */
export const loadedKatex = () => katex;

/**
 * Zeichnet LaTeX in `el`. Solange KaTeX noch lädt, steht der Quelltext da; Fehler im
 * Ausdruck zeigt KaTeX rot an statt abzubrechen.
 */
export function renderMath(el: HTMLElement, latex: string, display: boolean) {
  el.dataset.latex = latex;
  const empty = !latex.trim();
  el.classList.toggle('is-empty', empty);
  if (empty) {
    el.textContent = display ? 'Formel eingeben …' : 'Formel';
    return;
  }
  if (katex) {
    katex.render(latex, el, { displayMode: display, throwOnError: false });
    return;
  }
  el.textContent = latex;
  void loadKatex().then(() => {
    if (el.dataset.latex === latex) renderMath(el, latex, display);
  });
}

/** Formel als MathML (Export: braucht weder Skript noch Schriften); null, wenn KaTeX nicht geladen ist. */
export function mathToMathml(latex: string, display: boolean): string | null {
  if (!katex) return null;
  return katex.renderToString(latex, { displayMode: display, throwOnError: false, output: 'mathml' });
}
