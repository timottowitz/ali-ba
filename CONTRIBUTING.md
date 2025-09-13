# Contributing Guide

Thanks for contributing to ali-ba (TanStack Start + Convex DB monorepo)!

This document covers local setup, scripts, coding conventions, PR process, and
best practices adapted from Convex + TanStack docs.

## Overview
- Monorepo: npm workspaces (apps/*, packages/*) + Turborepo
- Frontend: TanStack Start (Vite + @tanstack/react-router)
- Backend: Convex (queries/mutations/actions under `./convex`)
- Search: Keyword + Chunk Semantics + Hybrid + optional Rerank (ZeroEntropy)

## Prerequisites
- Node.js 20+ (22.x OK)
- npm (package-lock.json in repo)
- Convex CLI: `npm i -g convex`
- Optional: Turbo CLI `npm i -g turbo` (not required; we vendor turbo)

## Environment & Secrets
- Create `.env.local` (gitignored) at repo root.
  - `VITE_CONVEX_URL=https://<deployment>.convex.cloud`
  - `CONVEX_DEPLOYMENT=dev:<name>` (set by `npx convex dev --once`)
  - `CONVEX_DEPLOY_KEY=...` (only for deploy)
  - `ZEROENTROPY_API_KEY=...` (optional: embeddings/reranker)
- Never commit secrets. `.env.local` is ignored by git.
- Client env must be prefixed with `VITE_` (access via `import.meta.env`).

## Install
```bash
npm ci
```

## Run (developer mode)
- Simple default:
```bash
npm run dev
```
Starts Vite + Convex dev with Yarn PnP disabled to avoid esbuild import issues.

- With Turborepo orchestration (optional):
```bash
npm run dev:turbo
```
Runs `dev` across workspaces in parallel.

- One-time codegen (if needed):
```bash
npx convex dev --once
```

## Build & Lint
```bash
npm run build          # Vite build
npm run lint           # Type-check + build check
npm run build:turbo    # Turbo build across workspaces
npm run lint:turbo     # Turbo lint across workspaces
npm run type-check     # Turbo type-check
```

## Project Structure
- `apps/web/app` – TanStack Start routes (`createFileRoute`); SSR entries
- `packages/ui` – shared UI components (deep import via exports map)
- `packages/shared/convex` – shared Convex types/helpers used by UI
- `convex` – server functions, schema, generated API/types
- `scripts` – tooling (e.g., `scripts/seed-demo.mjs`)

## Convex Best Practices
- Function types:
  - `query`: reads; `mutation`: writes; `action`: external I/O/long jobs
- Query patterns:
  - Prefer `.withIndex(...)` / `.withSearchIndex(...)` for filters
  - Paginate with `.paginate({ numItems, cursor })`
  - Avoid mixing builder types; branch then paginate; sort in-memory if needed
- Storage:
  - Use `storage.generateUploadUrl()`; store IDs in tables
- Data modeling:
  - Add indices/search indices for frequent filters
  - Denormalize supplier trust flags into products for fast ranking
- Search:
  - Prefilter (keyword + metadata) → vector rank (chunks) → parent aggregate
  - Hybrid Fusion (weighted) + optional Rerank (timeout + fallback)

## TanStack Start Best Practices
- Place routes under `apps/web/app/routes`; use `createFileRoute`
- Keep client code free of server secrets; access `import.meta.env.VITE_*`
- Shared components in `packages/ui`; keep them SSR-friendly

## ZeroEntropy (optional)
- Set `ZEROENTROPY_API_KEY` in `.env.local` to enable real embeddings/reranker
- Admin settings: `/admin/search-settings` (fusion weights, boosts, rerank)
- Start with `rerankEnabled=false`, then enable after eval metrics look good

## Admin Tools
- Seeding: `/admin/seed-demo` (Sonora screw supplier + 3 products)
- Reindex: `/admin/reindex` (rebuild product/supplier chunks)
- Search Settings: `/admin/search-settings` (fusion/boosts/reranker)

## Commit & Branch Conventions
- Conventional Commits:
  - `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `perf:`, `test:`
- Branch naming:
  - `feat/<slug>`, `fix/<slug>`, `chore/<slug>`

## Pull Request Process
1. Ensure the app runs locally: `npm run dev` (or `dev:turbo`)
2. Lint/type-check: `npm run lint` (or `npm run type-check`)
3. Include a brief description (what/why), screenshots if UI changes
4. If search/ranking changes: note any settings changed in `/admin/search-settings`
5. Request review; CI will validate CSV tool; (optional) attach eval run JSON/CSV

## CI / Evals
- `search-evals` includes an action to quantify quality (`search.runSearchEvals`).
- Convert results with `node search-evals/to-csv.mjs <results.json>`.
- A GitHub Actions smoke workflow validates the tooling.

## Security
- Secrets must remain server-side; do not import keys in the browser
- Keep `.env.local` untracked; use Convex env vars for deployed secrets

## Questions?
- Convex docs: https://docs.convex.dev/home
- TanStack Start: https://tanstack.com/router/latest/docs/framework/react-start
- Open an issue or ping reviewers on your PR.

