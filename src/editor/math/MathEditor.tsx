import { useEffect, useRef, useState } from 'react';
import { MathfieldElement } from 'mathlive';
import { loadedKatex } from './katex';
import './mathEditor.css';

// Schriften kommen aus dem KaTeX-CSS (gleiche Namen), Töne wollen wir keine.
MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;

interface Button {
  title: string;
  /** Anzeige auf dem Knopf (LaTeX). */
  label: string;
  /** Einzufügendes LaTeX: #0 = Markiertes, #? = Platzhalter. */
  insert?: string;
  /** Alternativ ein MathLive-Befehl. */
  command?: 'moveToSuperscript' | 'moveToSubscript';
}

const sym = (title: string, latex: string): Button => ({ title, label: latex, insert: latex });

const GROUPS: { name: string; buttons: Button[] }[] = [
  {
    name: 'Grundlagen',
    buttons: [
      { title: 'Bruch', label: '\\frac{\\square}{\\square}', insert: '\\frac{#0}{#?}' },
      { title: 'Hochzahl', label: 'x^{\\square}', command: 'moveToSuperscript' },
      { title: 'Index', label: 'x_{\\square}', command: 'moveToSubscript' },
      { title: 'Wurzel', label: '\\sqrt{\\square}', insert: '\\sqrt{#0}' },
      { title: 'n-te Wurzel', label: '\\sqrt[\\square]{\\square}', insert: '\\sqrt[#?]{#0}' },
      { title: 'Klammern', label: '(\\square)', insert: '\\left(#0\\right)' },
      { title: 'Betrag', label: '|\\square|', insert: '\\left|#0\\right|' },
      sym('Mal', '\\cdot'),
      sym('Kreuz', '\\times'),
      sym('Geteilt', '\\div'),
      sym('Plusminus', '\\pm'),
      sym('Ungleich', '\\neq'),
      sym('Ungefähr', '\\approx'),
      sym('Kleiner gleich', '\\leq'),
      sym('Größer gleich', '\\geq'),
      sym('Unendlich', '\\infty'),
      sym('Grad', '^{\\circ}'),
    ],
  },
  {
    name: 'Analysis',
    buttons: [
      { title: 'Bestimmtes Integral', label: '\\int_{\\square}^{\\square}', insert: '\\int_{#?}^{#?}' },
      sym('Integral', '\\int'),
      { title: 'Summe', label: '\\sum_{\\square}^{\\square}', insert: '\\sum_{#?}^{#?}' },
      { title: 'Produkt', label: '\\prod_{\\square}^{\\square}', insert: '\\prod_{#?}^{#?}' },
      { title: 'Grenzwert', label: '\\lim_{\\square\\to\\square}', insert: '\\lim_{#?\\to#?}' },
      { title: 'Ableitung', label: '\\frac{d}{dx}', insert: '\\frac{\\mathrm{d}}{\\mathrm{d}#?}' },
      { title: 'Ableitung von f', label: "f'", insert: "'" },
      sym('Partiell', '\\partial'),
      sym('Differential', '\\,\\mathrm{d}x'),
      { title: 'Logarithmus', label: '\\log_{\\square}', insert: '\\log_{#?}' },
      sym('Natürlicher Logarithmus', '\\ln'),
      { title: 'e hoch', label: 'e^{\\square}', insert: 'e^{#?}' },
      sym('Sinus', '\\sin'),
      sym('Kosinus', '\\cos'),
      sym('Tangens', '\\tan'),
      sym('Pfeil', '\\to'),
      { title: 'Vektor', label: '\\vec{\\square}', insert: '\\vec{#0}' },
      { title: 'Querstrich', label: '\\overline{\\square}', insert: '\\overline{#0}' },
    ],
  },
  {
    name: 'Griechisch',
    buttons: [
      ...['alpha', 'beta', 'gamma', 'delta', 'varepsilon', 'eta', 'theta', 'lambda', 'mu', 'pi', 'rho', 'sigma', 'tau', 'varphi', 'omega'],
      ...['Gamma', 'Delta', 'Theta', 'Lambda', 'Pi', 'Sigma', 'Phi', 'Omega'],
    ].map((n) => sym(n, `\\${n}`)),
  },
  {
    name: 'Mengen & Logik',
    buttons: [
      sym('Element von', '\\in'),
      sym('Kein Element von', '\\notin'),
      sym('Teilmenge', '\\subseteq'),
      sym('Echte Teilmenge', '\\subset'),
      sym('Vereinigung', '\\cup'),
      sym('Schnitt', '\\cap'),
      sym('Leere Menge', '\\emptyset'),
      { title: 'Menge', label: '\\{\\square\\}', insert: '\\left\\{#0\\right\\}' },
      sym('Natürliche Zahlen', '\\mathbb{N}'),
      sym('Ganze Zahlen', '\\mathbb{Z}'),
      sym('Rationale Zahlen', '\\mathbb{Q}'),
      sym('Reelle Zahlen', '\\mathbb{R}'),
      sym('Für alle', '\\forall'),
      sym('Es existiert', '\\exists'),
      sym('Daraus folgt', '\\Rightarrow'),
      sym('Genau dann, wenn', '\\Leftrightarrow'),
      sym('Und', '\\land'),
      sym('Oder', '\\lor'),
      sym('Nicht', '\\neg'),
    ],
  },
  {
    name: 'Matrizen',
    buttons: [
      { title: 'Matrix 2×2', label: '\\begin{pmatrix}\\square&\\square\\\\\\square&\\square\\end{pmatrix}', insert: '\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}' },
      {
        title: 'Matrix 3×3',
        label: '\\begin{pmatrix}\\square&\\square&\\square\\\\\\square&\\square&\\square\\\\\\square&\\square&\\square\\end{pmatrix}',
        insert: '\\begin{pmatrix}#?&#?&#?\\\\#?&#?&#?\\\\#?&#?&#?\\end{pmatrix}',
      },
      { title: 'Spaltenvektor', label: '\\begin{pmatrix}\\square\\\\\\square\\end{pmatrix}', insert: '\\begin{pmatrix}#?\\\\#?\\end{pmatrix}' },
      { title: 'Fallunterscheidung', label: '\\begin{cases}\\square&\\square\\\\\\square&\\square\\end{cases}', insert: '\\begin{cases}#?&#?\\\\#?&#?\\end{cases}' },
    ],
  },
];

