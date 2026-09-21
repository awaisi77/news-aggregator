import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function loadProvider(apiKey: string) {
  vi.resetModules();
  vi.stubEnv('VITE_GUARDIAN_API_KEY', apiKey);
  const mod = await import('../guardianProvider');
  return mod.createGuardianProvider();
}

describe('guardianProvider', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('is not configured without an API key', async () => {
    const provider = await loadProvider('');
    expect(provider.meta.isConfigured).toBe(false);
  });

  it('maps the Guardian response shape into the common Article shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          response: {
            status: 'ok',
            results: [
              {
                id: 'world/2026/article',
                webTitle: 'A world event',
                webUrl: 'https://theguardian.com/world/2026/article',
                webPublicationDate: '2026-03-01T00:00:00Z',
                sectionName: 'World news',
                fields: {
                  thumbnail: 'https://media.guim.co.uk/thumb.jpg',
                  trailText: 'A short summary',
                  byline: 'Alex Reporter',
                },
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const provider = await loadProvider('test-key');
    const result = await provider.fetchArticles({
      keyword: 'election',
      category: null,
      source: null,
      dateFrom: '2026-01-01',
      dateTo: '2026-03-01',
    });

    expect(result).toEqual([
      {
        id: 'world/2026/article',
        source: 'guardian',
        sourceLabel: 'The Guardian',
        title: 'A world event',
        description: 'A short summary',
        url: 'https://theguardian.com/world/2026/article',
        imageUrl: 'https://media.guim.co.uk/thumb.jpg',
        author: 'Alex Reporter',
        category: 'world',
        publishedAt: '2026-03-01T00:00:00Z',
      },
    ]);
  });

  it('throws when the Guardian API reports a non-ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ response: { status: 'error', results: [] } }), { status: 200 }),
    );
    const provider = await loadProvider('test-key');
    await expect(
      provider.fetchArticles({ keyword: '', category: null, source: null, dateFrom: null, dateTo: null }),
    ).rejects.toThrow('Guardian API request failed');
  });
});
