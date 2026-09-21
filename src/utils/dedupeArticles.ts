import type { Article, UserPreferences } from '../types';

/**
 * Does this article match ANY of the user's preferred dimensions? Each
 * dimension only counts when the user actually set a preference for it AND
 * the article satisfies it - an unset dimension must never vacuously pass,
 * or setting just one preference (the common case) would match everything
 * on the other two dimensions.
 */
function matchesPreferences(article: Article, preferences: UserPreferences): boolean {
  const matchesSource =
    preferences.sources.length > 0 && preferences.sources.includes(article.source);
  const matchesCategory =
    preferences.categories.length > 0 && matchesCategoryPreference(article, preferences.categories);
  const matchesAuthor =
    preferences.authors.length > 0 &&
    article.author != null &&
    preferences.authors.some((a) => article.author!.toLowerCase().includes(a.toLowerCase()));

  // A match on ANY preferred dimension counts - preferences are "show me
  // more of this", not a strict AND filter.
  return matchesSource || matchesCategory || matchesAuthor;
}

/**
 * NewsAPI's /everything endpoint returns no category field at all (see
 * newsApiProvider.ts) - its articles only carry a `category` when the
 * FilterBar's own category filter happens to be set at the same time.
 * Without that structured field, a straight `article.category === pref`
 * check silently never matches those articles, so a category preference
 * would do nothing for an entire source. Falling back to a keyword search
 * over the title/description when there's no structured category gives
 * the preference a real chance to surface relevant articles from every
 * source, not just the ones that happen to report a category.
 */
function matchesCategoryPreference(article: Article, categories: string[]): boolean {
  if (article.category != null) {
    const category = article.category;
    return categories.some((c) => c.toLowerCase() === category.toLowerCase());
  }
  const haystack = `${article.title} ${article.description ?? ''}`.toLowerCase();
  return categories.some((c) => haystack.includes(c.toLowerCase()));
}

/**
 * Applies the user's saved personalization preferences to an already
 * fetched article list by RE-RANKING it, never by hiding articles: every
 * fetched article stays on the feed, matches just float above non-matches.
 * This guarantees a big story outside the user's preferences is never
 * missed - it can rank lower, but it's never removed.
 *
 * Array.prototype.sort is a stable sort (guaranteed since ES2019), so
 * within the "matches" group and within the "doesn't match" group, the
 * original order (most-recent-first, as fetched) is preserved untouched.
 */
export function applyPersonalization(
  articles: Article[],
  preferences: UserPreferences,
  enabled: boolean,
): Article[] {
  if (!enabled) return articles;

  const hasAnyPreference =
    preferences.sources.length > 0 ||
    preferences.categories.length > 0 ||
    preferences.authors.length > 0;

  if (!hasAnyPreference) return articles;

  return [...articles].sort((a, b) => {
    const aRank = matchesPreferences(a, preferences) ? 0 : 1;
    const bRank = matchesPreferences(b, preferences) ? 0 : 1;
    return aRank - bRank;
  });
}
