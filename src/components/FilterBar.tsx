import { CATEGORIES, type NewsProvider, type SearchFilters, type SourceId } from '../types';
import { AddFilterMenu, type FilterDef, type FilterOption } from './AddFilterMenu';

interface FilterBarProps {
  filters: SearchFilters;
  onChange: (updater: Partial<SearchFilters>) => void;
  onReset: () => void;
  providers: NewsProvider[];
}

interface Chip {
  key: string;
  text: string;
  remove: () => void;
}

function formatCategory(category: string): string {
  return category[0].toUpperCase() + category.slice(1);
}

function formatDateRange(dateFrom: string | null, dateTo: string | null): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  if (dateFrom) return `From ${fmt(dateFrom)}`;
  return `Until ${fmt(dateTo!)}`;
}

const dateFieldClass =
  'flex flex-col gap-1 text-xs font-medium text-ink-100 [&_input]:rounded-md [&_input]:border [&_input]:border-paper-300 [&_input]:bg-paper-50 [&_input]:px-2.5 [&_input]:py-1.5 [&_input]:text-sm [&_input]:text-ink-900 [&_input]:dark:border-dark-border [&_input]:dark:bg-dark-bg [&_input]:dark:text-dark-text';

/**
 * Applied-filter-chips pattern: an active filter is a removable chip, not a
 * dropdown that always occupies space. New filters come from the "+ Add
 * filter" menu, which only offers filter types that aren't already applied.
 */
export function FilterBar({ filters, onChange, onReset, providers }: FilterBarProps) {
  const categoryOptions: FilterOption[] = CATEGORIES.map((category) => ({
    value: category,
    label: formatCategory(category),
  }));

  const sourceOptions: FilterOption[] = providers.map((provider) => ({
    value: provider.meta.id,
    label: provider.meta.label + (provider.meta.isConfigured ? '' : ' (not configured)'),
    disabled: !provider.meta.isConfigured,
  }));

  const chips: Chip[] = [];

  if (filters.category) {
    chips.push({
      key: 'category',
      text: `Category: ${formatCategory(filters.category)}`,
      remove: () => onChange({ category: null }),
    });
  }

  if (filters.source) {
    const provider = providers.find((p) => p.meta.id === filters.source);
    chips.push({
      key: 'source',
      text: `Source: ${provider?.meta.label ?? filters.source}`,
      remove: () => onChange({ source: null }),
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      key: 'date',
      text: `Date: ${formatDateRange(filters.dateFrom, filters.dateTo)}`,
      remove: () => onChange({ dateFrom: null, dateTo: null }),
    });
  }

  const definitions: FilterDef[] = [
    {
      key: 'category',
      label: 'Category',
      active: Boolean(filters.category),
      options: categoryOptions,
      onPick: (value) => onChange({ category: value }),
    },
    {
      key: 'source',
      label: 'Source',
      active: Boolean(filters.source),
      options: sourceOptions,
      onPick: (value) => onChange({ source: value as SourceId }),
    },
    {
      key: 'date',
      label: 'Date range',
      active: Boolean(filters.dateFrom || filters.dateTo),
      renderCustom: (close) => (
        <div className="flex flex-col gap-3 p-2.5">
          <label className={dateFieldClass}>
            <span>From</span>
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              max={filters.dateTo ?? undefined}
              onChange={(e) => onChange({ dateFrom: e.target.value || null })}
            />
          </label>
          <label className={dateFieldClass}>
            <span>To</span>
            <input
              type="date"
              value={filters.dateTo ?? ''}
              min={filters.dateFrom ?? undefined}
              onChange={(e) => onChange({ dateTo: e.target.value || null })}
            />
          </label>
          <button
            type="button"
            className="self-end rounded-md bg-ink-900 px-3 py-1.5 text-xs font-semibold text-paper-100 dark:bg-dark-text dark:text-dark-bg"
            onClick={close}
          >
            Apply
          </button>
        </div>
      ),
    },
  ];

  const hasActiveFilters = Boolean(filters.keyword) || chips.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="flex items-center gap-2 whitespace-nowrap rounded-pill bg-ink-900 py-1.5 pr-1.5 pl-3.5 text-xs font-semibold text-paper-100 dark:bg-dark-text dark:text-dark-bg"
        >
          {chip.text}
          <button
            type="button"
            aria-label={`Remove ${chip.text} filter`}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/15 text-[11px] leading-none hover:bg-white/25 dark:bg-black/10 dark:hover:bg-black/20"
            onClick={chip.remove}
          >
            ×
          </button>
        </span>
      ))}

      <AddFilterMenu definitions={definitions} />

      {hasActiveFilters && (
        <button
          type="button"
          className="ml-1 text-xs text-ink-100 underline decoration-1 underline-offset-2 hover:text-red-700 dark:hover:text-red-400"
          onClick={onReset}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
