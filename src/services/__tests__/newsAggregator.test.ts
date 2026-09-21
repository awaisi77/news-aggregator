import { describe, expect, it, vi } from 'vitest';
import { deriveFetchVariants, fetchFromAllSources, fetchPersonalizedFeed } from '../newsAggregator';
import type { Article, NewsProvider, SearchFilters, UserPreferences } from '../../types';

const BASE_FILTERS: SearchFilters = {
  keyword: '',
  category: null,
  source: null,
  dateFrom: null,
  dateTo: null,
};

function makeArticle(overrides: Partial<Article>): Article {
  return {
    id: 'id',
    source: 'newsapi',
    sourceLabel: 'NewsAPI',
    title: 'Title',
    description: null,
    url: 'https://example.com/default',
    imageUrl: null,
    author: null,
    category: null,
    publishedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeProvider(
  id: NewsProvider['meta']['id'],
  fetchArticles: NewsProvider['fetchArticles'],
  isConfigured = true,
): NewsProvider {
  return { meta: { id, label: id, isConfigured }, fetchArticles };
}

describe('fetchFromAllSources', () => {
  it('merges results from every configured provider and sorts by recency', async () => {
    const providers = [
      makeProvider('newsapi', async () =>
        [makeArticle({ url: 'https://example.com/old', publishedAt: '2026-01-01T00:00:00Z' })],
      ),
      makeProvider('guardian', async () =>
        [makeArticle({ url: 'https://example.com/new', source: 'guardian', publishedAt: '2026-06-01T00:00:00Z' })],
      ),
    ];

    const result = await fetchFromAllSources(providers, BASE_FILTERS);

    expect(result.articles.map((a) => a.url)).toEqual([
      'https://example.com/new',
      'https://example.com/old',
    ]);
    expect(result.errors).toHaveLength(0);
  });

  it('de-duplicates articles that share the same URL across sources', async () => {
    const providers = [
      makeProvider('newsapi', async () => [makeArticle({ url: 'https://example.com/shared' })]),
      makeProvider('guardian', async () => [
        makeArticle({ url: 'https://example.com/shared', source: 'guardian' }),
      ]),
    ];

    const result = await fetchFromAllSources(providers, BASE_FILTERS);
    expect(result.articles).toHaveLength(1);
  });

  it('isolates one provider failing so the others still return results', async () => {
    const providers = [
      makeProvider('newsapi', async () => {
        throw new Error('boom');
      }),
      makeProvider('guardian', async () => [makeArticle({ url: 'https://example.com/ok', source: 'guardian' })]),
    ];

    const result = await fetchFromAllSources(providers, BASE_FILTERS);
    expect(result.articles).toHaveLength(1);
    expect(result.errors).toEqual([{ source: 'newsapi', message: 'boom' }]);
  });

  it('skips providers that are not configured', async () => {
    const fetchArticles = vi.fn(async () => [makeArticle({})]);
    const providers = [makeProvider('newsapi', fetchArticles, false)];

    const result = await fetchFromAllSources(providers, BASE_FILTERS);
    expect(fetchArticles).not.toHaveBeenCalled();
    expect(result.articles).toHaveLength(0);
  });

  it('only queries the provider matching an explicit source filter', async () => {
    const newsApiFetch = vi.fn(async () => [makeArticle({ url: 'https://example.com/a' })]);
    const guardianFetch = vi.fn(async () => [makeArticle({ url: 'https://example.com/b', source: 'guardian' })]);
    const providers = [makeProvider('newsapi', newsApiFetch), makeProvider('guardian', guardianFetch)];

    await fetchFromAllSources(providers, { ...BASE_FILTERS, source: 'guardian' });

    expect(newsApiFetch).not.toHaveBeenCalled();
    expect(guardianFetch).toHaveBeenCalledTimes(1);
  });
});

const EMPTY_PREFS: UserPreferences = { sources: [], categories: [], authors: [] };

describe('deriveFetchVariants', () => {
  it('returns just the base filters when personalization is off, regardless of preferences', () => {
    const prefs: UserPreferences = { sources: ['guardian'], categories: ['technology'], authors: [] };
    expect(deriveFetchVariants(BASE_FILTERS, prefs, false)).toEqual([BASE_FILTERS]);
  });

  it('returns just the base filters when personalization is on but no preferences are set', () => {
    expect(deriveFetchVariants(BASE_FILTERS, EMPTY_PREFS, true)).toEqual([BASE_FILTERS]);
  });

  it('adds a variant per preferred category when the active category filter would exclude it', () => {
    const prefs: UserPreferences = { sources: [], categories: ['technology'], authors: [] };
    const result = deriveFetchVariants(BASE_FILTERS, prefs, true);
    expect(result).toEqual([BASE_FILTERS, { ...BASE_FILTERS, category: 'technology' }]);
  });

  it('does not add a category variant when the active category filter already matches the preference', () => {
    const filters = { ...BASE_FILTERS, category: 'technology' };
    const prefs: UserPreferences = { sources: [], categories: ['technology'], authors: [] };
    expect(deriveFetchVariants(filters, prefs, true)).toEqual([filters]);
  });

  it('adds a category variant when the active category filter conflicts with every preference', () => {
    const filters = { ...BASE_FILTERS, category: 'business' };
    const prefs: UserPreferences = { sources: [], categories: ['technology'], authors: [] };
    const result = deriveFetchVariants(filters, prefs, true);
    expect(result).toEqual([filters, { ...filters, category: 'technology' }]);
  });

  it('caps the number of extra category variants', () => {
    const prefs: UserPreferences = {
      sources: [],
      categories: ['technology', 'sports', 'world', 'business', 'science'],
      authors: [],
    };
    const result = deriveFetchVariants(BASE_FILTERS, prefs, true);
    // base + 3 capped category variants, not all 5
    expect(result).toHaveLength(4);
  });

  it('adds a variant per preferred source when the active source filter would exclude it', () => {
    const prefs: UserPreferences = { sources: ['guardian'], categories: [], authors: [] };
    const result = deriveFetchVariants(BASE_FILTERS, prefs, true);
    expect(result).toEqual([BASE_FILTERS, { ...BASE_FILTERS, source: 'guardian' }]);
  });

  it('adds a source variant when the active source filter conflicts with the preference', () => {
    const filters = { ...BASE_FILTERS, source: 'nytimes' as const };
    const prefs: UserPreferences = { sources: ['guardian'], categories: [], authors: [] };
    const result = deriveFetchVariants(filters, prefs, true);
    expect(result).toEqual([filters, { ...filters, source: 'guardian' }]);
  });

  it('does not add a source variant when the active source filter already matches the preference', () => {
    const filters = { ...BASE_FILTERS, source: 'guardian' as const };
    const prefs: UserPreferences = { sources: ['guardian'], categories: [], authors: [] };
    expect(deriveFetchVariants(filters, prefs, true)).toEqual([filters]);
  });

  it('combines category and source backfills independently when both conflict', () => {
    const filters = { ...BASE_FILTERS, category: 'business', source: 'nytimes' as const };
    const prefs: UserPreferences = { sources: ['guardian'], categories: ['technology'], authors: [] };
    const result = deriveFetchVariants(filters, prefs, true);
    expect(result).toEqual([
      filters,
      { ...filters, category: 'technology' },
      { ...filters, source: 'guardian' },
    ]);
  });
});

describe('fetchPersonalizedFeed', () => {
  it('behaves exactly like a single fetchFromAllSources call when personalization is off', async () => {
    const fetchArticles = vi.fn(async () => [makeArticle({ url: 'https://example.com/a' })]);
    const providers = [makeProvider('newsapi', fetchArticles)];

    const result = await fetchPersonalizedFeed(providers, BASE_FILTERS, EMPTY_PREFS, false);

    expect(fetchArticles).toHaveBeenCalledTimes(1);
    expect(result.articles).toHaveLength(1);
  });

  it('fetches the base filters and a preferred-category backfill in parallel, then merges and de-dupes', async () => {
    const fetchArticles = vi.fn(async (filters: SearchFilters) => {
      if (filters.category === 'technology') {
        return [makeArticle({ url: 'https://example.com/tech', category: 'technology' })];
      }
      return [makeArticle({ url: 'https://example.com/general' })];
    });
    const providers = [makeProvider('newsapi', fetchArticles)];
    const prefs: UserPreferences = { sources: [], categories: ['technology'], authors: [] };

    const result = await fetchPersonalizedFeed(providers, BASE_FILTERS, prefs, true);

    expect(fetchArticles).toHaveBeenCalledTimes(2);
    expect(result.articles.map((a) => a.url).sort()).toEqual([
      'https://example.com/general',
      'https://example.com/tech',
    ]);
  });

  it('de-duplicates an article returned by both the base fetch and a backfill variant', async () => {
    const fetchArticles = vi.fn(async () => [makeArticle({ url: 'https://example.com/shared' })]);
    const providers = [makeProvider('newsapi', fetchArticles)];
    const prefs: UserPreferences = { sources: [], categories: ['technology'], authors: [] };

    const result = await fetchPersonalizedFeed(providers, BASE_FILTERS, prefs, true);
    expect(result.articles).toHaveLength(1);
  });

  it('de-duplicates identical errors raised by the same provider across multiple variants', async () => {
    const fetchArticles = vi.fn(async () => {
      throw new Error('rate limited');
    });
    const providers = [makeProvider('newsapi', fetchArticles)];
    const prefs: UserPreferences = { sources: [], categories: ['technology'], authors: [] };

    const result = await fetchPersonalizedFeed(providers, BASE_FILTERS, prefs, true);
    expect(fetchArticles).toHaveBeenCalledTimes(2);
    expect(result.errors).toEqual([{ source: 'newsapi', message: 'rate limited' }]);
  });
});
