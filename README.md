# NewsDesk - Frontend Take-Home Challenge

A news aggregator built with **React + TypeScript** that pulls articles from
multiple providers, and lets a user search, filter, and personalize their
feed. Built for the Frontend Developer take-home challenge.

## What it does

- **Article search and filtering** - search by keyword and filter by date
  range, category, and source.
- **Personalized news feed** - pick preferred sources, categories, and
  authors in the "Personalize feed" panel; preferences (and the personalized
  toggle) persist in `localStorage`. Personalization re-ranks results
  (matches float up, nothing is ever hidden) and, when the active search
  filters would otherwise never fetch a preferred category or source at
  all, fetches it directly rather than silently having nothing to promote.
- **Mobile-responsive design** - single-column card grid on small screens,
  scaling up to a multi-column grid on larger viewports; the personalization
  panel becomes a bottom sheet on mobile and a centered modal on desktop.

## Data sources used (3 of the 3+ required)

| Source | Docs | Free tier |
| --- | --- | --- |
| [NewsAPI](https://newsapi.org/) | `/v2/everything` | Yes (register for a key) |
| [The Guardian](https://open-platform.theguardian.com/) | Content API `/search` | Yes ("Developer" tier) |
| [The New York Times](https://developer.nytimes.com/) | Article Search API | Yes |

The app works with **any subset** of these configured - a source with no API
key is simply skipped (and shown as "not configured" in the Source filter),
so a reviewer only needs to provide one key to see it working end to end.

## Architecture notes

- `src/types` - shared domain types, most importantly the `Article` shape
  every provider normalizes into and the `NewsProvider` interface every
  adapter implements.
- `src/services/providers/*` - one adapter per API. Each adapter only knows
  about its own provider's request/response shape and converts it to the
  common `Article` type. Adding a new source is: write one adapter file that
  implements `NewsProvider`, register it in `newsAggregator.ts` - nothing
  else in the app changes (Open/Closed Principle; the rest of the app
  depends only on the `NewsProvider` abstraction, not concrete providers -
  Dependency Inversion).
- `src/services/newsAggregator.ts` - fans a search out to every configured,
  selected provider in parallel with `Promise.allSettled`, so one provider
  being down or rate-limited never breaks the others; merges, de-duplicates
  by URL, and sorts by recency. `fetchPersonalizedFeed` builds on this: when
  personalization is on, `deriveFetchVariants` works out which additional
  filter variants (a preferred category/source the active filters would
  otherwise exclude) need fetching, runs each through `fetchFromAllSources`
  in parallel, and merges everything together the same way.
- `src/hooks/useArticleSearch.ts` - owns filter state, debounces requests
  (400ms), and cancels in-flight requests when filters change again.
- `src/context/PreferencesContext.tsx` - personalization state, persisted to
  `localStorage`, exposed via a small hook (`usePreferences`) rather than
  prop-drilling.
- `src/utils/dedupeArticles.ts` (`applyPersonalization`) - a pure function
  that RE-RANKS an already-fetched article list against saved preferences
  (matches first, nothing hidden); falls back to a title/description
  keyword check for a source with no structured category (NewsAPI). The
  fetch-time backfill lives in `newsAggregator.ts`, not here - this stays a
  pure sort with no side effects.

Followed throughout: **DRY** (shared `fetchJson` HTTP wrapper, shared
`localStorage` helpers, one `Article` shape), **KISS** (personalization's
fetch-time backfill and re-ranking are each one small, separately testable
function, not a bespoke parallel pipeline), and **SOLID** (see the
provider/adapter notes above).

## Design system

Styling is Tailwind CSS v4 (`@tailwindcss/vite`, zero-config), with the
palette, type, and radii defined once as design tokens and mapped into
Tailwind's theme rather than left as Tailwind's defaults - see the `@theme`
block in `src/index.css`. A token like `--color-clay-500` automatically
becomes real utility classes (`bg-clay-500`, `text-clay-500`,
`border-clay-500`, and their `dark:` variants); retheming only ever means
editing that one block, never hunting through components. Typography pairs
a serif display face (Fraunces, for headlines) with a sans body/UI face
(Public Sans), loaded via Google Fonts in `index.html`. Dark mode uses
Tailwind's `dark:` variant, which follows `prefers-color-scheme` by
default.

The filter controls (category, source, date range) are custom-built, not
native `<select>`/`<input type="date">` elements restyled: `Dropdown.tsx`
is a from-scratch accessible listbox (`role="listbox"`/`"option"`, full
Arrow/Home/End/Enter/Escape keyboard support, click-outside dismissal,
focus restored to the trigger on close) and `DateRangeDropdown.tsx` wraps
the two date inputs in a matching popover. Both share `useDismissable`
(`src/hooks/useDismissable.ts`) for outside-click/Escape handling and
`dropdownStyles.ts` for the trigger/panel classes, so the "click a pill,
get a popover" pattern is defined once and reused rather than copy-pasted.

## Running locally

Requires Node 20+.

```bash
npm install
cp .env.example .env
# edit .env and add at least one API key
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

### API keys

Get free keys here and put them in `.env` (see `.env.example`):

- NewsAPI: <https://newsapi.org/register>
- The Guardian: <https://open-platform.theguardian.com/access/>
- NYTimes: <https://developer.nytimes.com/get-started> (create an app with
  the "Article Search API" enabled)

Vite inlines variables prefixed `VITE_` at **build** time. NewsAPI is
different: the Developer plan rejects browser requests except from
localhost, so the app calls same-origin `/api/news` and the key stays in
`NEWSAPI_KEY` on the server (Vite proxy locally, Vercel function in
production, nginx in Docker). Set `VITE_NEWSAPI_ENABLED=true` so the UI
still turns that source on without putting the secret in the JS bundle.

Restart `npm run dev` (or rebuild) after editing `.env`.

## Deploying on Vercel

1. Import the GitHub repo (framework: Vite, output `dist`).
2. Set environment variables for Production, Preview, and Development:

| Name | Value |
| --- | --- |
| `NEWSAPI_KEY` | your NewsAPI key (server only — do **not** prefix with `VITE_`) |
| `VITE_NEWSAPI_ENABLED` | `true` |
| `VITE_GUARDIAN_API_KEY` | optional |
| `VITE_NYTIMES_API_KEY` | optional |

Do not set `VITE_NEWSAPI_KEY` on Vercel. Vite would inline it into the
client bundle, which both leaks the key and is unnecessary now that
`/api/news` attaches it on the server.

## Running with Docker

```bash
# option A: docker compose (reads .env automatically)
cp .env.example .env   # fill in at least one key; for NewsAPI set NEWSAPI_KEY and VITE_NEWSAPI_ENABLED=true
docker compose up --build
```

```bash
# option B: plain docker
docker build \
  --build-arg VITE_NEWSAPI_ENABLED=true \
  --build-arg VITE_GUARDIAN_API_KEY=your_key_here \
  --build-arg VITE_NYTIMES_API_KEY=your_key_here \
  -t news-aggregator .

docker run -p 8080:80 -e NEWSAPI_KEY=your_key_here news-aggregator
```

Either way, open <http://localhost:8080>.

The image is a multi-stage build: a Node 20 stage runs `npm ci && npm run
build`, and the final image is `nginx:alpine` serving the static `dist/`
output. nginx also reverse-proxies `/api/news` to NewsAPI using
`NEWSAPI_KEY` at container start, so that key is not baked into the JS.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |
| `npm run test` | Run the test suite once (CI mode) |
| `npm run test:watch` | Run the test suite in watch mode |

## Testing

`npm run test` runs the suite with Vitest + Testing Library (jsdom):

- `src/utils/__tests__/dedupeArticles.test.ts` - the personalization filter,
  including the OR-across-dimensions matching rules.
- `src/services/__tests__/newsAggregator.test.ts` - fan-out/merge/de-dupe
  across providers and that one provider failing doesn't break the others.
- `src/services/providers/__tests__/*.test.ts` - each adapter's response
  normalization and error handling, with `fetch` mocked.
- `src/components/__tests__/*.test.tsx` - `ArticleCard` rendering and
  `SearchBar` interaction.

## Known limitations

- NewsAPI's `/v2/everything` endpoint has no native category parameter, so
  category filtering for that source folds the category into the search
  query rather than a strict server-side filter.
- No end-to-end/integration tests against the live APIs; unit tests mock
  `fetch` so they run offline and don't burn API quota.