const TAB_KEY = 'mitschrift:math-editor-tab';

function loadTab() {
  try {
    return Math.min(GROUPS.length - 1, Math.max(0, Number(localStorage.getItem(TAB_KEY)) || 0));
  } catch {
    return 0;
  }
}

function ButtonLabel({ latex }: { latex: string }) {
  const katex = loadedKatex();
  if (!katex) return <span>{latex}</span>;
  return <span dangerouslySetInnerHTML={{ __html: katex.renderToString(latex, { throwOnError: false }) }} />;
}

/** Ereignisse des Formelfelds, die nicht bis zum Notiz-Editor (ProseMirror) durchdringen dürfen. */
const CONTAINED = ['keydown', 'keyup', 'keypress', 'beforeinput', 'input', 'paste', 'cut', 'copy', 'compositionstart', 'compositionend'];

export interface MathEditorProps {
  latex: string;
  /** Abgesetzte Formel (groß) statt Formel im Text. */
  display: boolean;
  onChange: (latex: string) => void;
  /** ↵ oder Esc: fertig. */
  onDone: () => void;
}

/**
 * Formel direkt in der gesetzten Darstellung bearbeiten (MathLive): Knöpfe fügen Bruch,
 * Wurzel usw. an der Schreibmarke ein, Pfeiltasten wandern durch die Struktur.
 * Auf Wunsch daneben der LaTeX-Quelltext.
 */
