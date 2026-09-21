import { useRef, useState } from 'react';
import { useDismissable } from '../hooks/useDismissable';
import { usePreferences } from '../context/PreferencesContext';
import type { NewsProvider } from '../types';
import { CATEGORIES } from '../types';

interface PersonalizeControlProps {
  providers: NewsProvider[];
}

const chipClass = (active: boolean) =>
  [
    'rounded-pill border px-3 py-2 text-sm transition-colors',
    active
      ? 'border-ink-900 bg-ink-900 font-semibold text-paper-100 dark:border-dark-text dark:bg-dark-text dark:text-dark-bg'
      : 'border-paper-300 bg-white text-ink-900 hover:border-clay-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text',
  ].join(' ');

/**
 * The preference controls themselves - toggle, sources, categories, authors.
 * Shared by both presentations of the control (desktop popover and the
 * mobile bottom sheet) so the two surfaces can never drift apart (DRY).
 */
function PreferenceFields({ providers }: { providers: NewsProvider[] }) {
  const {
    preferences,
    personalizedMode,
    setPersonalizedMode,
    toggleSource,
    toggleCategory,
    addAuthor,
    removeAuthor,
  } = usePreferences();
  const [authorInput, setAuthorInput] = useState('');

  function handleAddAuthor() {
    addAuthor(authorInput);
    setAuthorInput('');
  }

  return (
    <>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-paper-100 p-3 text-sm dark:bg-dark-bg">
        <span className="relative inline-flex h-6 w-[42px] shrink-0 items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={personalizedMode}
            onChange={(e) => setPersonalizedMode(e.target.checked)}
          />
          <span className="absolute inset-0 rounded-pill bg-paper-400 transition-colors peer-checked:bg-clay-500 dark:bg-dark-border" />
          <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-[18px]" />
        </span>
        Bring articles matching my preferences to the top - fetched directly if my
        current filters would otherwise miss them, never hidden
      </label>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-xs font-bold tracking-wider text-ink-100 uppercase">
          Preferred sources
        </legend>
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => (
            <button
              type="button"
              key={provider.meta.id}
              className={chipClass(preferences.sources.includes(provider.meta.id))}
              onClick={() => toggleSource(provider.meta.id)}
            >
              {provider.meta.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-xs font-bold tracking-wider text-ink-100 uppercase">
          Preferred categories
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              type="button"
              key={category}
              className={chipClass(preferences.categories.includes(category))}
              onClick={() => toggleCategory(category)}
            >
              {category[0].toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-xs font-bold tracking-wider text-ink-100 uppercase">
          Preferred authors
        </legend>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-md border border-paper-300 bg-paper-100 px-3 py-2 text-sm text-ink-900 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text"
            placeholder="Add an author name..."
            value={authorInput}
            onChange={(e) => setAuthorInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAuthor()}
          />
          <button
            type="button"
            className="rounded-md border border-ink-900 bg-ink-900 px-4 py-2 text-sm font-semibold text-paper-100 dark:border-dark-text dark:bg-dark-text dark:text-dark-bg"
            onClick={handleAddAuthor}
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {preferences.authors.map((author) => (
            <button
              type="button"
              key={author}
              className={chipClass(true)}
              onClick={() => removeAuthor(author)}
              title="Click to remove"
            >
              {author} &times;
            </button>
          ))}
          {preferences.authors.length === 0 && (
            <p className="m-0 text-sm text-ink-100">No preferred authors yet.</p>
          )}
        </div>
      </fieldset>
    </>
  );
}

/**
 * The "Personalize feed" trigger plus its two presentations:
 *  - desktop (sm and up): a popover anchored to the trigger button, no
 *    scrim - the article grid stays visible and live behind it, matching
 *    how AddFilterMenu's "+ Add filter" popover already behaves.
 *  - mobile: the original full-screen bottom sheet, unchanged.
 * Both render the same PreferenceFields body so they can't drift apart.
 */
export function PersonalizeControl({ providers }: PersonalizeControlProps) {
  const [open, setOpen] = useState(false);
  const { personalizedMode } = usePreferences();
  const rootRef = useRef<HTMLDivElement>(null);

  useDismissable(rootRef, open, () => setOpen(false));

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="whitespace-nowrap rounded-pill border border-ink-900 bg-ink-900 px-4 py-2 text-xs font-semibold text-paper-100 transition-opacity hover:opacity-85 dark:border-dark-text dark:bg-dark-text dark:text-dark-bg"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {personalizedMode ? 'Personalized feed on' : 'Personalize feed'}
      </button>

      {open && (
        <>
          <div
            className="animate-pop-in absolute top-[calc(100%+10px)] right-0 z-30 hidden w-[340px] origin-top-right flex-col gap-4 rounded-2xl border border-paper-300 bg-white p-5 shadow-xl sm:flex dark:border-dark-border dark:bg-dark-surface"
            role="dialog"
            aria-label="Personalize your feed"
          >
            <div className="flex items-center justify-between">
              <h2 className="m-0 font-display text-lg font-semibold text-ink-900 dark:text-dark-text">
                Personalize feed
              </h2>
              <button
                type="button"
                className="text-xl leading-none text-ink-100 hover:text-ink-900 dark:hover:text-dark-text"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <PreferenceFields providers={providers} />
          </div>

          <div
            className="fixed inset-0 z-100 flex items-end justify-center bg-ink-900/50 sm:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Personalize your feed"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div className="flex max-h-[88vh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-dark-surface">
              <div className="flex items-center justify-between">
                <h2 className="m-0 font-display text-xl font-semibold text-ink-900 dark:text-dark-text">
                  Personalize your feed
                </h2>
                <button
                  type="button"
                  className="text-2xl leading-none text-ink-100 hover:text-ink-900 dark:hover:text-dark-text"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <PreferenceFields providers={providers} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
