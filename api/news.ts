const NEWSAPI_URL = 'https://newsapi.org/v2/everything';

const ALLOWED_PARAMS = [
  'q',
  'qInTitle',
  'from',
  'to',
  'language',
  'sortBy',
  'pageSize',
] as const;

interface VercelRequestLike {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponseLike {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    send: (body: string) => void;
  };
}

/**
 * Same-origin proxy for NewsAPI. The free Developer plan rejects browser
 * calls from any origin other than localhost (corsNotAllowed / 426), so
 * the client talks to /api/news and this function adds the API key on the
 * server. Used by Vercel; Vite and nginx provide the same path locally.
 */
export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'GET') {
    res.status(405).json({ status: 'error', message: 'Method not allowed' });
    return;
  }

  const apiKey = (process.env.NEWSAPI_KEY || process.env.VITE_NEWSAPI_KEY || '').trim();
  if (!apiKey) {
    res.status(503).json({
      status: 'error',
      message: 'NewsAPI is not configured on the server',
    });
    return;
  }

  const upstream = new URL(NEWSAPI_URL);
  const query = req.query ?? {};
  for (const key of ALLOWED_PARAMS) {
    const value = query[key];
    const scalar = Array.isArray(value) ? value[0] : value;
    if (scalar) upstream.searchParams.set(key, scalar);
  }
  upstream.searchParams.set('apiKey', apiKey);

  try {
    const response = await fetch(upstream);
    const body = await response.text();
    res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
    res.status(response.status).send(body);
  } catch {
    res.status(502).json({ status: 'error', message: 'Failed to reach NewsAPI' });
  }
}
