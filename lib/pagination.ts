export const PAGE_SIZE = 10;

/** Current 1-based page from a ?page= value, clamped to >= 1. */
export function getPage(value?: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Slice a list for the given page. */
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): T[] {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}
