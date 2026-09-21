/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEWSAPI_KEY?: string;
  readonly VITE_NEWSAPI_ENABLED?: string;
  readonly VITE_GUARDIAN_API_KEY?: string;
  readonly VITE_NYTIMES_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
