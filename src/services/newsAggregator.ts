import type {
  Article,
  FetchArticlesResult,
  NewsProvider,
  SearchFilters,
  SourceFetchError,
  UserPreferences,
} from '../types';
import { createGuardianProvider } from './providers/guardianProvider';
import { createNewsApiProvider } from './providers/newsApiProvider';
import { createNyTimesProvider } from './providers/nyTimesProvider';

/**
 * Registry of all available providers. Adding a fourth data source is a
 * one-line change here plus one new adapter file - nothing else in the app
 * needs to change (Open/Closed Principle).
 */
export function getAllProviders(): NewsProvider[] {
  return [createNewsApiProvider(), createGuardianProvider(), createNyTimesProvider()];
}

function dedupeAndSort(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const unique = articles.filter((article) => {
    const key = article.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

/**
 * Fan out a search to every configured, selected provider in parallel and
 * merge the results. Each provider's failure is isolated - one API being
 * down never breaks results from the others.
 */
export async function fetchFromAllSources(
  providers: NewsProvider[],
  filters: SearchFilters,
  signal?: AbortSignal,
): Promise<FetchArticlesResult> {
  const activeProviders = providers.filter(
    (p) => p.meta.isConfigured && (!filters.source || filters.source === p.meta.id),
  );

  const settled = await Promise.allSettled(
    activeProviders.map((provider) => provider.fetchArticles(filters)),
  );

  const articles: Article[] = [];
  const errors: SourceFetchError[] = [];

  settled.forEach((result, index) => {
    const provider = activeProviders[index];
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    } else if (!signal?.aborted) {
      errors.push({
        source: provider.meta.id,
        message: result.reason instanceof Error ? result.reason.message : 'Request failed',
      });
    }
  });

  return { articles: dedupeAndSort(articles), errors };
}

// Bounds how many extra category-driven fetches personalization can add in
// one search - preferences.categories can hold up to 8 values (one per
// CATEGORIES entry), and firing a fetch per preferred category, per
// provider, is real API traffic against free-tier rate limits. Sources
// need no equivalent cap: there are only 3 possible SourceId values.
const MAX_PERSONALIZED_CATEGORY_FETCHES = 3;

/**
 * A user's saved preferences are a standing request ("show me technology"),
 * not just a hint for sorting - if the regular (FilterBar) filters would
 * otherwise never even ask a provider for a preferred category or source,
 * personalization has nothing to promote. This works out which additional
 * filter variants need fetching so that doesn't happen: the base `filters`
 * is always included (an explicit regular-filter choice is still the
 * primary search), plus one variant per preferred category/source that the
 * base filters wouldn't already cover.
 *
 * Pure and easily testable on its own - the actual fetching/merging lives
 * in fetchPersonalizedFeed.
 */
export function deriveFetchVariants(
  filters: SearchFilters,
  preferences: UserPreferences,
  personalizedMode: boolean,
): SearchFilters[] {
  const variants: SearchFilters[] = [filters];
  if (!personalizedMode) return variants;

  const categoryAlreadyCovered =
    preferences.categories.length === 0 ||
    (filters.category != null && preferences.categories.includes(filters.category));

  if (!categoryAlreadyCovered) {
    for (const category of preferences.categories.slice(0, MAX_PERSONALIZED_CATEGORY_FETCHES)) {
      variants.push({ ...filters, category });
    }
  }

  const sourceAlreadyCovered =
    preferences.sources.length === 0 ||
    (filters.source != null && preferences.sources.includes(filters.source));

  if (!sourceAlreadyCovered) {
    for (const source of preferences.sources) {
      variants.push({ ...filters, source });
    }
  }

  return variants;
}

function dedupeErrors(errors: SourceFetchError[]): SourceFetchError[] {
  return errors.filter(
    (error, index) =>
      errors.findIndex((e) => e.source === error.source && e.message === error.message) === index,
  );
}

/**
 * The personalization-aware entry point: fetches every filter variant
 * deriveFetchVariants works out (in parallel) and merges them exactly like
 * a single fetchFromAllSources call - de-duplicated by URL, sorted by
 * recency, with each variant's errors combined and de-duplicated. When
 * personalization is off, or there's no conflict to backfill, this is
 * identical to a single fetchFromAllSources call.
 */
export async function fetchPersonalizedFeed(
  providers: NewsProvider[],
  filters: SearchFilters,
  preferences: UserPreferences,
  personalizedMode: boolean,
  signal?: AbortSignal,
): Promise<FetchArticlesResult> {
  const variants = deriveFetchVariants(filters, preferences, personalizedMode);

  const results = await Promise.all(
    variants.map((variant) => fetchFromAllSources(providers, variant, signal)),
  );

  const articles = dedupeAndSort(results.flatMap((r) => r.articles));
  const errors = dedupeErrors(results.flatMap((r) => r.errors));

  return { articles, errors };
}
