// Mirrors the backend's own cap (WorksService.MAX_LIST_LIMIT) — "All" sends
// this value rather than being a literal "no limit" request. Institutions'
// corpus (~8k) fits under it entirely; works/authors (~100k each) don't, so
// "All" there means "as many as render reasonably", not the whole corpus.
export const ALL_PAGE_SIZE = 10_000;

export const PAGE_SIZE_OPTIONS = [50, 100, 250, 1000, ALL_PAGE_SIZE] as const;

export function pageSizeLabel(n: number): string {
  return n === ALL_PAGE_SIZE ? 'All' : String(n);
}
