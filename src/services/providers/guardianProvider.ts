import type { Article, NewsProvider, SearchFilters } from '../../types';
import { API_CONFIG, isConfigured } from '../config';
import { fetchJson } from '../httpClient';
import { normalizeCategory } from '../../utils/normalizeCategory';

// --- The Guardian Content API response shape (only the fields we use) ---
interface GuardianResult {
  id: string;
  webTitle: string;
  webUrl: string;
  webPublicationDate: string;
  sectionName: string;
  fields?: {
    thumbnail?: string;
    trailText?: string;
    byline?: string;
  };
}

interface GuardianResponse {
  response: {
    status: string;
    results: GuardianResult[];
  };
}

const BASE_URL = 'https://content.guardianapis.com/search';

function toArticle(raw: GuardianResult): Article {
  return {
    id: raw.id,
    source: 'guardian',
    sourceLabel: 'The Guardian',
    title: raw.webTitle,
    description: raw.fields?.trailText ?? null,
    url: raw.webUrl,
    imageUrl: raw.fields?.thumbnail ?? null,
    author: raw.fields?.byline ?? null,
    category: normalizeCategory(raw.sectionName),
    publishedAt: raw.webPublicationDate,
  };
}

export function createGuardianProvider(): NewsProvider {
  const apiKey = API_CONFIG.guardianApiKey;

  return {
    meta: { id: 'guardian', label: 'The Guardian', isConfigured: isConfigured(apiKey) },

    async fetchArticles(filters: SearchFilters): Promise<Article[]> {
      if (!isConfigured(apiKey)) return [];

      const params = new URLSearchParams({
        'api-key': apiKey,
        'show-fields': 'thumbnail,trailText,byline',
        'page-size': '30',
        'order-by': 'newest',
      });

      if (filters.keyword) params.set('q', filters.keyword);
      if (filters.category) params.set('section', filters.category);
      if (filters.dateFrom) params.set('from-date', filters.dateFrom);
      if (filters.dateTo) params.set('to-date', filters.dateTo);

      const data = await fetchJson<GuardianResponse>(`${BASE_URL}?${params.toString()}`);
      if (data.response.status !== 'ok') {
        throw new Error('Guardian API request failed');
      }
      return data.response.results.map(toArticle);
    },
  };
}
