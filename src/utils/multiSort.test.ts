import { describe, it, expect } from 'vitest';
import { toggleSort, encodeSorts, decodeSorts, sortPriority, type SortSpec } from './multiSort';

type Key = 'a' | 'b' | 'c';

describe('toggleSort', () => {
  it('plain click on a new column replaces the whole sort', () => {
    const prev: SortSpec<Key>[] = [{ key: 'a', dir: 'desc' }];
    expect(toggleSort(prev, 'b', false)).toEqual([{ key: 'b', dir: 'desc' }]);
  });

  it('plain click on the sole active column toggles its direction', () => {
    const prev: SortSpec<Key>[] = [{ key: 'a', dir: 'desc' }];
    expect(toggleSort(prev, 'a', false)).toEqual([{ key: 'a', dir: 'asc' }]);
  });

  it('plain click on a column that is active but not sole still replaces (not toggles)', () => {
    const prev: SortSpec<Key>[] = [{ key: 'a', dir: 'desc' }, { key: 'b', dir: 'asc' }];
    expect(toggleSort(prev, 'a', false)).toEqual([{ key: 'a', dir: 'desc' }]);
  });

  it('shift+click on an inactive column appends it as desc', () => {
    const prev: SortSpec<Key>[] = [{ key: 'a', dir: 'desc' }];
    expect(toggleSort(prev, 'b', true)).toEqual([{ key: 'a', dir: 'desc' }, { key: 'b', dir: 'desc' }]);
  });

  it('shift+click cycles an active column desc -> asc -> removed', () => {
    let sorts: SortSpec<Key>[] = [{ key: 'a', dir: 'desc' }, { key: 'b', dir: 'desc' }];
    sorts = toggleSort(sorts, 'b', true);
    expect(sorts).toEqual([{ key: 'a', dir: 'desc' }, { key: 'b', dir: 'asc' }]);
    sorts = toggleSort(sorts, 'b', true);
    expect(sorts).toEqual([{ key: 'a', dir: 'desc' }]);
  });

  it('never removes the last remaining sort via shift+click', () => {
    let sorts: SortSpec<Key>[] = [{ key: 'a', dir: 'desc' }];
    sorts = toggleSort(sorts, 'a', true); // desc -> asc
    expect(sorts).toEqual([{ key: 'a', dir: 'asc' }]);
    sorts = toggleSort(sorts, 'a', true); // would remove the only sort — stays put instead
    expect(sorts).toEqual([{ key: 'a', dir: 'asc' }]);
  });
});

describe('encodeSorts', () => {
  it('joins keys and dirs positionally', () => {
    const sorts: SortSpec<Key>[] = [{ key: 'a', dir: 'desc' }, { key: 'b', dir: 'asc' }];
    expect(encodeSorts(sorts)).toEqual({ sortBy: 'a,b', sortDir: 'desc,asc' });
  });
});

describe('decodeSorts', () => {
  const validKeys: Key[] = ['a', 'b', 'c'];
  const fallback: SortSpec<Key>[] = [{ key: 'a', dir: 'desc' }];

  it('is the inverse of encodeSorts', () => {
    const sorts: SortSpec<Key>[] = [{ key: 'b', dir: 'asc' }, { key: 'c', dir: 'desc' }];
    const { sortBy, sortDir } = encodeSorts(sorts);
    expect(decodeSorts(sortBy, sortDir, validKeys, fallback)).toEqual(sorts);
  });

  it('falls back when sortBy is absent', () => {
    expect(decodeSorts(null, null, validKeys, fallback)).toEqual(fallback);
    expect(decodeSorts(undefined, undefined, validKeys, fallback)).toEqual(fallback);
  });

  it('drops keys not in validKeys while keeping their positional dir intact for the rest', () => {
    expect(decodeSorts('x,b', 'asc,asc', validKeys, fallback)).toEqual([{ key: 'b', dir: 'asc' }]);
  });

  it('falls back when every parsed key is invalid, never returning an empty list', () => {
    expect(decodeSorts('x,y', 'asc,desc', validKeys, fallback)).toEqual(fallback);
  });

  it('defaults a missing dir to desc', () => {
    expect(decodeSorts('a', null, validKeys, fallback)).toEqual([{ key: 'a', dir: 'desc' }]);
  });
});

describe('sortPriority', () => {
  it('returns the 1-based position of an active key', () => {
    const sorts: SortSpec<Key>[] = [{ key: 'a', dir: 'desc' }, { key: 'b', dir: 'asc' }];
    expect(sortPriority(sorts, 'a')).toBe(1);
    expect(sortPriority(sorts, 'b')).toBe(2);
  });

  it('returns 0 for an inactive key', () => {
    const sorts: SortSpec<Key>[] = [{ key: 'a', dir: 'desc' }];
    expect(sortPriority(sorts, 'c')).toBe(0);
  });
});
