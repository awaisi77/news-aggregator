import type { Article } from '../types';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220"><rect width="100%" height="100%" fill="%23e2e8f0"/></svg>',
  );

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function ArticleCard({ article }: { article: Article }) {
  return (
    <a
      className="group flex flex-col overflow-hidden rounded border border-paper-300 bg-white transition-[transform,border-color] hover:-translate-y-0.5 hover:border-clay-500 dark:border-dark-border dark:bg-dark-surface"
      href={article.url}
      target="_blank"
      rel="noreferrer"
    >
      <div className="relative aspect-video bg-paper-200 dark:bg-dark-surface-muted">
        <img
          className="h-full w-full object-cover"
          src={article.imageUrl ?? FALLBACK_IMAGE}
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
          }}
        />
        <span className="absolute bottom-2 left-2 rounded-pill bg-ink-900/70 px-2 py-0.5 text-xs font-semibold text-white">
          {article.sourceLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="m-0 line-clamp-3 font-display text-lg leading-snug font-semibold text-ink-900 dark:text-dark-text">
          {article.title}
        </h3>
        {article.description && (
          <p className="m-0 line-clamp-2 text-sm leading-snug text-ink-100">{article.description}</p>
        )}
        <div className="mt-auto flex justify-between gap-2 text-xs text-ink-100">
          {article.author && <span className="truncate">{article.author}</span>}
          <span>{formatDate(article.publishedAt)}</span>
        </div>
        {article.category && (
          <span className="self-start text-xs font-bold tracking-wide text-clay-500 uppercase dark:text-clay-400">
            {article.category}
          </span>
        )}
      </div>
    </a>
  );
}
