interface TopProgressBarProps {
  active: boolean;
}

/**
 * A thin, unmissable "something is happening" signal for filter/keyword
 * changes: pinned to the top edge of the sticky header so it's visible
 * whether or not the results grid itself is in view. Purely visual -
 * screen readers get the status via ArticleGrid's aria-live region instead
 * of a second, redundant announcement here.
 */
export function TopProgressBar({ active }: TopProgressBarProps) {
  if (!active) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-paper-300 dark:bg-dark-border"
      aria-hidden="true"
    >
      <div className="animate-loading-sweep h-full w-1/3 bg-clay-500 dark:bg-clay-400" />
    </div>
  );
}
