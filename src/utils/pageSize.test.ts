import { describe, it, expect } from 'vitest';
import { PAGE_SIZE_OPTIONS, ALL_PAGE_SIZE, pageSizeLabel } from './pageSize';

describe('pageSize', () => {
  it('ALL_PAGE_SIZE matches the backend\'s own cap (WorksService.MAX_LIST_LIMIT)', () => {
    expect(ALL_PAGE_SIZE).toBe(10_000);
  });

  it('includes 50/100/250/1000 and ends with the "All" value', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([50, 100, 250, 1000, ALL_PAGE_SIZE]);
  });

  it('labels the cap value as "All", everything else as its own number', () => {
    expect(pageSizeLabel(ALL_PAGE_SIZE)).toBe('All');
    expect(pageSizeLabel(50)).toBe('50');
    expect(pageSizeLabel(1000)).toBe('1000');
  });
});
