import type { Article, NewsProvider, SearchFilters } from "../../types";
import { isNewsApiConfigured } from "../config";
import { fetchJson } from "../httpClient";
import { normalizeCategory } from "../../utils/normalizeCategory";

// --- NewsAPI.org response shape (only the fields we use) ---
interface NewsApiArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
}

interface NewsApiResponse {
  status: "ok" | "error";
  message?: string;
  articles?: NewsApiArticle[];
}

// Same-origin proxy (Vercel function, Vite dev proxy, or nginx). NewsAPI's
// Developer plan rejects browser requests from any origin other than localhost.
const BASE_URL = "/api/news";

function toArticle(raw: NewsApiArticle, category: string | null): Article {
  return {
    id: raw.url,
    source: "newsapi",
    sourceLabel: raw.source?.name ?? "NewsAPI",
    title: raw.title,
    description: raw.description,
    url: raw.url,
    imageUrl: raw.urlToImage,
    author: raw.author,
    // NewsAPI's /everything endpoint has no category field, so we echo
    // back the category the user filtered on (if any) so downstream
    // client-side category badges/filters stay consistent.
    category: normalizeCategory(category),
    publishedAt: raw.publishedAt,
  };
}

export function createNewsApiProvider(): NewsProvider {
  return {
    meta: {
      id: "newsapi",
      label: "NewsAPI",
      isConfigured: isNewsApiConfigured(),
    },

    async fetchArticles(filters: SearchFilters): Promise<Article[]> {
      if (!isNewsApiConfigured()) return [];

      const params = new URLSearchParams({
        language: "en",
        sortBy: "publishedAt",
        pageSize: "30",
      });

      // NewsAPI's /everything has no real category classification (see
      // toArticle) - a category selection is approximated by requiring the
      // category word to appear in the article's TITLE specifically
      // (qInTitle), not just anywhere in the full body text. Folding it
      // into the same full-text `q` match as the keyword - sorted by
      // publishedAt, not relevance - let through articles that only
      // mention the word in passing; qInTitle is a much tighter signal
      // that the article is actually about that topic.
      const keyword = filters.keyword.trim();
      if (keyword) params.set("q", keyword);
      if (filters.category) params.set("qInTitle", filters.category);
      // /everything requires at least one of q/qInTitle/sources/domains -
      // fall back to a broad query so browsing with no keyword or category
      // still returns results.
      if (!keyword && !filters.category) params.set("q", "news");

      if (filters.dateFrom) params.set("from", filters.dateFrom);
      if (filters.dateTo) params.set("to", filters.dateTo);

      const data = await fetchJson<NewsApiResponse>(
        `${BASE_URL}?${params.toString()}`,
      );
      if (data.status !== "ok") {
        throw new Error(data.message ?? "NewsAPI request failed");
      }
      return (data.articles ?? []).map((a) => toArticle(a, filters.category));
    },
  };
}
