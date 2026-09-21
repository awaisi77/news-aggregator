import { useMemo } from 'react';
import { ArticleGrid } from './components/ArticleGrid';
import { ErrorBanner } from './components/ErrorBanner';
import { FilterBar } from './components/FilterBar';
import { PersonalizeControl } from './components/PersonalizeControl';
import { SearchBar } from './components/SearchBar';
import { TopProgressBar } from './components/TopProgressBar';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { useArticleSearch } from './hooks/useArticleSearch';
import { getAllProviders } from './services/newsAggregator';
import { applyPersonalization } from './utils/dedupeArticles';

function AppContent() {
  const providers = useMemo(() => getAllProviders(), []);
  const { preferences, personalizedMode } = usePreferences();
  const { filters, setFilters, resetFilters, articles, isLoading, errors, hasConfiguredSources } =
    useArticleSearch(preferences, personalizedMode);
  const visibleArticles = useMemo(
    () => applyPersonalization(articles, preferences, personalizedMode),
    [articles, preferences, personalizedMode],
  );

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-paper-300 bg-paper-100 p-4 sm:gap-3 sm:px-6 sm:py-4 dark:border-dark-border dark:bg-dark-bg">
        <TopProgressBar active={isLoading} />
        <div className="flex items-center justify-between gap-3 sm:gap-5">
          <h1 className="m-0 flex items-baseline gap-px">
            <span className="font-display text-xl font-bold text-ink-900 dark:text-dark-text">News</span>
            <span className="font-display text-xl font-medium italic text-clay-500 dark:text-clay-400">
              Desk
            </span>
          </h1>
          <PersonalizeControl providers={providers} />
        </div>
        <SearchBar value={filters.keyword} onChange={(keyword) => setFilters({ keyword })} />
        <FilterBar filters={filters} onChange={setFilters} onReset={resetFilters} providers={providers} />
      </header>

      <main className="mx-auto max-w-[1200px] px-4 pt-5 pb-15 sm:px-6 sm:pt-6">
        <ErrorBanner errors={errors} />
        <ArticleGrid
          articles={visibleArticles}
          isLoading={isLoading}
          hasConfiguredSources={hasConfiguredSources}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <PreferencesProvider>
      <AppContent />
    </PreferencesProvider>
  );
}
