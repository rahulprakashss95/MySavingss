export type Section<T> = { key: string; title: string; data: T[] };

/**
 * Compares two possibly-missing strings. Rows written before a field
 * existed come back with it `undefined`, and `undefined.localeCompare` throws.
 */
export const byText = (a?: string, b?: string) => (a ?? "").localeCompare(b ?? "");

/** Fallback bucket for rows whose grouping field was never set. */
export const UNGROUPED = "Other";

/**
 * Bucket items into sections, preserving first-seen order. Callers sort the
 * result themselves — what "first" means differs per screen (the signed-in
 * user's documents float to the top; ornaments follow the metal's fixed order).
 */
export const groupBy = <T>(
  items: T[],
  getKey: (item: T) => string,
  getTitle: (item: T) => string
): Section<T>[] => {
  const sections = new Map<string, Section<T>>();

  items.forEach((item) => {
    const key = getKey(item);
    const existing = sections.get(key);
    if (existing) {
      existing.data.push(item);
      return;
    }
    sections.set(key, { key, title: getTitle(item), data: [item] });
  });

  return [...sections.values()];
};

/** Orders sections by a fixed list of keys; unknown keys sort last, by title. */
export const byFixedOrder =
  <T>(order: readonly string[]) =>
  (a: Section<T>, b: Section<T>) => {
    const aIndex = order.indexOf(a.key);
    const bIndex = order.indexOf(b.key);
    if (aIndex === -1 && bIndex === -1) return a.title.localeCompare(b.title);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  };
