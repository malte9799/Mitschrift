import { useSyncExternalStore } from 'react';

/** Ein Befehl aus der Menüleiste, flach gemacht für die Suchpalette. */
export interface PaletteCommand {
  label: string;
  /** Menüpfad ohne den Eintrag selbst, z. B. ["Darstellung", "Farbschema"]. */
  path: string[];
  shortcut?: string;
  checked?: boolean;
  action: () => void;
}

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Liefert die aktuellen Menübefehle – die Menüleiste meldet sich hier an. */
let commandSource: () => PaletteCommand[] = () => [];

export function registerCommandSource(source: () => PaletteCommand[]) {
  commandSource = source;
}

export function getCommands() {
  return commandSource();
}

export function openPalette() {
  open = true;
  emit();
}

export function closePalette() {
  open = false;
  emit();
}

export function togglePalette() {
  open = !open;
  emit();
}

export function usePaletteOpen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
  );
}
