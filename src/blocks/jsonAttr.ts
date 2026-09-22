/** Attribut, das als JSON in einem data-Attribut serialisiert wird (für Copy/Paste als HTML). */
export function jsonAttr<T>(name: string, fallback: T) {
  return {
    default: fallback,
    parseHTML: (el: HTMLElement) => {
      try {
        return JSON.parse(el.getAttribute(`data-${name}`) ?? '') as T;
      } catch {
        return fallback;
      }
    },
    renderHTML: (attrs: Record<string, unknown>) => ({ [`data-${name}`]: JSON.stringify(attrs[name]) }),
  };
}

export function shuffle(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
