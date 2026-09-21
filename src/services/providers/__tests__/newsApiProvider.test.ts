import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...import.meta.env };

async function loadProvider(apiKey: string, enabled = "") {
  vi.resetModules();
  vi.stubEnv("VITE_NEWSAPI_KEY", apiKey);
  vi.stubEnv("VITE_NEWSAPI_ENABLED", enabled);
  const mod = await import("../newsApiProvider");
  return mod.createNewsApiProvider();
}

function calledUrl(): URL {
  return new URL(vi.mocked(fetch).mock.calls[0][0] as string, "http://localhost");
}

describe("newsApiProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.assign(import.meta.env, ORIGINAL_ENV);
  });

  it("reports itself as not configured when no API key is set", async () => {
    const provider = await loadProvider("");
    expect(provider.meta.isConfigured).toBe(false);
  });

  it("reports itself as configured when VITE_NEWSAPI_ENABLED is true without a client key", async () => {
    const provider = await loadProvider("", "true");
    expect(provider.meta.isConfigured).toBe(true);
  });

  it("returns an empty list without calling fetch when not configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const provider = await loadProvider("");
    const result = await provider.fetchArticles({
      keyword: "ai",
      category: null,
      source: null,
      dateFrom: null,
      dateTo: null,
    });
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("normalizes a successful response into the common Article shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          articles: [
            {
              source: { id: "bbc-news", name: "BBC News" },
              author: "Jane Doe",
              title: "Something happened",
              description: "A description",
              url: "https://bbc.com/article-1",
              urlToImage: "https://bbc.com/img.png",
              publishedAt: "2026-05-01T12:00:00Z",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const provider = await loadProvider("test-key");
    const result = await provider.fetchArticles({
      keyword: "ai",
      category: "technology",
      source: null,
      dateFrom: null,
      dateTo: null,
    });

    expect(result).toEqual([
      {
        id: "https://bbc.com/article-1",
        source: "newsapi",
        sourceLabel: "BBC News",
        title: "Something happened",
        description: "A description",
        url: "https://bbc.com/article-1",
        imageUrl: "https://bbc.com/img.png",
        author: "Jane Doe",
        category: "technology",
        publishedAt: "2026-05-01T12:00:00Z",
      },
    ]);
  });

  it("searches the category word in the title only, and the keyword across the full text, as separate params", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", articles: [] }), {
        status: 200,
      }),
    );

    const provider = await loadProvider("test-key");
    await provider.fetchArticles({
      keyword: "elections",
      category: "sports",
      source: null,
      dateFrom: null,
      dateTo: null,
    });

    const url = calledUrl();
    expect(url.pathname).toBe("/api/news");
    expect(url.searchParams.get("q")).toBe("elections");
    expect(url.searchParams.get("qInTitle")).toBe("sports");
    expect(url.searchParams.has("apiKey")).toBe(false);
  });

  it("falls back to a broad query when there is no keyword or category, so browsing still returns results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", articles: [] }), {
        status: 200,
      }),
    );

    const provider = await loadProvider("test-key");
    await provider.fetchArticles({
      keyword: "",
      category: null,
      source: null,
      dateFrom: null,
      dateTo: null,
    });

    const url = calledUrl();
    expect(url.pathname).toBe("/api/news");
    expect(url.searchParams.get("q")).toBe("news");
    expect(url.searchParams.has("qInTitle")).toBe(false);
    expect(url.searchParams.has("apiKey")).toBe(false);
  });

  it("calls the same-origin proxy when enabled without a client-side key", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", articles: [] }), {
        status: 200,
      }),
    );

    const provider = await loadProvider("", "true");
    await provider.fetchArticles({
      keyword: "ai",
      category: null,
      source: null,
      dateFrom: null,
      dateTo: null,
    });

    const url = calledUrl();
    expect(url.pathname).toBe("/api/news");
    expect(url.searchParams.has("apiKey")).toBe(false);
  });

  it("throws when the API responds with an error status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ status: "error", message: "Invalid API key" }),
        { status: 200 },
      ),
    );

    const provider = await loadProvider("bad-key");
    await expect(
      provider.fetchArticles({
        keyword: "ai",
        category: null,
        source: null,
        dateFrom: null,
        dateTo: null,
      }),
    ).rejects.toThrow("Invalid API key");
  });
});
