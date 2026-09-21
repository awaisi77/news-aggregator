// Centralized read of API credentials from Vite env vars. Keeping this in
// one place means adapters never touch import.meta.env directly (DRY), and
// it gives us a single spot to decide "is this source configured".

export const API_CONFIG = {
  newsApiKey: import.meta.env.VITE_NEWSAPI_KEY ?? '',
  guardianApiKey: import.meta.env.VITE_GUARDIAN_API_KEY ?? '',
  nytApiKey: import.meta.env.VITE_NYTIMES_API_KEY ?? '',
} as const;

export function isConfigured(key: string): boolean {
  return key.trim().length > 0;
}
