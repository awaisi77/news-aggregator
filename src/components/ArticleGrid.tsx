import type { Article } from '../types';
import { ArticleCard } from './ArticleCard';

interface ArticleGridProps {
  articles: Article[];
  isLoading: boolean;
  hasConfiguredSources: boolean;
}

const statusPanelClass = 'py-15 px-5 text-center text-ink-100';
const gridClass = 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5';

export function ArticleGrid({ articles, isLoading, hasConfiguredSources }: ArticleGridProps) {
  if (!hasConfiguredSources) {
    return (
      <div className={statusPanelClass}>
        <h2 className="mb-2 font-display font-semibold text-ink-900 dark:text-dark-text">
          No news sources configured
        </h2>
        <p>
          Add at least one API key (NewsAPI, The Guardian, or The New York Times) to your{' '}
          <code>.env</code> file and restart the app. See the README for setup instructions.
        </p>
      </div>
    );
  }

  // First load / no results yet to show behind the loading state: a full
  // skeleton grid is the clearest signal.
  if (isLoading && articles.length === 0) {
    return (
      <div className={gridClass} aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            className="animate-shimmer h-80 rounded bg-[linear-gradient(90deg,var(--color-paper-200)_25%,var(--color-paper-100)_37%,var(--color-paper-200)_63%)] bg-[length:400%_100%] dark:bg-[linear-gradient(90deg,var(--color-dark-surface-muted)_25%,var(--color-dark-bg)_37%,var(--color-dark-surface-muted)_63%)]"
            key={i}
          />
        ))}
      </div>
    );
  }

  // A filter/keyword change while results are already on screen: keep the
  // current articles visible (nothing flashes to empty) but make it obvious
  // a new fetch is in flight, so the user never has to guess whether their
  // filter did anything.
  if (isLoading && articles.length > 0) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm text-ink-100" role="status" aria-live="polite">
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper-300 border-t-clay-500 dark:border-dark-border dark:border-t-clay-400"
            aria-hidden="true"
          />
          Updating results…
        </div>
        <div className={`${gridClass} pointer-events-none opacity-50 transition-opacity`} aria-busy="true">
          {articles.map((article) => (
            <ArticleCard key={`${article.source}-${article.id}`} article={article} />
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className={statusPanelClass}>
        <h2 className="mb-2 font-display font-semibold text-ink-900 dark:text-dark-text">
          No articles found
        </h2>
        <p>Try a different keyword, a wider date range, or clear your filters.</p>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {articles.map((article) => (
        <ArticleCard key={`${article.source}-${article.id}`} article={article} />
      ))}
    </div>
  );
}
