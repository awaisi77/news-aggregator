import { useRef, useState, type ReactNode } from 'react';
import { useDismissable } from '../hooks/useDismissable';
import { dropdownPanelClass } from '../utils/dropdownStyles';

export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterDef {
  key: string;
  label: string;
  /** True when this filter already has a chip showing - hidden from the "add" list. */
  active: boolean;
  /** A flat list of choices, each one click away (category, source). */
  options?: FilterOption[];
  onPick?: (value: string) => void;
  /** A custom value step (e.g. a from/to date form) in place of `options`. */
  renderCustom?: (close: () => void) => ReactNode;
}

interface AddFilterMenuProps {
  definitions: FilterDef[];
}

/**
 * The "+ Add filter" trigger and its two-step popover: pick a filter type,
 * then pick its value. Mirrors the applied-filter-chips pattern from the
 * design mockup (Option D) - chips carry the applied state, this menu is
 * only for adding a filter that isn't applied yet.
 */
export function AddFilterMenu({ definitions }: AddFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    setActiveKey(null);
  }

  useDismissable(rootRef, open, close);

  const available = definitions.filter((d) => !d.active);
  const current = definitions.find((d) => d.key === activeKey);

  if (available.length === 0) return null;

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button
        type="button"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-pill border-[1.5px] border-dashed border-paper-500 px-3.5 py-2 text-xs font-semibold text-ink-500 transition-colors hover:border-ink-500 hover:text-ink-900 dark:border-dark-border dark:text-dark-text"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true" className="text-sm leading-none">
          +
        </span>
        Add filter
      </button>

      {open && (
        <div className={`${dropdownPanelClass} w-56 p-1.5`} role="menu">
          {current ? (
            <>
              <div className="flex items-center gap-1.5 px-1 pt-1 pb-2">
                <button
                  type="button"
                  className="rounded-md px-1 py-0.5 text-ink-100 hover:text-ink-900 dark:hover:text-dark-text"
                  onClick={() => setActiveKey(null)}
                  aria-label="Back to filter types"
                >
                  ‹
                </button>
                <span className="text-[11px] font-bold tracking-wider text-ink-100 uppercase">
                  {current.label}
                </span>
              </div>
              {current.renderCustom
                ? current.renderCustom(close)
                : current.options?.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitem"
                      disabled={option.disabled}
                      className="flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm text-ink-900 hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-dark-text dark:hover:bg-dark-surface-muted"
                      onClick={() => {
                        current.onPick?.(option.value);
                        close();
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
            </>
          ) : (
            <>
              <div className="px-2.5 pt-1 pb-2 text-[11px] font-bold tracking-wider text-ink-100 uppercase">
                Add a filter
              </div>
              {available.map((def) => (
                <button
                  key={def.key}
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-ink-900 hover:bg-paper-100 dark:text-dark-text dark:hover:bg-dark-surface-muted"
                  onClick={() => setActiveKey(def.key)}
                >
                  <span>{def.label}</span>
                  <span className="text-ink-100" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
