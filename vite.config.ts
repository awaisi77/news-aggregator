/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

function newsApiProxy(apiKey: string): Record<string, ProxyOptions> {
  return {
    '/api/news': {
      target: 'https://newsapi.org',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/news/, '/v2/everything'),
      configure(proxy) {
        proxy.on('proxyReq', (proxyReq) => {
          const url = new URL(proxyReq.path, 'https://newsapi.org');
          url.searchParams.delete('apiKey');
          if (apiKey) url.searchParams.set('apiKey', apiKey);
          proxyReq.path = `${url.pathname}${url.search}`;
        });
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const newsApiKey = (env.NEWSAPI_KEY || env.VITE_NEWSAPI_KEY || '').trim();
  const proxy = newsApiProxy(newsApiKey);

  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      css: true,
    },
  };
});
