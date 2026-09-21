interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative flex items-center">
      <svg
        className="pointer-events-none absolute left-3 text-ink-100"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
      </svg>
      <input
        type="search"
        className="w-full rounded-pill border border-paper-300 bg-paper-50 py-3 pr-3 pl-9 text-base text-ink-900 placeholder:text-ink-100 focus:outline-2 focus:outline-clay-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
        placeholder="Search articles by keyword..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search articles"
      />
    </div>
  );
}
