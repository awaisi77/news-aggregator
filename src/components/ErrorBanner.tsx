import type { SourceFetchError } from '../types';

const LABELS: Record<string, string> = {
  newsapi: 'NewsAPI',
  guardian: 'The Guardian',
  nytimes: 'The New York Times',
};

export function ErrorBanner({ errors }: { errors: SourceFetchError[] }) {
  if (errors.length === 0) return null;

  return (
    <div
      className="mb-4 flex flex-col gap-1 rounded bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300"
      role="alert"
    >
      {errors.map((err) => (
        <span key={err.source}>
          {LABELS[err.source] ?? err.source}: {err.message}
        </span>
      ))}
    </div>
  );
}
