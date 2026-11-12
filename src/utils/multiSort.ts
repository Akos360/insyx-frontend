export type SortSpec<K extends string> = { key: K; dir: 'asc' | 'desc' };

/**
 * Click a column header: plain click replaces the whole sort with just this
 * column (toggling direction if it was already the sole active sort).
 * Shift+click adds/updates this column as an extra sort criterion, cycling
 * desc -> asc -> removed on repeated shift-clicks (never leaving zero sorts).
 */
export function toggleSort<K extends string>(prev: SortSpec<K>[], key: K, shiftKey: boolean): SortSpec<K>[] {
  if (!shiftKey) {
    if (prev.length === 1 && prev[0].key === key) {
      return [{ key, dir: prev[0].dir === 'desc' ? 'asc' : 'desc' }];
    }
    return [{ key, dir: 'desc' }];
  }
  const idx = prev.findIndex((s) => s.key === key);
  if (idx === -1) return [...prev, { key, dir: 'desc' }];
  const current = prev[idx];
  if (current.dir === 'desc') {
    const next = [...prev];
    next[idx] = { key, dir: 'asc' };
    return next;
  }
  const next = prev.filter((_, i) => i !== idx);
  return next.length > 0 ? next : prev;
}

/** "field,citedByCount" / "asc,desc" — the shape the backend's ChartFilterDto-style sort params expect. */
export function encodeSorts<K extends string>(sorts: SortSpec<K>[]): { sortBy: string; sortDir: string } {
  return { sortBy: sorts.map((s) => s.key).join(','), sortDir: sorts.map((s) => s.dir).join(',') };
}

/**
 * Inverse of encodeSorts, for restoring sort state from a shared/bookmarked
 * URL's sortBy/sortDir query params. Falls back (e.g. to the page's own
 * default sort) when the params are absent, or once every parsed key has
 * been dropped for not being in validKeys — a stale/tampered URL should
 * never produce an empty sort list.
 */
export function decodeSorts<K extends string>(
  sortBy: string | null | undefined,
  sortDir: string | null | undefined,
  validKeys: readonly K[],
  fallback: SortSpec<K>[],
): SortSpec<K>[] {
  if (!sortBy) return fallback;
  const dirs = (sortDir ?? '').split(',');
  const sorts = sortBy
    .split(',')
    .map((key, i) => ({ key, dir: dirs[i] === 'asc' ? 'asc' : 'desc' }) as SortSpec<K>)
    .filter((s) => (validKeys as readonly string[]).includes(s.key));
  return sorts.length > 0 ? sorts : fallback;
}

/** 1-based position of `key` in the active sort list, or 0 if it isn't active. */
export function sortPriority<K extends string>(sorts: SortSpec<K>[], key: K): number {
  const idx = sorts.findIndex((s) => s.key === key);
  return idx === -1 ? 0 : idx + 1;
}
