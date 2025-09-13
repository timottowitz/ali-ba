Search Evals

Contents
- goldset.sample.json — template for 5–20 eval queries with judgments
- to-csv.mjs — convert eval JSON output to CSV rows
- sample-output.json — example output shape for CI smoke

How to run
1) Prepare goldset.json by copying goldset.sample.json and fill real Convex IDs.

2) Call the Convex eval action (server-side) to compute metrics:
   - Using MCP (recommended; see AGENTS.md for convex_call tool):
     {
       "operation": "action",
       "name": "search:runSearchEvals",
       "args": { "dataset": <paste contents of search-evals/goldset.json> }
     }

   - Or call from your app by importing api.search.runSearchEvals and passing the dataset.

3) Save the JSON response under search-evals/results-<date>.json.

4) Convert to CSV (optional):
   node search-evals/to-csv.mjs search-evals/results-<date>.json > search-evals/results-<date>.csv

Metrics
- Per query: NDCG@10, Recall@50, MRR for each mode: keyword, dense, hybrid, hybrid_rerank
- Summary (averages) for products and suppliers based on hybrid_rerank.

Notes
- All eval computation runs on the server (Convex action). No API keys leak to the browser.
- The reranker uses ZEROENTROPY_API_KEY if present and times out gracefully.

