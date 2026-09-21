import type { Article, NewsProvider, SearchFilters } from '../../types';
import { API_CONFIG, isConfigured } from '../config';
import { fetchJson } from '../httpClient';
import { normalizeCategory } from '../../utils/normalizeCategory';

// --- NYTimes Article Search API response shape (only fields we use) ---
interface NytMultimedia {
  url: string;
}

interface NytDoc {
  _id: string;
  headline: { main: string };
  abstract: string | null;
  web_url: string;
  pub_date: string;
  byline: { original: string | null } | null;
  section_name: string | null;
  multimedia: NytMultimedia[] | null;
}

interface NytResponse {
  status: string;
  response?: { docs: NytDoc[] };
  fault?: { faultstring: string };
}

const BASE_URL = 'https://api.nytimes.com/svc/search/v2/articlesearch.json';

function toDateStamp(value: string | null): string | undefined {
  if (!value) return undefined;
  return value.replaceAll('-', '');
}

function toArticle(raw: NytDoc): Article {
  const image = raw.multimedia?.[0]?.url ?? null;
  return {
    id: raw._id,
    source: 'nytimes',
    sourceLabel: 'The New York Times',
    title: raw.headline.main,
    description: raw.abstract,
    url: raw.web_url,
    imageUrl: image ? `https://www.nytimes.com/${image}` : null,
    author: raw.byline?.original ?? null,
    category: normalizeCategory(raw.section_name),
    publishedAt: raw.pub_date,
  };
}

export function createNyTimesProvider(): NewsProvider {
  const apiKey = API_CONFIG.nytApiKey;

  return {
    meta: { id: 'nytimes', label: 'The New York Times', isConfigured: isConfigured(apiKey) },

    async fetchArticles(filters: SearchFilters): Promise<Article[]> {
      if (!isConfigured(apiKey)) return [];

      const params = new URLSearchParams({ 'api-key': apiKey, sort: 'newest' });
      if (filters.keyword) params.set('q', filters.keyword);

      const beginDate = toDateStamp(filters.dateFrom);
      const endDate = toDateStamp(filters.dateTo);
      if (beginDate) params.set('begin_date', beginDate);
      if (endDate) params.set('end_date', endDate);
      if (filters.category) params.set('fq', `news_desk:("${filters.category}")`);

      const data = await fetchJson<NytResponse>(`${BASE_URL}?${params.toString()}`);
      if (data.fault) throw new Error(data.fault.faultstring);
      return (data.response?.docs ?? []).map(toArticle);
    },
  };
}