export default function MathEditor({ latex, display, onChange, onDone }: MathEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mfRef = useRef<MathfieldElement | null>(null);
  const [tab, setTab] = useState(loadTab);
  const [source, setSource] = useState(false);
  const cb = useRef({ onChange, onDone });
  cb.current = { onChange, onDone };

  useEffect(() => {
    const mf = new MathfieldElement();
    mf.className = 'mx-field';
    mf.value = latex;
    hostRef.current!.appendChild(mf);
    mf.defaultMode = display ? 'math' : 'inline-math';
    mf.mathVirtualKeyboardPolicy = 'manual';
    mf.popoverPolicy = 'off';
    mf.menuItems = [];
    mf.smartFence = true;
    mfRef.current = mf;

    const onInput = () => cb.current.onChange(mf.value);
    // Vor MathLive abfangen (Capture am Element), sonst behandelt es ↵ selbst.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        cb.current.onDone();
      }
    };
    mf.addEventListener('input', onInput);
    mf.addEventListener('keydown', onKey, true);

    const root = rootRef.current!;
    // Nur Ereignisse aus dem Formelfeld – Quelltext-Feld und Knöpfe braucht React noch.
    const stop = (e: Event) => {
      if (e.target === mf) e.stopPropagation();
    };
    CONTAINED.forEach((t) => root.addEventListener(t, stop));

    // Erst nach dem Klick, der den Editor geöffnet hat – sonst holt sich der Notiz-Editor den Fokus zurück.
    const focusTimer = window.setTimeout(() => {
      mf.focus();
      mf.executeCommand('moveToMathfieldEnd');
    }, 30);
    return () => {
      window.clearTimeout(focusTimer);
      mf.removeEventListener('input', onInput);
      mf.removeEventListener('keydown', onKey, true);
      CONTAINED.forEach((t) => root.removeEventListener(t, stop));
      mf.remove();
      mfRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, []);

  // Änderungen von außen (Quelltext, Rückgängig) ins Formelfeld übernehmen.
  useEffect(() => {
    const mf = mfRef.current;
    if (mf && mf.value !== latex) mf.setValue(latex, { silenceNotifications: true });
  }, [latex]);

  function press(b: Button) {
    const mf = mfRef.current;
    if (!mf) return;
    if (b.command) mf.executeCommand(b.command);
    else if (b.insert) mf.executeCommand(['insert', b.insert, { selectionMode: 'placeholder', focus: true }]);
    mf.focus();
  }

  function selectTab(i: number) {
    setTab(i);
    try {
      localStorage.setItem(TAB_KEY, String(i));
    } catch {
      // nur Komfort
    }
  }

  return (
    <div ref={rootRef} className={`mx${display ? ' is-display' : ''}`} data-own-keys="">
      <div className="mx-toolbar" onMouseDown={(e) => e.preventDefault()}>
        <div className="mx-tabs" role="tablist">
          {GROUPS.map((g, i) => (
            <button key={g.name} type="button" role="tab" aria-selected={i === tab} onClick={() => selectTab(i)}>
              {g.name}
            </button>
          ))}
        </div>
        <div className="mx-buttons" role="tabpanel">
          {GROUPS[tab].buttons.map((b) => (
            <button key={b.title} type="button" className="mx-btn" title={b.title} aria-label={b.title} onClick={() => press(b)}>
              <ButtonLabel latex={b.label} />
            </button>
          ))}
        </div>
      </div>

      <div ref={hostRef} className="mx-host" />

      {source && (
        <textarea
          className="mx-source"
          value={latex}
          spellCheck={false}
          rows={Math.min(6, Math.max(2, latex.split('\n').length))}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
              e.preventDefault();
              onDone();
            }
          }}
        />
      )}

      <p className="mx-hint">
        <span>↵ oder Esc fertig · ←/→ durch die Formel · Tab zum nächsten Platzhalter · „/“ macht einen Bruch</span>
        <button type="button" className="mx-link" onMouseDown={(e) => e.preventDefault()} onClick={() => setSource((s) => !s)}>
          {source ? 'LaTeX ausblenden' : 'LaTeX'}
        </button>
      </p>
    </div>
  );
}
