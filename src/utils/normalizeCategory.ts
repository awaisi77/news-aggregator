import { CATEGORIES, type Category } from '../types';

/**
 * Provider category vocabularies don't line up with our own CATEGORIES
 * taxonomy, or even with themselves: the Guardian's `section` request
 * param is a lowercase slug ("world", "sport"), but the `sectionName` it
 * returns on each article is the human-readable label ("World news",
 * "Sport") - never equal to our own lowercase "world"/"sports" values, so
 * a straight string compare silently fails to match those articles for
 * category-based personalization even though the filter itself works.
 *
 * Normalizing happens once, here, at the adapter boundary - not as fuzzy
 * matching re-guessed in every consumer (personalization, filter chips,
 * category badges).
 */
const CATEGORY_ALIASES: Record<string, Category> = {
  sport: 'sports',
  football: 'sports',
  'world news': 'world',
};

export function normalizeCategory(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if ((CATEGORIES as readonly string[]).includes(lower)) return lower;
  // No canonical match - keep the provider's original label (still useful
  // for display) rather than discarding real information.
  return CATEGORY_ALIASES[lower] ?? raw;
}
