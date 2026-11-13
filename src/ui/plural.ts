/** „1 Notiz“ / „3 Notizen“. */
export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
