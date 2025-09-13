#!/usr/bin/env node
import fs from 'node:fs';

if (process.argv.length < 3) {
  console.error('Usage: node to-csv.mjs <results.json>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = [];
rows.push(['type','query','mode','ndcg10','recall50','mrr']);
for (const row of (data.perQuery || [])) {
  for (const mode of ['keyword','dense','hybrid','hybrid_rerank']) {
    const m = row[mode];
    if (!m) continue;
    rows.push([row.type, row.query, mode, m.ndcg10, m.recall50, m.mrr]);
  }
}
console.log(rows.map(r => r.join(',')).join('\n'));

