import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function loadProvider(apiKey: string) {
  vi.resetModules();
  vi.stubEnv('VITE_NYTIMES_API_KEY', apiKey);
  const mod = await import('../nyTimesProvider');
  return mod.createNyTimesProvider();
}

describe('nyTimesProvider', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('is not configured without an API key', async () => {
    const provider = await loadProvider('');
    expect(provider.meta.isConfigured).toBe(false);
  });

  it('maps the NYT article-search response and prefixes relative image URLs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'OK',
          response: {
            docs: [
              {
                _id: 'nyt://article/123',
                headline: { main: 'Markets rally' },
                abstract: 'Stocks rose today',
                web_url: 'https://nytimes.com/2026/markets.html',
                pub_date: '2026-02-01T00:00:00Z',
                byline: { original: 'By A. Writer' },
                section_name: 'Business',
                multimedia: [{ url: 'images/2026/markets.jpg' }],
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const provider = await loadProvider('test-key');
    const result = await provider.fetchArticles({
      keyword: 'markets',
      category: 'Business',
      source: null,
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
    });

    expect(result).toEqual([
      {
        id: 'nyt://article/123',
        source: 'nytimes',
        sourceLabel: 'The New York Times',
        title: 'Markets rally',
        description: 'Stocks rose today',
        url: 'https://nytimes.com/2026/markets.html',
        imageUrl: 'https://www.nytimes.com/images/2026/markets.jpg',
        author: 'By A. Writer',
        category: 'business',
        publishedAt: '2026-02-01T00:00:00Z',
      },
    ]);
  });

  it('throws using the fault string when the NYT API reports a fault', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ERROR', fault: { faultstring: 'Invalid ApiKey' } }), { status: 200 }),
    );
    const provider = await loadProvider('bad-key');
    await expect(
      provider.fetchArticles({ keyword: '', category: null, source: null, dateFrom: null, dateTo: null }),
    ).rejects.toThrow('Invalid ApiKey');
  });
});
