import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SourceId, UserPreferences } from '../types';
import { readStorage, writeStorage } from '../utils/storage';

const STORAGE_KEY = 'news-aggregator.preferences.v1';
const PERSONALIZED_MODE_KEY = 'news-aggregator.personalized-mode.v1';

const EMPTY_PREFERENCES: UserPreferences = { sources: [], categories: [], authors: [] };

interface PreferencesContextValue {
  preferences: UserPreferences;
  personalizedMode: boolean;
  setPersonalizedMode: (enabled: boolean) => void;
  toggleSource: (source: SourceId) => void;
  toggleCategory: (category: string) => void;
  addAuthor: (author: string) => void;
  removeAuthor: (author: string) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    readStorage(STORAGE_KEY, EMPTY_PREFERENCES),
  );
  const [personalizedMode, setPersonalizedModeState] = useState<boolean>(() =>
    readStorage(PERSONALIZED_MODE_KEY, false),
  );

  function persist(next: UserPreferences) {
    setPreferences(next);
    writeStorage(STORAGE_KEY, next);
  }

  function setPersonalizedMode(enabled: boolean) {
    setPersonalizedModeState(enabled);
    writeStorage(PERSONALIZED_MODE_KEY, enabled);
  }

  function toggleSource(source: SourceId) {
    const has = preferences.sources.includes(source);
    persist({
      ...preferences,
      sources: has
        ? preferences.sources.filter((s) => s !== source)
        : [...preferences.sources, source],
    });
  }

  function toggleCategory(category: string) {
    const has = preferences.categories.includes(category);
    persist({
      ...preferences,
      categories: has
        ? preferences.categories.filter((c) => c !== category)
        : [...preferences.categories, category],
    });
  }

  function addAuthor(author: string) {
    const trimmed = author.trim();
    if (!trimmed || preferences.authors.includes(trimmed)) return;
    persist({ ...preferences, authors: [...preferences.authors, trimmed] });
  }

  function removeAuthor(author: string) {
    persist({ ...preferences, authors: preferences.authors.filter((a) => a !== author) });
  }

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      personalizedMode,
      setPersonalizedMode,
      toggleSource,
      toggleCategory,
      addAuthor,
      removeAuthor,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preferences, personalizedMode],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
}
