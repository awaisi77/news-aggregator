// Tiny fetch wrapper shared by every adapter (DRY): consistent timeout,
// consistent error shape, and a single place to add retry/backoff later
// without touching each provider adapter.

export class HttpError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export async function fetchJson<T>(
  url: string,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 10_000 } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Combine an external abort signal (e.g. from a cancelled search) with
  // our own timeout signal.
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new HttpError(
        `Request failed with status ${response.status}`,
        response.status,
      );
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new HttpError('Request timed out');
    }
    throw new HttpError(err instanceof Error ? err.message : 'Unknown network error');
  } finally {
    clearTimeout(timeout);
  }
}
