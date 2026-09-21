import { describe, expect, it } from 'vitest';
import { normalizeCategory } from '../normalizeCategory';

describe('normalizeCategory', () => {
  it('returns null for null input', () => {
    expect(normalizeCategory(null)).toBeNull();
  });

  it('lowercases a value that is already one of our canonical categories', () => {
    expect(normalizeCategory('Technology')).toBe('technology');
    expect(normalizeCategory('BUSINESS')).toBe('business');
  });

  it("maps the Guardian's display-label sectionName values to our canonical categories", () => {
    expect(normalizeCategory('Sport')).toBe('sports');
    expect(normalizeCategory('World news')).toBe('world');
    expect(normalizeCategory('Football')).toBe('sports');
  });

  it('is case-insensitive when applying aliases', () => {
    expect(normalizeCategory('SPORT')).toBe('sports');
    expect(normalizeCategory('World News')).toBe('world');
  });

  it('preserves an unmapped provider label as-is rather than discarding it', () => {
    expect(normalizeCategory('Culture')).toBe('Culture');
    expect(normalizeCategory('Environment')).toBe('Environment');
  });
});
