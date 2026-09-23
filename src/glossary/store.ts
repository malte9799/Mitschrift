import { useSyncExternalStore } from 'react';
import { storage, type Term, type TermPatch } from '@/storage';
import { buildMatcher, type Matcher } from './match';

/**
 * Glossar im Speicher gehalten: Der Editor braucht die Begriffe synchron (Hervorhebung beim Tippen),
 * Seiten und Hover-Karten lesen denselben Stand.
 */
let terms: Term[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
let matcher: Matcher = buildMatcher([]);
const listeners = new Set<() => void>();

function emit() {
  matcher = buildMatcher(terms);
  for (const l of listeners) l();
}

function ensureLoaded() {
  loading ??= storage.listTerms().then((t) => {
    terms = t;
    loaded = true;
    emit();
  });
  return loading;
}

export function subscribeTerms(l: () => void) {
  listeners.add(l);
  void ensureLoaded();
  return () => {
    listeners.delete(l);
  };
}

export const getTerms = () => terms;
export const getMatcher = () => matcher;

/** Alle Begriffe (alphabetisch); `null`, solange sie noch laden. */
export function useTerms(): Term[] | null {
  return useSyncExternalStore(subscribeTerms, () => (loaded ? terms : null));
}

const sortTerms = (list: Term[]) => [...list].sort((a, b) => a.term.localeCompare(b.term, 'de', { sensitivity: 'base' }));

export async function createTerm(init: TermPatch & { term: string }) {
  await ensureLoaded();
  const t = await storage.createTerm({ ...init, term: init.term.trim(), expansion: init.expansion?.trim() ?? '', definition: init.definition?.trim() ?? '' });
  terms = sortTerms([...terms, t]);
  emit();
  return t;
}

export async function updateTerm(id: string, patch: TermPatch) {
  const t = await storage.updateTerm(id, patch);
  if (!t) return;
  terms = sortTerms(terms.map((x) => (x.id === id ? t : x)));
  emit();
}

export async function deleteTerm(id: string) {
  await storage.deleteTerm(id);
  terms = terms.filter((t) => t.id !== id);
  emit();
}

/** Nach dem Löschen eines Tags: Begriffe neu laden (die IDB hat das Tag schon entfernt). */
export async function reloadTerms() {
  terms = await storage.listTerms();
  loaded = true;
  emit();
}

export const findTerm = (text: string) => {
  const key = text.trim();
  return terms.find((t) => t.term === key) ?? terms.find((t) => t.term.toLocaleLowerCase('de') === key.toLocaleLowerCase('de'));
};

// ---------- Hervorhebung ein/aus ----------

const HIGHLIGHT_KEY = 'mitschrift-glossary-highlight';
let highlight = (() => {
  try {
    return localStorage.getItem(HIGHLIGHT_KEY) !== '0';
  } catch {
    return true;
  }
})();

export const getHighlight = () => highlight;

export function setHighlight(on: boolean) {
  highlight = on;
  try {
    localStorage.setItem(HIGHLIGHT_KEY, on ? '1' : '0');
  } catch {
    /* ignorieren */
  }
  emit();
}

export function useHighlight() {
  return useSyncExternalStore(subscribeTerms, getHighlight);
}

// ---------- Bearbeiten-Dialog ----------

/** Öffnet den Begriff-Dialog (TermDialogHost): neuer Eintrag mit Vorschlag oder vorhandener Eintrag. */
export const OPEN_TERM_EVENT = 'mitschrift:open-term';

export interface OpenTermDetail {
  id?: string;
  term?: string;
  expansion?: string;
}

export function openTermDialog(detail: OpenTermDetail) {
  window.dispatchEvent(new CustomEvent<OpenTermDetail>(OPEN_TERM_EVENT, { detail }));
}
