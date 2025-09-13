# ali-ba — Alibaba.com Clone with Convex Backend

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
