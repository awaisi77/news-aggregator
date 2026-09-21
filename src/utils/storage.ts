// Small typed wrapper around localStorage (DRY + fails safe in private
// browsing / SSR-like contexts where storage can throw).

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / privacy-mode errors - personalization is a nice-to-have,
    // never something that should crash the app.
  }
}
