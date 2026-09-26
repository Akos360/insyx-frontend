import { describe, it, expect } from 'vitest';
import { humanizeAuthors } from './authorNames';

describe('humanizeAuthors', () => {
  it('maps a single placeholder to a deterministic readable name', () => {
    expect(humanizeAuthors('Author 114')).toBe('Nadia Williams');
  });

  it('is deterministic across repeated calls for the same number', () => {
    expect(humanizeAuthors('Author 142')).toBe(humanizeAuthors('Author 142'));
    expect(humanizeAuthors('Author 142')).toBe('Aisha Miller');
  });

  it('maps distinct numbers to distinct names', () => {
    expect(humanizeAuthors('Author 114')).not.toBe(humanizeAuthors('Author 142'));
  });

  it('humanizes each part of a semicolon-joined list independently', () => {
    expect(humanizeAuthors('Author 114; Author 142')).toBe('Nadia Williams; Aisha Miller');
  });

  it('passes through names that are not the "Author N" placeholder', () => {
    expect(humanizeAuthors('Marie Curie')).toBe('Marie Curie');
    expect(humanizeAuthors('Marie Curie; Author 114')).toBe('Marie Curie; Nadia Williams');
  });

  it('returns an empty string for null/undefined/empty input', () => {
    expect(humanizeAuthors(null)).toBe('');
    expect(humanizeAuthors(undefined)).toBe('');
    expect(humanizeAuthors('')).toBe('');
  });
});
