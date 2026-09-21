// Core domain types shared across the app. Every news source adapter must
// normalize its provider-specific response shape into this common Article
// contract, so the rest of the app never needs to know which API an
// article came from (Dependency Inversion / Interface Segregation).

export type SourceId = 'newsapi' | 'guardian' | 'nytimes';

export interface NewsSourceMeta {
  id: SourceId;
  label: string;
  /** True once the adapter has a usable API key/config at runtime. */
  isConfigured: boolean;
}

export interface Article {
  id: string;
  source: SourceId;
  sourceLabel: string;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  author: string | null;
  category: string | null;
  publishedAt: string; // ISO 8601
}

export interface SearchFilters {
  keyword: string;
  category: string | null;
  source: SourceId | null;
  dateFrom: string | null; // yyyy-MM-dd
  dateTo: string | null; // yyyy-MM-dd
}

export interface UserPreferences {
  sources: SourceId[];
  categories: string[];
  authors: string[];
}

export interface FetchArticlesResult {
  articles: Article[];
  errors: SourceFetchError[];
}

export interface SourceFetchError {
  source: SourceId;
  message: string;
}

/**
 * Every news provider adapter implements this interface. The rest of the
 * app depends only on this abstraction (SOLID: Dependency Inversion),
 * never on a concrete provider's SDK or REST shape.
 */
export interface NewsProvider {
  meta: NewsSourceMeta;
  fetchArticles(filters: SearchFilters): Promise<Article[]>;
}

export const CATEGORIES = [
  'general',
  'business',
  'technology',
  'science',
  'health',
  'sports',
  'entertainment',
  'world',
] as const;

export type Category = (typeof CATEGORIES)[number];
