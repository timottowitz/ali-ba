Agent guide: TanStack Start + Turborepo + Convex + MCP

Scope
- This guide applies to the entire repository at this path and all subfolders.
- It tells Codex (and other agents) exactly how to run, build, and extend this stack.

Stack overview
- Frontend: TanStack Start (SSR) with @tanstack/react-router and Vite.
- Monorepo: Turborepo (npm workspaces: apps/*, packages/*), configured via turbo.json.
- Backend: Convex functions in ./convex, served by convex dev and deployed via Convex Cloud.
- Auth: @convex-dev/auth integrated in Convex and React client.
- MCP: A Convex MCP server is available for tool-driven automation.

Prerequisites
- Node.js 20+ (22.x works). Use system npm in this repo (package-lock.json present).
- Convex CLI installed globally: npm i -g convex
- Optional: Turbo CLI for orchestrated runs: npm i -g turbo

Environment
- Local variables live in .env.local (not committed):
  - VITE_CONVEX_URL=https://<deployment>.convex.cloud
  - CONVEX_DEPLOYMENT=dev:<name> (set automatically by convex dev --once)
  - CONVEX_DEPLOY_KEY=... (only for deploy)
  - ZEROENTROPY_API_KEY=... (optional: better embeddings/reranker; otherwise falls back)
- Some Convex files reference process.env.CONVEX_SITE_URL; set for auth callbacks if needed.

Install
- From repo root:
  - npm ci

Run (developer mode)
- Simple: npm run dev
  - Starts Vite dev server + Convex dev with PnP disabled (works in Yarn PnP environments).
- Individually:
  - Frontend: npm run dev:frontend (Vite + TanStack Start)
  - Backend: npm run dev:backend:nopnp (convex dev with PnP disabled)
- With Turborepo (optional):
  - npm run dev:turbo (turbo run dev --parallel)

Build
- Frontend build: npm run build (Vite build)
- Types and codegen: convex dev --once or convex codegen runs generate under convex/_generated

Convex notes
- Add queries/mutations in ./convex/*.ts using query(...) and mutation(...).
- Client imports use api from convex/_generated/api in the frontend.
- Regenerate types after changes: convex dev --once (or keep convex dev running).
- If you must run Convex manually in a PnP environment, set:
  - PNP_DISABLE=1 YARN_ENABLE_PNP=0 YARN_NODE_LINKER=node-modules npx convex dev --once

TanStack Start notes
- App lives under apps/web/app with file-based routes in app/routes.
- Router is configured in apps/web/app/router.tsx. Add new routes using createFileRoute.
- SSR entrypoints: apps/web/app/server.tsx and apps/web/app/client.tsx.
- apps/web/package.json exists to let Turbo discover the web app; root scripts delegate dev/build.

MCP integration
- Project-level MCP config exists at ./.mcp.json (gitignored). It starts the Convex MCP server with the project’s deployment/env.
- Tools exposed by the MCP server:
  - ping: connectivity check
  - convex_call: call any Convex query or mutation by name with JSON args
- Example calls (via MCP Inspector):
  - Query products: { operation: "query", name: "products:searchProducts", args: { query: "plastic", limit: 5 } }
  - Query suppliers: { operation: "query", name: "suppliers:searchSuppliers", args: { query: "textile", limit: 10 } }

Using Codex CLI in this repo
- Recommended defaults:
  - Workdir: codex -C .
  - Sandbox: --sandbox workspace-write
  - Approvals: -a on-request (or --full-auto for fast iteration)
- Model profiles (if Codex supports Anthropic provider):
  - claude_code: -p claude_code (Claude 3.5 Sonnet) for coding tasks
  - claude_opus: -p claude_opus (Claude 3 Opus) for reasoning-heavy tasks
- Examples:
  - Start a coding session focused on this repo: codex -C . -p claude_code --sandbox workspace-write -a on-request
  - Run a one-off command: codex exec -C . -m o3-mini --skip-git-repo-check "List Convex functions and add a mutation to suppliers.ts"

Agent conventions (follow these when editing)
- Keep changes minimal and focused; don’t refactor unrelated areas.
- When adding Convex functions, update types via convex dev --once and verify imports to convex/_generated/api.
- When adding routes, prefer file-based routes under apps/web/app/routes.
- Prefer npm over pnpm/yarn in this repo unless explicitly instructed.
- Never commit secrets. .mcp.json is gitignored. Keep .env.local local-only.

Common issues & fixes
- Convex codegen missing: run convex dev --once and re-run build/dev.
- TanStack Start routes not discovered: ensure file lives under apps/web/app/routes and uses createFileRoute.
- MCP server won’t start: ensure CONVEX_DEPLOYMENT_URL and CONVEX_DEPLOY_KEY are set in the environment that launches the MCP server.

Deployment (overview)
- Convex: convex deploy (requires proper CONVEX_DEPLOY_KEY). Prefer running deploy outside Yarn PnP envs.
- Frontend: build artifacts via Vite; deploy per your host’s SSR guide (TanStack Start + Node adapter).

Workspaces & Turbo
- Workspaces: ["apps/*", "packages/*"]
- Useful scripts:
  - Root dev (default): npm run dev (Vite + Convex, PnP disabled)
  - Turbo dev: npm run dev:turbo (turbo run dev --parallel)
  - Turbo build: npm run build:turbo
  - Turbo lint: npm run lint:turbo
  - Turbo type-check: npm run type-check

Package manager conventions
- Use npm in this repo. .npmrc is present to enforce npm usage.
- .yarnrc.yml sets nodeLinker: node-modules to avoid Yarn Plug’n’Play.

Seeding & demo
- UI seeding route: /admin/seed-demo seeds a Sonora screw manufacturer + 3 screw products and builds chunks.
- Script alternative: node scripts/seed-demo.mjs (requires VITE_CONVEX_URL or NEXT_PUBLIC_CONVEX_URL).

Eval loop
- Action: search.runSearchEvals accepts a dataset (products/suppliers with relevantIds) and returns per-query metrics + summary.
- Tools: search-evals/to-csv.mjs converts results JSON to CSV; a CI smoke workflow validates tooling.

Search pipeline (Phases 3–5)
- Chunk-based retrieval over searchChunks with cosine; prefilter via search index and metadata.
- Parent aggregation via max-chunk similarity per parent; optional reranker with timeout + fallback.
- Hybrid fusion uses weights + trust boosts from searchSettings.

Common issues & fixes
- Convex codegen missing: run convex dev --once (or keep dev running).
- PnP-related import failures (convex/*): use npm run dev or backend:nopnp script, or set the PnP-disabling env vars above.
- Routes not discovered: ensure files live under apps/web/app/routes and use createFileRoute.

Search System
- Overview
  - Keyword search (Convex search indexes) + filter-first pagination for core UX.
  - Semantic search (scaffolded) via `convex/search.ts` with an embeddings table; ZeroEntropy is present as a dependency but not yet wired.

- Keyword search (Convex)
  - Root products: search index `search_title` on `products.title.en` with `filterFields` for common filters.
    - Queries: `products.listProductsPaged`, `products.searchProductsPaged`.
    - Accepted filters (applied per page): `minPrice`, `maxPrice`, `minMOQ`, `maxMOQ`, `minLeadTimeSample`, `maxLeadTimeSample`, `verifiedOnly`, `tradeAssuranceOnly`, `minResponseRate`.
  - Shared package products: legacy index `search_products` on `name` (used by legacy UI only). New UI should call root queries above.
  - Suppliers: `suppliers.searchSuppliers` uses field filters (country/state/verification/badges/languages/certifications/minResponseRate). No search index is required yet; add one if full‑text over companyName is needed.

ZeroEntropy Integration (optional)
- Overview
  - The code integrates ZeroEntropy for embeddings and reranking on the server only (Convex actions/queries).
  - If ZEROENTROPY_API_KEY is not set or the SDK isn’t available, the system falls back to lightweight token‑hash embeddings and skips reranking.
- Embeddings
  - Location: `convex/search.ts` → `generateEmbedding`.
  - Behavior: Attempts `import("zeroentropy")` and calls `ze.embed({ apiKey, input })`; otherwise returns a 32‑dim token‑hash vector.
  - Storage: (legacy) document‑level in `searchEmbeddings`; primary path uses chunk‑level embeddings in `searchChunks` for retrieval.
  - Reindex jobs:
    - Products: `search.reindexAllProductChunks` (chunk + embed per product)
    - Suppliers: `search.reindexAllSupplierChunks`
  - Hooks: product/supplier upserts call `upsert*Chunks` to keep chunks fresh.
- Chunking
  - Location: `convex/search.ts` → `chunkText`. External chunker is disabled by default for reliability; a sentence‑grouping fallback is used.
  - Each chunk is embedded via `generateEmbedding` and stored in `searchChunks` with parent ID and language.
- Reranker
  - Location: `convex/search.ts` → `rerankWithTimeout`.
  - Behavior: Tries `ze.rerank({ apiKey, query, texts })`, otherwise `crossEncode`, with a per‑call timeout; results are normalized to [0,1] and blended.
  - Applied to top‑K candidates in `hybridSearchProducts` and `hybridSearchSuppliers` when enabled.
- Configuration
  - Env var (server‑side only): `ZEROENTROPY_API_KEY`
  - Tuning via `searchSettings` (Convex table; admin page at `/admin/search-settings`):
    - `rerankEnabled` (bool, default false)
    - `rerankTopK` (default 75)
    - `rerankTimeoutMs` (default 1200)
    - `rerankWeight` (default 0.5)
    - Fusion weights: `hybridKwWeight`, `hybridSemWeight` (default 0.5/0.5)
    - Trust boosts: `boostVerified`, `boostGoldVerified`, `boostTradeAssurance`, `boostServiceRatingMultiplier`, `boostResponseRateMultiplier`
- Runtime toggles & admin
  - Update settings via `/admin/search-settings` or programmatically through `search.updateSearchSettings`.
  - Default limits come from `searchSettings.defaultLimit`.
- Ops guidance
  - Keep API keys out of the browser; all calls are server‑side in Convex.
  - Start with `rerankEnabled=false` and verify quality using the eval harness before enabling.
  - Candidate sizes: vector top‑N 200–300, rerank top‑K 50–100 are typical; adjust based on latency and cost.
  - Timeout protects UX (1.2s default); reranker gracefully skips on failure.
- Observability & evaluation
  - Use `search.runSearchEvals` (Convex action) with a small gold set; compare keyword vs dense vs hybrid vs hybrid+rerank.
  - Convert results to CSV with `node search-evals/to-csv.mjs <results.json>`.
- Troubleshooting
  - No improvement after enabling rerank: confirm `ZEROENTROPY_API_KEY` and check server logs/timeouts.
  - High latency: reduce `rerankTopK` and/or increase `rerankTimeoutMs` conservatively; verify candidate pool.
  - Cost control: disable rerank during peak hours or cap rerank frequency per query.

- Filters & pagination rules
  - Paged endpoints must keep Convex paginate shape: `{ page, isDone, continueCursor }`.
  - Prefer indexed `withSearchIndex(...).eq(...)` and `.withIndex` for coarse filtering; apply fine‑grained filters on the page, then paginate forward.
  - Keep parameter names stable across API and UI (see filters listed above). For suppliers use: `verificationStatus[]`, `languages[]`, `certifications[]`, `state`, `minResponseRate`.

- Naming & structure
  - Search index names: `search_<entity>` (e.g., `search_title`, `search_products`).
  - Paged queries: `list<Entity>Paged`, `search<Entity>Paged`.
  - Keep root (./convex) as the source of truth for search endpoints; migrate legacy shared endpoints gradually.

- When adding search features
  - Update the relevant Convex schema to include searchIndex/filterFields.
  - Extend paged queries to accept new filters; surface them in UI components (ProductsPage/SuppliersPage) with minimal, accessible controls.
  - If integrating semantic search, add a fused scorer (semantic + keyword) and keep filters deterministic.
