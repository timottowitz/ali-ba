# ali-ba — 
This project implements a product/supplier marketplace with Convex backend and Vite/TanStack frontend.

Highlights
- Chunk-based semantic search (Phase 3) with parent aggregation
- Hybrid fusion + trust boosts (Phase 4)
- Optional reranking with timeout/fallback (Phase 5)
- Eval harness + CSV/CI smoke tools (Phase 6)
- Demo seeding: Sonora screw manufacturer + three screw products
- “Why?” snippet badge showing top matching chunk

Dev
- npm ci
- npm run dev (starts Vite + Convex with PnP disabled)
- If you prefer to run Convex once: npx convex dev --once

Turbo (optional)
- Orchestrate workspace dev across apps/* and packages/* with Turborepo:
  - npm run dev:turbo
  - This runs “dev” in parallel in relevant workspaces and uses the root scripts (Vite + Convex no‑PnP).
  - You don’t need a global turbo install; it’s included as a devDependency.

Seeding
- Open /admin/seed-demo and click “Run Seeding”

Notes
- Keep .env.local out of git. Use VITE_CONVEX_URL and Convex deploy vars locally.

ZeroEntropy (optional)
- Server‑side only; set `ZEROENTROPY_API_KEY` in .env.local to enable real embeddings/reranker.
- Without a key, the app falls back to lightweight embeddings and runs without rerank.
- Enable/adjust reranking and fusion in `/admin/search-settings`.

Admin: Search Settings
- Open `/admin/search-settings` to tune ranking at runtime.
- Settings (stored in `searchSettings`):
  - Core
    - `defaultLimit`: default page size for hybrid results
    - `reindexBatchSize`: page size for background reindex jobs
  - Hybrid fusion (weights)
    - `hybridKwWeight` (default 0.5): weight for keyword rank
    - `hybridSemWeight` (default 0.5): weight for semantic rank
  - Trust boosts (added to hybrid score)
    - `boostVerified` (e.g., 0.08), `boostGoldVerified` (e.g., 0.12)
    - `boostTradeAssurance` (e.g., 0.08)
    - `boostServiceRatingMultiplier` (e.g., 0.02) × (serviceRating/5)
    - `boostResponseRateMultiplier` (e.g., 0.01) × (responseRate/100)
  - Reranker
    - `rerankEnabled`: on/off (default false)
    - `rerankTopK`: parents to rerank (e.g., 50–100)
    - `rerankTimeoutMs`: timeout per rerank call (default 1200ms)
    - `rerankWeight`: blend factor with hybrid score (default 0.5)
  - Interleave (legacy knobs)
    - `interleaveKeyword`, `interleaveSemantic`: supplier fuse step only; final scoring still uses weights above

Admin: Reindex
- Open `/admin/reindex` to (re)build embeddings:
  - Products: upsert product chunks for all products
  - Suppliers: upsert supplier chunks for all suppliers
- Use when bulk-importing data, adjusting chunking, or after first-time ZeroEntropy key configuration.

Recommended starting points
- Fusion: `hybridKwWeight=0.5`, `hybridSemWeight=0.5`
- Trust boosts: `boostVerified=0.08`, `boostGoldVerified=0.12`, `boostTradeAssurance=0.08`, `boostServiceRatingMultiplier=0.02`, `boostResponseRateMultiplier=0.01`
- Rerank (optional): `rerankEnabled=false` initially; then try `rerankTopK=75`, `rerankTimeoutMs=1200`, `rerankWeight=0.5` and iterate with evals.
