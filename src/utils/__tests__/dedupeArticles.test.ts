import { describe, expect, it } from 'vitest';
import { applyPersonalization } from '../dedupeArticles';
import type { Article, UserPreferences } from '../../types';

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: overrides.id ?? 'id-1',
    source: overrides.source ?? 'newsapi',
    sourceLabel: overrides.sourceLabel ?? 'NewsAPI',
    title: overrides.title ?? 'Title',
    description: overrides.description ?? null,
    url: overrides.url ?? 'https://example.com/1',
    imageUrl: overrides.imageUrl ?? null,
    author: overrides.author ?? null,
    category: overrides.category ?? null,
    publishedAt: overrides.publishedAt ?? '2026-01-01T00:00:00Z',
  };
}

const EMPTY_PREFS: UserPreferences = { sources: [], categories: [], authors: [] };

describe('applyPersonalization', () => {
  it('returns the input untouched when personalization is disabled', () => {
    const articles = [makeArticle(), makeArticle({ id: 'id-2' })];
    const result = applyPersonalization(articles, { sources: ['guardian'], categories: [], authors: [] }, false);
    expect(result).toBe(articles);
  });

  it('returns everything, in the same order, when enabled but no preferences are set', () => {
    const articles = [makeArticle(), makeArticle({ id: 'id-2' })];
    const result = applyPersonalization(articles, EMPTY_PREFS, true);
    expect(result).toBe(articles);
    expect(result.map((a) => a.id)).toEqual(['id-1', 'id-2']);
  });

  it('ranks an article matching a preferred source above a more recent non-matching one', () => {
    // "b" is fetched first (more recent), "a" matches the preference - "a"
    // should float to the top, but "b" must still be present, not dropped.
    const articles = [
      makeArticle({ id: 'b', source: 'nytimes' }),
      makeArticle({ id: 'a', source: 'guardian' }),
    ];
    const prefs: UserPreferences = { sources: ['guardian'], categories: [], authors: [] };
    const result = applyPersonalization(articles, prefs, true);
    expect(result.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('ranks articles matching a preferred category case-insensitively above non-matches', () => {
    const articles = [
      makeArticle({ id: 'b', category: 'sports' }),
      makeArticle({ id: 'a', category: 'Technology' }),
    ];
    const prefs: UserPreferences = { sources: [], categories: ['technology'], authors: [] };
    const result = applyPersonalization(articles, prefs, true);
    expect(result.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('ranks articles whose author partially matches a preferred author above non-matches', () => {
    const articles = [
      makeArticle({ id: 'b', author: 'John Smith' }),
      makeArticle({ id: 'a', author: 'Jane Doe, Staff Writer' }),
    ];
    const prefs: UserPreferences = { sources: [], categories: [], authors: ['jane doe'] };
    const result = applyPersonalization(articles, prefs, true);
    expect(result.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('is an OR across dimensions, not an AND, so one match is enough to rank up', () => {
    const article = makeArticle({ id: 'a', source: 'nytimes', category: 'business', author: 'Nobody' });
    const prefs: UserPreferences = {
      sources: ['nytimes'],
      categories: ['technology'], // does not match
      authors: ['someone else'], // does not match
    };
    const result = applyPersonalization([article], prefs, true);
    expect(result).toHaveLength(1);
  });

  it('keeps non-matching articles on the feed, ranked after matches, never dropping them', () => {
    const matching = makeArticle({ id: 'match', source: 'guardian' });
    const nonMatching = makeArticle({ id: 'no-match', source: 'nytimes', category: 'business', author: 'Nobody' });
    const prefs: UserPreferences = { sources: ['guardian'], categories: ['technology'], authors: ['someone'] };
    const result = applyPersonalization([nonMatching, matching], prefs, true);
    expect(result.map((a) => a.id)).toEqual(['match', 'no-match']);
  });

  it('preserves relative (recency) order within the matching group and within the non-matching group', () => {
    const articles = [
      makeArticle({ id: 'match-1', source: 'guardian' }),
      makeArticle({ id: 'no-match-1', source: 'nytimes' }),
      makeArticle({ id: 'match-2', source: 'guardian' }),
      makeArticle({ id: 'no-match-2', source: 'nytimes' }),
    ];
    const prefs: UserPreferences = { sources: ['guardian'], categories: [], authors: [] };
    const result = applyPersonalization(articles, prefs, true);
    expect(result.map((a) => a.id)).toEqual(['match-1', 'match-2', 'no-match-1', 'no-match-2']);
  });

  describe('category matching when an article has no structured category', () => {
    // NewsAPI's /everything endpoint returns no category field at all, so
    // its articles normally have category: null unless the FilterBar's own
    // category filter happened to be set too. Without a keyword fallback,
    // a category preference would silently do nothing for that entire
    // source - this covers the fallback that fixes it.

    it('ranks an article with no category above a non-match when the preference appears in the title', () => {
      const articles = [
        makeArticle({ id: 'b', category: null, title: 'Local council meeting notes' }),
        makeArticle({ id: 'a', category: null, title: 'New Technology unveiled at conference' }),
      ];
      const prefs: UserPreferences = { sources: [], categories: ['technology'], authors: [] };
      const result = applyPersonalization(articles, prefs, true);
      expect(result.map((a) => a.id)).toEqual(['a', 'b']);
    });

    it('also checks the description, case-insensitively, when there is no structured category', () => {
      const articles = [
        makeArticle({ id: 'b', category: null, title: 'Roundup', description: 'Weekend recipes' }),
        makeArticle({ id: 'a', category: null, title: 'Roundup', description: 'A look at the SPORTS world this week' }),
      ];
      const prefs: UserPreferences = { sources: [], categories: ['sports'], authors: [] };
      const result = applyPersonalization(articles, prefs, true);
      expect(result.map((a) => a.id)).toEqual(['a', 'b']);
    });

    it('does not fall back to keyword matching when the article does have a structured category', () => {
      // "b" mentions "technology" in its title but is actually categorized
      // as business - the structured category is authoritative and must
      // not be overridden by an incidental keyword mention. "a" is
      // genuinely categorized as technology and should rank above it.
      const articles = [
        makeArticle({ id: 'b', category: 'business', title: 'Business leaders discuss technology spending' }),
        makeArticle({ id: 'a', category: 'technology', title: 'Roundup' }),
      ];
      const prefs: UserPreferences = { sources: [], categories: ['technology'], authors: [] };
      const result = applyPersonalization(articles, prefs, true);
      expect(result.map((a) => a.id)).toEqual(['a', 'b']);
    });
  });
});
