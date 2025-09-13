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

Seeding
- Open /admin/seed-demo and click “Run Seeding”

Notes
- Keep .env.local out of git. Use VITE_CONVEX_URL and Convex deploy vars locally.
