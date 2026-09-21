import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllProviders, fetchPersonalizedFeed } from '../services/newsAggregator';
import type { Article, SearchFilters, SourceFetchError, UserPreferences } from '../types';

const DEFAULT_FILTERS: SearchFilters = {
  keyword: '',
  category: null,
  source: null,
  dateFrom: null,
  dateTo: null,
};

const DEBOUNCE_MS = 400;

interface UseArticleSearchResult {
  filters: SearchFilters;
  setFilters: (updater: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  articles: Article[];
  isLoading: boolean;
  errors: SourceFetchError[];
  hasConfiguredSources: boolean;
}

/**
 * Owns filter state and the fetch it drives. `preferences`/`personalizedMode`
 * are passed in (rather than read from PreferencesContext directly) so this
 * hook stays a plain function of its inputs - easy to test without a
 * context provider, and it's PreferencesContext, not this hook, that owns
 * being the source of truth for personalization state.
 *
 * When personalization is on, a preference that the current filters would
 * otherwise never fetch (a preferred category/source the regular filters
 * exclude) triggers its own additional fetch via fetchPersonalizedFeed,
 * rather than only re-ranking whatever the regular filters happened to
 * return.
 */
export function useArticleSearch(
  preferences: UserPreferences,
  personalizedMode: boolean,
): UseArticleSearchResult {
  const providers = useMemo(() => getAllProviders(), []);
  const hasConfiguredSources = providers.some((p) => p.meta.isConfigured);

  const [filters, setFiltersState] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [articles, setArticles] = useState<Article[]>([]);
  const [errors, setErrors] = useState<SourceFetchError[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasConfiguredSources) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      fetchPersonalizedFeed(providers, filters, preferences, personalizedMode, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setArticles(result.articles);
          setErrors(result.errors);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, hasConfiguredSources, preferences, personalizedMode]);

  function setFilters(updater: Partial<SearchFilters>) {
    setFiltersState((prev) => ({ ...prev, ...updater }));
  }

  function resetFilters() {
    setFiltersState(DEFAULT_FILTERS);
  }

  return { filters, setFilters, resetFilters, articles, isLoading, errors, hasConfiguredSources };
}
