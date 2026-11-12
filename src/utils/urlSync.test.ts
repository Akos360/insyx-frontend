import { describe, it, expect } from 'vitest';
import { toSearchParams, toFiniteNumber } from './urlSync';

describe('toFiniteNumber', () => {
  it('parses a valid numeric string', () => {
    expect(toFiniteNumber('2020')).toBe(2020);
  });

  it('returns undefined for empty string', () => {
    expect(toFiniteNumber('')).toBeUndefined();
  });

  it('returns undefined for non-numeric input instead of NaN', () => {
    expect(toFiniteNumber('abc')).toBeUndefined();
  });
});

describe('toSearchParams', () => {
  it('sets provided non-default values', () => {
    const params = toSearchParams({ search: 'genomics', yearFrom: 2020, is_oa: true });
    expect(params.get('search')).toBe('genomics');
    expect(params.get('yearFrom')).toBe('2020');
    expect(params.get('is_oa')).toBe('true');
  });

  it('omits undefined, null, empty string, and false', () => {
    const params = toSearchParams({ search: undefined, domain: null, field: '', is_oa: false, year: 0 });
    expect([...params.keys()]).toEqual(['year']);
    expect(params.get('year')).toBe('0');
  });

  it('produces an empty URLSearchParams when every value is a default', () => {
    const params = toSearchParams({ search: '', is_oa: false });
    expect(params.toString()).toBe('');
  });
});
