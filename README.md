# LinkForge — Intelligent Internal Linking Platform

LinkForge is an enterprise-grade internal linking automation platform that uses AI-powered semantic analysis to discover, score, and inject internal links across your website content.

## What It Does

1. **Crawl** — Discovers all pages on your site via sitemap parsing and BFS link discovery
2. **Embed** — Computes semantic embeddings for each page using AI (Gemini 2.5 via Lovable AI gateway)
3. **Suggest** — Finds semantically related pages and generates link suggestions with anchor text
4. **Inject** — Applies approved link suggestions directly to your WordPress content

## Architecture

```
src/
├── contexts/              # Domain-Driven Design bounded contexts
│   ├── link-automation/   # Core pipeline: crawl → embed → suggest → inject
│   │   ├── ports/         # Hexagonal architecture interfaces
│   │   ├── services/      # BatchOrchestrator, LinkScanner
│   │   └── state/         # Zustand store
│   ├── vector-analysis/   # Embedding storage & similarity search
│   ├── wordpress/         # WP REST API integration (via edge functions)
│   ├── analytics/         # Event tracking & metrics
│   └── concurrency/       # Rate limiting & task queuing
├── shared/kernel/         # Resilience primitives
│   ├── Result.ts          # Monadic Result<T, E> for error handling
│   ├── CircuitBreaker.ts  # State-machine circuit breaker
│   ├── Retry.ts           # Exponential backoff with jitter
│   ├── Timeout.ts         # Async timeout wrapper
│   ├── EventBus.ts        # Typed pub/sub event system
│   └── BrandedTypes.ts    # Nominal types for domain IDs
├── pages/                 # React pages (Sites, SiteDetail, Analytics, etc.)
└── components/            # UI components (Shadcn/Radix)

supabase/functions/        # Edge Functions
├── site-crawl/            # BFS page discovery with sitemap parsing
├── compute-embeddings/    # AI embedding generation
├── wp-proxy/              # WordPress REST API proxy
└── wp-update/             # WordPress content update
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn/UI
- **Backend**: Supabase (Postgres + pgvector, Edge Functions, Realtime)
- **AI**: Gemini 2.5 Flash via Lovable AI gateway for embeddings
- **State**: Zustand (client state) + React Query (server state)
- **Testing**: Vitest (unit) + Playwright (E2E)

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `Result<T, E>` monads | No thrown exceptions in service layer; explicit error handling |
| Branded types | Prevent mixing `PostId` with `SiteId` at compile time |
| Circuit breaker + retry | Enterprise resilience for external API calls |
| Edge functions for WP | Never expose WordPress credentials to the client |
| pgvector similarity | Scalable semantic search within Postgres |
| Hexagonal ports | Decouple business logic from Supabase/AI providers |

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

Automatically configured via Lovable:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Edge function secrets (configured in Supabase dashboard):
- `LOVABLE_API_KEY` — For AI embedding generation
- `SUPABASE_SERVICE_ROLE_KEY` — For server-side DB operations

## Testing

```bash
npm run test          # Unit tests (Vitest)
npx playwright test   # E2E tests
```

## License

Proprietary — All rights reserved.
