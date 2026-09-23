/**
 * Bereiche mit eigener Tastaturbehandlung (z. B. das Whiteboard) markieren sich mit
 * `data-own-keys`. Seitenweite Tastenkürzel ignorieren Ereignisse aus diesen Bereichen.
 */
export function ownsKeys(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[data-own-keys]');
}
