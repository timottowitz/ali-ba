import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

// Cosine similarity helper used for query ↔ chunk ranking
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0; const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  if (na === 0 || nb === 0) return 0; return dot / (Math.sqrt(na)*Math.sqrt(nb));
}

// Naive embedding/upsert for products (scaffolding)
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const apiKey = (process as any).env?.ZEROENTROPY_API_KEY as string | undefined;
    // Attempt dynamic import if available
    const ze: any = await import("zeroentropy").catch(() => null);
    if (apiKey && ze && typeof ze.embed === 'function') {
      const res = await ze.embed({ apiKey, input: text });
      const vec = (res && (res.embedding || res.vector || res[0])) as number[] | undefined;
      if (Array.isArray(vec) && vec.length) return vec as number[];
    }
  } catch (_) {
    // fall back below
  }
  // Fallback: token-hash vector as placeholder
  const tokens = tokenize(text);
  const dim = 32;
  const vec = new Array<number>(dim).fill(0);
  tokens.forEach((t) => {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    vec[h % dim] += 1;
  });
  return vec;
}

// Call reranker (ZeroEntropy if available) with timeout + graceful fallback
async function rerankWithTimeout(query: string, texts: string[], timeoutMs: number): Promise<number[] | null> {
  const apiKey = (process as any).env?.ZEROENTROPY_API_KEY as string | undefined;
  if (!apiKey || texts.length === 0) return null;
  const task = (async () => {
    try {
      const ze: any = await import("zeroentropy").catch(() => null);
      if (!ze) return null;
      let scores: number[] | null = null;
      if (typeof ze.rerank === 'function') {
        // Try a common shape: { scores: number[] } or array of {score}
        const res = await ze.rerank({ apiKey, query, texts });
        if (Array.isArray(res)) {
          const arr = res.map((r: any) => (typeof r === 'number' ? r : (r?.score ?? 0)));
          scores = arr.length === texts.length ? arr : null;
        } else if (res && Array.isArray(res.scores)) {
          scores = res.scores as number[];
        }
      }
      if (!scores && typeof (ze as any).crossEncode === 'function') {
        const res2 = await (ze as any).crossEncode({ apiKey, query, texts });
        if (Array.isArray(res2)) scores = res2.map((x: any) => (typeof x === 'number' ? x : (x?.score ?? 0)));
      }
      return scores ?? null;
    } catch {
      return null;
    }
  })();
  const timer = new Promise<null>((resolve) => setTimeout(() => resolve(null), Math.max(200, timeoutMs)));
  const result = await Promise.race([task, timer]);
  return (result && Array.isArray(result)) ? (result as number[]) : null;
}

export const upsertProductEmbedding = mutation({
  args: { productId: v.id("products"), language: v.optional(v.union(v.literal("en"), v.literal("es"))) },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    const title = (product as any).title?.en || (product as any).name || '';
    const desc = (product as any).description?.en || (product as any).description || '';
    const vec = await generateEmbedding(`${title} ${desc} ${(product as any).tags?.join(' ') || ''}`);
    const language = args.language ?? 'en';
    // Upsert by (entityType, entityId, language)
    const existing = await ctx.db
      .query("searchEmbeddings")
      .withIndex("by_entity", q => q.eq("entityType", "product").eq("entityId", String(args.productId)))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { embedding: vec as any, language, updatedAt: Date.now() } as any);
      return existing._id;
    } else {
      return await ctx.db.insert("searchEmbeddings", {
        entityType: "product" as any,
        entityId: String(args.productId),
        embedding: vec as any,
        language: language as any,
        updatedAt: Date.now(),
      });
    }
  },
});

// Try dynamic import of zchunk; fallback to naive sentence grouping
async function chunkText(text: string, targetChars = 1200): Promise<string[]> {
  try {
    // Optional external chunker removed to avoid bundler resolution; fallback below
  } catch (_) {}
  // Fallback: split by sentences and group
  const sentences = text.split(/(?<=[\.!?])\s+/);
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if ((buf + ' ' + s).length > targetChars && buf) {
      out.push(buf.trim());
      buf = s;
    } else {
      buf = (buf ? buf + ' ' : '') + s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// Upsert product chunks: delete old chunks, insert fresh chunk embeddings
export const upsertProductChunks = mutation({
  args: { productId: v.id("products"), language: v.optional(v.union(v.literal("en"), v.literal("es"))) },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    const titleEn = (product as any).title?.en || '';
    const descEn = (product as any).description?.en || '';
    // Basic spec flattening (human-readable summary if available)
    const specs = (product as any).specifications || {};
    const specsText = Object.entries(specs).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n');
    const text = [titleEn, descEn, specsText].filter(Boolean).join('\n\n');

    // Delete previous chunks
    let cursor: string | undefined;
    while (true) {
      const page = await ctx.db
        .query("searchChunks")
        .withIndex("by_parent", q => q.eq("entityType", "product" as any).eq("parentId", String(args.productId)))
        .paginate({ numItems: 100, cursor: (cursor ?? null) as any });
      for (const ch of page.page) {
        await ctx.db.delete(ch._id);
      }
      if (page.isDone) break;
      cursor = page.continueCursor as any;
    }

    // Chunk and embed
    const parts = await chunkText(text, 1200);
    const now = Date.now();
    let order = 0;
    for (const content of parts) {
      const emb = await generateEmbedding(content);
      await ctx.db.insert("searchChunks", {
        entityType: "product" as any,
        parentId: String(args.productId),
        content,
        language: (args.language ?? 'en') as any,
        embedding: emb as any,
        order: order++,
        updatedAt: now,
      } as any);
    }
    return { chunks: parts.length };
  },
});

export const reindexAllProductChunks = mutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("searchSettings").first();
    const bs = args.batchSize ?? settings?.reindexBatchSize ?? 100;
    let cursor: string | undefined;
    let count = 0;
    while (true) {
      const page = await ctx.db.query("products").paginate({ numItems: bs, cursor: (cursor ?? null) as any });
      for (const p of page.page) {
        await ctx.runMutation(api.search.upsertProductChunks, { productId: p._id, language: 'en' as any });
        count++;
      }
      if (page.isDone) break;
      cursor = page.continueCursor as any;
    }
    return { reindexed: count };
  },
});

// Upsert supplier chunks
export const upsertSupplierChunks = mutation({
  args: { supplierId: v.id("suppliers"), language: v.optional(v.union(v.literal("en"), v.literal("es"))) },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found");
    const name = (supplier as any).companyName || '';
    const descEn = (supplier as any).description?.en || '';
    const descEs = (supplier as any).description?.es || '';
    const products = ((supplier as any).mainProducts || []).join(', ');
    const capabilities = ((supplier as any).capabilities || []).join(', ');
    const text = [name, descEn, descEs, products, capabilities].filter(Boolean).join('\n\n');

    // Delete old chunks
    let cursor: string | undefined;
    while (true) {
      const page = await ctx.db
        .query("searchChunks")
        .withIndex("by_parent", q => q.eq("entityType", "supplier" as any).eq("parentId", String(args.supplierId)))
        .paginate({ numItems: 100, cursor: (cursor ?? null) as any });
      for (const ch of page.page) await ctx.db.delete(ch._id);
      if (page.isDone) break;
      cursor = page.continueCursor as any;
    }

    // Chunk + embed
    const parts = await chunkText(text, 1200);
    const now = Date.now();
    let order = 0;
    for (const content of parts) {
      const emb = await generateEmbedding(content);
      await ctx.db.insert("searchChunks", {
        entityType: "supplier" as any,
        parentId: String(args.supplierId),
        content,
        language: (args.language ?? 'en') as any,
        embedding: emb as any,
        order: order++,
        updatedAt: now,
      } as any);
    }
    return { chunks: parts.length };
  },
});

export const reindexAllSupplierChunks = mutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("searchSettings").first();
    const bs = args.batchSize ?? settings?.reindexBatchSize ?? 100;
    let cursor: string | undefined;
    let count = 0;
    while (true) {
      const page = await ctx.db.query("suppliers").paginate({ numItems: bs, cursor: (cursor ?? null) as any });
      for (const s of page.page) {
        await ctx.runMutation(api.search.upsertSupplierChunks, { supplierId: s._id, language: 'en' as any });
        count++;
      }
      if (page.isDone) break;
      cursor = page.continueCursor as any;
    }
    return { reindexed: count };
  },
});
// Supplier embeddings
export const upsertSupplierEmbedding = mutation({
  args: { supplierId: v.id("suppliers"), language: v.optional(v.union(v.literal("en"), v.literal("es"))) },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found");
    const name = (supplier as any).companyName || '';
    const descEn = (supplier as any).description?.en || '';
    const descEs = (supplier as any).description?.es || '';
    const products = ((supplier as any).mainProducts || []).join(' ');
    const text = `${name} ${descEn} ${descEs} ${products}`.trim();
    const vec = await generateEmbedding(text);
    const language = args.language ?? 'en';
    const existing = await ctx.db
      .query("searchEmbeddings")
      .withIndex("by_entity", q => q.eq("entityType", "supplier").eq("entityId", String(args.supplierId)))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { embedding: vec as any, language, updatedAt: Date.now() } as any);
      return existing._id;
    } else {
      return await ctx.db.insert("searchEmbeddings", {
        entityType: "supplier" as any,
        entityId: String(args.supplierId),
        embedding: vec as any,
        language: language as any,
        updatedAt: Date.now(),
      });
    }
  },
});

export const semanticSearchSuppliers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    country: v.optional(v.union(v.literal("MX"), v.literal("US"))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const qvec = await generateEmbedding(args.query);

    // Prefilter suppliers with keyword + metadata
    let kq = ctx.db
      .query("suppliers")
      .withSearchIndex("search_suppliers", qq => qq.search("companyName", args.query));
    if (args.country) kq = kq.filter(qq => qq.eq(qq.field("country"), args.country as any));
    const candidates = await kq.take(300);

    // Fallback: if no keyword hits, take recent suppliers filtered by country
    let parents = candidates;
    if (parents.length === 0) {
      const cq = args.country
        ? ctx.db.query("suppliers").withIndex("by_country", (qq: any) => qq.eq("country", args.country as any))
        : ctx.db.query("suppliers");
      parents = await (cq as any).order("desc").take(200);
    }

    // Collect chunks for candidate parents
    const allChunks: { parentId: string; emb: number[] }[] = [];
    for (const s of parents) {
      let cursor: string | undefined;
      while (true) {
        const page = await ctx.db
          .query("searchChunks")
          .withIndex("by_parent", q => q.eq("entityType", "supplier" as any).eq("parentId", String(s._id)))
          .paginate({ numItems: 100, cursor: (cursor ?? null) as any });
        for (const ch of page.page) {
          allChunks.push({ parentId: String(ch.parentId), emb: (ch as any).embedding || [] });
        }
        if (page.isDone) break; cursor = page.continueCursor as any;
      }
    }

    // Rank chunks by cosine similarity
    const chunkScores = allChunks.map(({ parentId, emb }) => ({ parentId, sim: cosine(qvec as any, emb as any) }))
      .filter(x => x.sim > 0);

    // Aggregate to parent: use max chunk score per supplier
    const byParent = new Map<string, number>();
    for (const { parentId, sim } of chunkScores) {
      const prev = byParent.get(parentId) ?? 0;
      if (sim > prev) byParent.set(parentId, sim);
    }
    const rankedParentIds = Array.from(byParent.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([pid]) => pid);

    // Fetch and return suppliers in ranked order (from prefiltered parents)
    const supplierMap = new Map<string, any>(parents.map((p: any) => [String(p._id), p]));
    return rankedParentIds.map(id => supplierMap.get(id)).filter(Boolean);
  },
});

export const hybridSearchSuppliers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    country: v.optional(v.union(v.literal("MX"), v.literal("US"))),
    excludeId: v.optional(v.id("suppliers")),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("searchSettings").first();
    const kw = settings?.interleaveKeyword ?? 2;
    const sv = settings?.interleaveSemantic ?? 1;
    const limit = args.limit ?? settings?.defaultLimit ?? 12;
    const kwW = settings?.hybridKwWeight ?? 0.5;
    const semW = settings?.hybridSemWeight ?? 0.5;
    const bVerified = settings?.boostVerified ?? 0.08;
    const bGold = settings?.boostGoldVerified ?? 0.12;
    const bAssurance = settings?.boostTradeAssurance ?? 0.08;
    const bServMul = settings?.boostServiceRatingMultiplier ?? 0.02;
    const bRespMul = settings?.boostResponseRateMultiplier ?? 0.01;
    const rerankEnabled = settings?.rerankEnabled ?? false;
    const rerankTopK = settings?.rerankTopK ?? 75;
    const rerankTimeoutMs = settings?.rerankTimeoutMs ?? 1200;
    const rerankWeight = settings?.rerankWeight ?? 0.5;

    // Keyword (company name)
    let kq = ctx.db
      .query("suppliers")
      .withSearchIndex("search_suppliers", qq => qq.search("companyName", args.query));
    if (args.country) kq = kq.filter(qq => qq.eq(qq.field("country"), args.country as any));
    if (args.excludeId) kq = kq.filter(qq => qq.neq(qq.field("_id"), args.excludeId));
    const keyword = await kq.take(50);

    // Semantic (chunk-based)
    const semantic = await ctx.runQuery(api.search.semanticSearchSuppliers, { query: args.query, limit: 50, country: args.country as any });

    // Combine via weighted ranks with trust boosts
    function baseScore(id: string, arr: any[], maxLen: number): number {
      const idx = arr.findIndex(x => String(x._id) === id);
      if (idx < 0) return 0; return (maxLen - idx) / maxLen;
    }
    const maxA = Math.max(keyword.length, 1);
    const semArr = semantic as any[];
    const maxB = Math.max(semArr.length, 1);
    const union = new Map<string, any>();
    for (const s of keyword) union.set(String(s._id), s);
    for (const s of semArr) union.set(String(s._id), s);
    const combined = Array.from(union.values()).map((s: any) => {
      const id = String(s._id);
      const kwScore = baseScore(id, keyword as any[], maxA);
      const semScore = baseScore(id, semArr as any[], maxB);
      let boost = 0;
      if (s.verificationStatus === 'gold_verified') boost += bGold; else if (s.verificationStatus === 'verified') boost += bVerified;
      if ((s.badges || []).includes('trade_assurance')) boost += bAssurance;
      if (typeof s.serviceRating === 'number') boost += bServMul * (s.serviceRating / 5);
      if (typeof s.responseRate === 'number') boost += bRespMul * (s.responseRate / 100);
      const score = kwW * kwScore + semW * semScore + boost;
      return { s, score };
    });
    combined.sort((x, y) => y.score - x.score);

    // Phase 5: Rerank top-K suppliers with cross-encoder if enabled
    if (rerankEnabled && combined.length > 1) {
      const topK = Math.min(rerankTopK, combined.length);
      const top = combined.slice(0, topK);
      const texts = top.map(({ s }) => `${s.companyName || ''}\n${(s.description?.en || '')}\n${(s.mainProducts || []).join(', ')}`);
      const rr = await rerankWithTimeout(args.query, texts, rerankTimeoutMs);
      if (rr && rr.length === top.length) {
        // Normalize rr to [0,1]
        const min = Math.min(...rr), max = Math.max(...rr);
        const norm = rr.map(v => max > min ? (v - min) / (max - min) : 0.5);
        for (let i = 0; i < top.length; i++) {
          top[i].score = (1 - rerankWeight) * top[i].score + rerankWeight * norm[i];
        }
        const rest = combined.slice(topK);
        combined.splice(0, topK, ...top);
        combined.sort((a, b) => b.score - a.score);
      }
    }

    return combined.slice(0, limit).map(x => x.s);
  },
});

export const reindexAllSuppliers = mutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("searchSettings").first();
    const bs = args.batchSize ?? settings?.reindexBatchSize ?? 100;
    let cursor: string | undefined;
    let count = 0;
    while (true) {
      const page = await ctx.db.query("suppliers").paginate({ numItems: bs, cursor: (cursor ?? null) as any });
      for (const s of page.page) {
        await ctx.runMutation(api.search.upsertSupplierEmbedding, { supplierId: s._id, language: 'en' as any });
        count++;
      }
      if (page.isDone) break;
      cursor = page.continueCursor as any;
    }
    return { reindexed: count };
  },
});
// Naive semantic search by token overlap (scaffolding)
export const semanticSearchProducts = query({
  args: { query: v.string(), limit: v.optional(v.number()), categoryId: v.optional(v.id("categories")) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const qvec = await generateEmbedding(args.query);

    // Prefilter via keyword + category
    let kq = ctx.db
      .query("products")
      .withSearchIndex("search_title", qq => {
        let q = qq.search("title.en", args.query);
        if (args.categoryId) q = q.eq("categoryId", args.categoryId);
        return q;
      });
    let parents: any[] = await kq.take(300);
    if (parents.length === 0) {
      const cq = args.categoryId
        ? ctx.db.query("products").withIndex("by_category", (qq: any) => qq.eq("categoryId", args.categoryId!))
        : ctx.db.query("products");
      parents = await (cq as any).order("desc").take(300);
    }

    // Collect chunks for candidate parents
    const allChunks: { parentId: string; emb: number[] }[] = [];
    for (const p of parents) {
      let cursor: string | undefined;
      while (true) {
        const page = await ctx.db
          .query("searchChunks")
          .withIndex("by_parent", q => q.eq("entityType", "product" as any).eq("parentId", String(p._id)))
          .paginate({ numItems: 100, cursor: (cursor ?? null) as any });
        for (const ch of page.page) {
          allChunks.push({ parentId: String(ch.parentId), emb: (ch as any).embedding || [] });
        }
        if (page.isDone) break; cursor = page.continueCursor as any;
      }
    }

    // Rank chunks and aggregate per parent
    const chunkScores = allChunks.map(({ parentId, emb }) => ({ parentId, sim: cosine(qvec as any, emb as any) }))
      .filter(x => x.sim > 0);
    const byParent = new Map<string, number>();
    for (const { parentId, sim } of chunkScores) {
      const prev = byParent.get(parentId) ?? 0;
      if (sim > prev) byParent.set(parentId, sim);
    }
    const rankedParentIds = Array.from(byParent.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([pid]) => pid);

    // Fetch and return products in ranked order (from prefiltered parents)
    const productMap = new Map<string, any>(parents.map((p: any) => [String(p._id), p]));
    return rankedParentIds.map(id => productMap.get(id)).filter(Boolean);
  },
});

// Hybrid search: fuse keyword index and semantic (placeholder) results
export const hybridSearchProducts = query({
  args: { query: v.string(), limit: v.optional(v.number()), categoryId: v.optional(v.id("categories")) },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("searchSettings").first();
    const limit = args.limit ?? settings?.defaultLimit ?? 20;
    const kwW = settings?.hybridKwWeight ?? 0.5;
    const semW = settings?.hybridSemWeight ?? 0.5;
    const bVerified = settings?.boostVerified ?? 0.08;
    const bGold = settings?.boostGoldVerified ?? 0.12;
    const bAssurance = settings?.boostTradeAssurance ?? 0.08;
    const bServMul = settings?.boostServiceRatingMultiplier ?? 0.02;
    const bRespMul = settings?.boostResponseRateMultiplier ?? 0.01;
    const rerankEnabled = settings?.rerankEnabled ?? false;
    const rerankTopK = settings?.rerankTopK ?? 75;
    const rerankTimeoutMs = settings?.rerankTimeoutMs ?? 1200;
    const rerankWeight = settings?.rerankWeight ?? 0.5;
    // Keyword
    let kq = ctx.db
      .query("products")
      .withSearchIndex("search_title", qq => {
        let q = qq.search("title.en", args.query);
        if (args.categoryId) q = q.eq("categoryId", args.categoryId);
        return q;
      });
    const keyword = await kq.take(200);
    // Semantic (embedding)
    const semantic = await ctx.runQuery(api.search.semanticSearchProducts, { query: args.query, categoryId: args.categoryId, limit: 200 });

    // Combine and score with trust boosts (weights from settings)
    function baseScore(id: string, arr: any[], maxLen: number): number {
      const idx = arr.findIndex(x => String(x._id) === id);
      if (idx < 0) return 0; return (maxLen - idx) / maxLen;
    }
    const maxA = Math.max(keyword.length, 1);
    const maxB = Math.max((semantic as any[]).length, 1);
    const union = new Map<string, any>();
    for (const p of keyword) union.set(String(p._id), p);
    for (const p of semantic as any[]) union.set(String(p._id), p);
    const combined = Array.from(union.values()).map((p: any) => {
      const kwScore = baseScore(String(p._id), keyword as any[], maxA);
      const semScore = baseScore(String(p._id), semantic as any[], maxB);
      let boost = 0;
      if (p.supplierVerificationStatus === 'gold_verified') boost += bGold; else if (p.supplierVerificationStatus === 'verified') boost += bVerified;
      if ((p.supplierBadges || []).includes('trade_assurance')) boost += bAssurance;
      if (typeof p.supplierServiceRating === 'number') boost += bServMul * (p.supplierServiceRating / 5);
      if (typeof p.supplierResponseRate === 'number') boost += bRespMul * (p.supplierResponseRate / 100);
      const score = kwW * kwScore + semW * semScore + boost;
      return { p, score };
    });
    combined.sort((x, y) => y.score - x.score);

    // Phase 5: Rerank top-K products with cross-encoder if enabled
    if (rerankEnabled && combined.length > 1) {
      const topK = Math.min(rerankTopK, combined.length);
      const top = combined.slice(0, topK);
      const texts = top.map(({ p }) => `${p.title?.en || ''}\n${p.description?.en || ''}\n${(p.tags || []).join(', ')}`);
      const rr = await rerankWithTimeout(args.query, texts, rerankTimeoutMs);
      if (rr && rr.length === top.length) {
        const min = Math.min(...rr), max = Math.max(...rr);
        const norm = rr.map(v => max > min ? (v - min) / (max - min) : 0.5);
        for (let i = 0; i < top.length; i++) {
          top[i].score = (1 - rerankWeight) * top[i].score + rerankWeight * norm[i];
        }
        const rest = combined.slice(topK);
        combined.splice(0, topK, ...top);
        combined.sort((a, b) => b.score - a.score);
      }
    }

    // Enrich supplier for UI badges
    const enriched = await Promise.all(combined.slice(0, limit).map(async ({ p }) => {
      const supplier: any = await ctx.db.get(p.supplierId as any);
      return {
        ...p,
        supplier: supplier ? {
          _id: (supplier as any)._id,
          companyName: (supplier as any).companyName,
          country: (supplier as any).country,
          verificationStatus: (supplier as any).verificationStatus,
          badges: (supplier as any).badges,
        } : undefined,
      };
    }));
    return enriched;
  },
});

// Admin: reindex all products embeddings (scaffold)
export const reindexAllProducts = mutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("searchSettings").first();
    const bs = args.batchSize ?? settings?.reindexBatchSize ?? 100;
    let cursor: string | undefined;
    let count = 0;
    while (true) {
      const page = await ctx.db.query("products").paginate({ numItems: bs, cursor: (cursor ?? null) as any });
      for (const p of page.page) {
        await ctx.runMutation(api.search.upsertProductEmbedding, { productId: p._id, language: 'en' as any });
        count++;
      }
      if (page.isDone) break;
      cursor = page.continueCursor as any;
    }
    return { reindexed: count };
  },
});

// Get and update search settings
export const getSearchSettings = query({
  args: {},
  handler: async (ctx) => {
    const s = await ctx.db.query("searchSettings").first();
    const defaults = {
      interleaveKeyword: 2,
      interleaveSemantic: 1,
      defaultLimit: 20,
      reindexBatchSize: 100,
      hybridKwWeight: 0.5,
      hybridSemWeight: 0.5,
      boostVerified: 0.08,
      boostGoldVerified: 0.12,
      boostTradeAssurance: 0.08,
      boostServiceRatingMultiplier: 0.02,
      boostResponseRateMultiplier: 0.01,
      rerankEnabled: false,
      rerankTopK: 75,
      rerankTimeoutMs: 1200,
      rerankWeight: 0.5,
      updatedAt: 0,
    };
    if (!s) return defaults as any;
    // Merge defaults for any missing optional fields
    return {
      ...defaults,
      ...s,
    } as any;
  },
});

export const updateSearchSettings = mutation({
  args: {
    interleaveKeyword: v.number(),
    interleaveSemantic: v.number(),
    defaultLimit: v.number(),
    reindexBatchSize: v.number(),
    hybridKwWeight: v.optional(v.number()),
    hybridSemWeight: v.optional(v.number()),
    boostVerified: v.optional(v.number()),
    boostGoldVerified: v.optional(v.number()),
    boostTradeAssurance: v.optional(v.number()),
    boostServiceRatingMultiplier: v.optional(v.number()),
    boostResponseRateMultiplier: v.optional(v.number()),
    rerankEnabled: v.optional(v.boolean()),
    rerankTopK: v.optional(v.number()),
    rerankTimeoutMs: v.optional(v.number()),
    rerankWeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("searchSettings").first();
    const doc: any = {
      interleaveKeyword: args.interleaveKeyword,
      interleaveSemantic: args.interleaveSemantic,
      defaultLimit: args.defaultLimit,
      reindexBatchSize: args.reindexBatchSize,
      updatedAt: Date.now(),
    };
    // Only set optional fields if provided
    if (args.hybridKwWeight != null) doc.hybridKwWeight = args.hybridKwWeight;
    if (args.hybridSemWeight != null) doc.hybridSemWeight = args.hybridSemWeight;
    if (args.boostVerified != null) doc.boostVerified = args.boostVerified;
    if (args.boostGoldVerified != null) doc.boostGoldVerified = args.boostGoldVerified;
    if (args.boostTradeAssurance != null) doc.boostTradeAssurance = args.boostTradeAssurance;
    if (args.boostServiceRatingMultiplier != null) doc.boostServiceRatingMultiplier = args.boostServiceRatingMultiplier;
    if (args.boostResponseRateMultiplier != null) doc.boostResponseRateMultiplier = args.boostResponseRateMultiplier;
    if (args.rerankEnabled != null) doc.rerankEnabled = args.rerankEnabled;
    if (args.rerankTopK != null) doc.rerankTopK = args.rerankTopK;
    if (args.rerankTimeoutMs != null) doc.rerankTimeoutMs = args.rerankTimeoutMs;
    if (args.rerankWeight != null) doc.rerankWeight = args.rerankWeight;
    if (existing) {
      await ctx.db.patch(existing._id, doc as any);
      return existing._id;
    } else {
      return await ctx.db.insert("searchSettings", doc as any);
    }
  },
});

export const getEmbeddingStats = query({
  args: {},
  handler: async (ctx) => {
    let cursor: string | undefined;
    let count = 0;
    let minUpdated = Number.POSITIVE_INFINITY;
    let maxUpdated = 0;
    while (true) {
      const page = await ctx.db.query("searchEmbeddings").paginate({ numItems: 200, cursor: (cursor ?? null) as any });
      for (const e of page.page) {
        count++;
        minUpdated = Math.min(minUpdated, e.updatedAt);
        maxUpdated = Math.max(maxUpdated, e.updatedAt);
      }
      if (page.isDone) break;
      cursor = page.continueCursor as any;
    }
    if (count === 0) return { count: 0 };
    return { count, oldest: minUpdated, newest: maxUpdated };
  },
});

// =====================
// Phase 6: Eval Harness
// =====================
type QueryJudgment = { query: string; categoryId?: string; country?: "MX" | "US"; relevantIds: string[] };
type EvalDataset = { products?: QueryJudgment[]; suppliers?: QueryJudgment[] };

function ndcgAtK(results: string[], relevant: Set<string>, k: number): number {
  let dcg = 0;
  for (let i = 0; i < Math.min(k, results.length); i++) {
    const rel = relevant.has(results[i]) ? 1 : 0;
    if (rel > 0) dcg += 1 / Math.log2(i + 2);
  }
  const idealRel = Math.min(k, relevant.size);
  let idcg = 0;
  for (let i = 0; i < idealRel; i++) idcg += 1 / Math.log2(i + 2);
  return idcg === 0 ? 0 : dcg / idcg;
}

function recallAtK(results: string[], relevant: Set<string>, k: number): number {
  if (relevant.size === 0) return 0;
  const top = results.slice(0, k);
  let hit = 0;
  for (const id of top) if (relevant.has(id)) hit++;
  return hit / relevant.size;
}

function mrr(results: string[], relevant: Set<string>): number {
  for (let i = 0; i < results.length; i++) if (relevant.has(results[i])) return 1 / (i + 1);
  return 0;
}

async function keywordOnlyProducts(ctx: any, q: string, categoryId?: string, limit = 200): Promise<string[]> {
  let kq = ctx.db
    .query("products")
    .withSearchIndex("search_title", (qq: any) => {
      let x = qq.search("title.en", q);
      if (categoryId) x = x.eq("categoryId", categoryId);
      return x;
    });
  const arr = await kq.take(limit).collect();
  return arr.map((p: any) => String(p._id));
}

async function denseOnlyProducts(ctx: any, q: string, categoryId?: string, limit = 200): Promise<string[]> {
  const arr = await ctx.runQuery(api.search.semanticSearchProducts, { query: q, categoryId: categoryId as any, limit });
  return (arr as any[]).map(p => String((p as any)._id));
}

async function hybridProductsLocal(ctx: any, q: string, categoryId?: string, limit = 200, withRerank = false): Promise<string[]> {
  // Reproduce hybrid scoring (without enrichment), optionally with rerank
  const settings = await ctx.db.query("searchSettings").first();
  const kwW = settings?.hybridKwWeight ?? 0.5;
  const semW = settings?.hybridSemWeight ?? 0.5;
  const bVerified = settings?.boostVerified ?? 0.08;
  const bGold = settings?.boostGoldVerified ?? 0.12;
  const bAssurance = settings?.boostTradeAssurance ?? 0.08;
  const bServMul = settings?.boostServiceRatingMultiplier ?? 0.02;
  const bRespMul = settings?.boostResponseRateMultiplier ?? 0.01;
  const rerankTopK = settings?.rerankTopK ?? 75;
  const rerankTimeoutMs = settings?.rerankTimeoutMs ?? 1200;
  const rerankWeight = settings?.rerankWeight ?? 0.5;

  let kq = ctx.db
    .query("products")
    .withSearchIndex("search_title", (qq: any) => {
      let x = qq.search("title.en", q);
      if (categoryId) x = x.eq("categoryId", categoryId);
      return x;
    });
  const keyword = await kq.take(200).collect();
  const semantic = await ctx.runQuery(api.search.semanticSearchProducts, { query: q, categoryId: categoryId as any, limit: 200 });
  function baseScore(id: string, arr: any[], maxLen: number): number {
    const idx = arr.findIndex(x => String((x as any)._id) === id);
    if (idx < 0) return 0; return (maxLen - idx) / maxLen;
  }
  const maxA = Math.max(keyword.length, 1);
  const maxB = Math.max((semantic as any[]).length, 1);
  const union = new Map<string, any>();
  for (const p of keyword) union.set(String((p as any)._id), p);
  for (const p of semantic as any[]) union.set(String((p as any)._id), p);
  const combined = Array.from(union.values()).map((p: any) => {
    const id = String(p._id);
    const kwScore = baseScore(id, keyword as any[], maxA);
    const semScore = baseScore(id, semantic as any[], maxB);
    let boost = 0;
    if (p.supplierVerificationStatus === 'gold_verified') boost += bGold; else if (p.supplierVerificationStatus === 'verified') boost += bVerified;
    if ((p.supplierBadges || []).includes('trade_assurance')) boost += bAssurance;
    if (typeof p.supplierServiceRating === 'number') boost += bServMul * (p.supplierServiceRating / 5);
    if (typeof p.supplierResponseRate === 'number') boost += bRespMul * (p.supplierResponseRate / 100);
    const score = kwW * kwScore + semW * semScore + boost;
    return { id, p, score };
  });
  combined.sort((a: any, b: any) => b.score - a.score);

  if (withRerank && combined.length > 1) {
    const topK = Math.min(rerankTopK, combined.length);
    const top = combined.slice(0, topK);
    const texts = top.map(({ p }: any) => `${p.title?.en || ''}\n${p.description?.en || ''}\n${(p.tags || []).join(', ')}`);
    const rr = await rerankWithTimeout(q, texts, rerankTimeoutMs);
    if (rr && rr.length === top.length) {
      const min = Math.min(...rr), max = Math.max(...rr);
      const norm = rr.map(v => max > min ? (v - min) / (max - min) : 0.5);
      for (let i = 0; i < top.length; i++) top[i].score = (1 - rerankWeight) * top[i].score + rerankWeight * norm[i];
      combined.splice(0, topK, ...top);
      combined.sort((a: any, b: any) => b.score - a.score);
    }
  }
  return combined.slice(0, limit).map((x: any) => x.id);
}

async function keywordOnlySuppliers(ctx: any, q: string, country?: "MX" | "US", limit = 200): Promise<string[]> {
  let kq = ctx.db
    .query("suppliers")
    .withSearchIndex("search_suppliers", (qq: any) => qq.search("companyName", q));
  if (country) kq = kq.filter((qq: any) => qq.eq(qq.field("country"), country));
  const arr = await kq.take(limit).collect();
  return arr.map((s: any) => String(s._id));
}

async function denseOnlySuppliers(ctx: any, q: string, country?: "MX" | "US", limit = 200): Promise<string[]> {
  const arr = await ctx.runQuery(api.search.semanticSearchSuppliers, { query: q, country: country as any, limit });
  return (arr as any[]).map(s => String((s as any)._id));
}

async function hybridSuppliersLocal(ctx: any, q: string, country?: "MX" | "US", limit = 200, withRerank = false): Promise<string[]> {
  const settings = await ctx.db.query("searchSettings").first();
  const kwW = settings?.hybridKwWeight ?? 0.5;
  const semW = settings?.hybridSemWeight ?? 0.5;
  const bVerified = settings?.boostVerified ?? 0.08;
  const bGold = settings?.boostGoldVerified ?? 0.12;
  const bAssurance = settings?.boostTradeAssurance ?? 0.08;
  const bServMul = settings?.boostServiceRatingMultiplier ?? 0.02;
  const bRespMul = settings?.boostResponseRateMultiplier ?? 0.01;
  const rerankTopK = settings?.rerankTopK ?? 75;
  const rerankTimeoutMs = settings?.rerankTimeoutMs ?? 1200;
  const rerankWeight = settings?.rerankWeight ?? 0.5;

  let kq = ctx.db
    .query("suppliers")
    .withSearchIndex("search_suppliers", (qq: any) => qq.search("companyName", q));
  if (country) kq = kq.filter((qq: any) => qq.eq(qq.field("country"), country));
  const keyword = await kq.take(200).collect();
  const semantic = await ctx.runQuery(api.search.semanticSearchSuppliers, { query: q, country: country as any, limit: 200 });

  function baseScore(id: string, arr: any[], maxLen: number): number {
    const idx = arr.findIndex(x => String((x as any)._id) === id);
    if (idx < 0) return 0; return (maxLen - idx) / maxLen;
  }
  const maxA = Math.max(keyword.length, 1);
  const maxB = Math.max((semantic as any[]).length, 1);
  const union = new Map<string, any>();
  for (const s of keyword) union.set(String((s as any)._id), s);
  for (const s of semantic as any[]) union.set(String((s as any)._id), s);
  const combined = Array.from(union.values()).map((s: any) => {
    const id = String(s._id);
    const kwScore = baseScore(id, keyword as any[], maxA);
    const semScore = baseScore(id, semantic as any[], maxB);
    let boost = 0;
    if (s.verificationStatus === 'gold_verified') boost += bGold; else if (s.verificationStatus === 'verified') boost += bVerified;
    if ((s.badges || []).includes('trade_assurance')) boost += bAssurance;
    if (typeof s.serviceRating === 'number') boost += bServMul * (s.serviceRating / 5);
    if (typeof s.responseRate === 'number') boost += bRespMul * (s.responseRate / 100);
    const score = kwW * kwScore + semW * semScore + boost;
    return { id, s, score };
  });
  combined.sort((a: any, b: any) => b.score - a.score);

  if (withRerank && combined.length > 1) {
    const topK = Math.min(rerankTopK, combined.length);
    const top = combined.slice(0, topK);
    const texts = top.map(({ s }: any) => `${s.companyName || ''}\n${(s.description?.en || '')}\n${(s.mainProducts || []).join(', ')}`);
    const rr = await rerankWithTimeout(q, texts, rerankTimeoutMs);
    if (rr && rr.length === top.length) {
      const min = Math.min(...rr), max = Math.max(...rr);
      const norm = rr.map(v => max > min ? (v - min) / (max - min) : 0.5);
      for (let i = 0; i < top.length; i++) top[i].score = (1 - rerankWeight) * top[i].score + rerankWeight * norm[i];
      combined.splice(0, topK, ...top);
      combined.sort((a: any, b: any) => b.score - a.score);
    }
  }
  return combined.slice(0, limit).map((x: any) => x.id);
}

export const runSearchEvals = action({
  args: { dataset: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const ds: EvalDataset = args.dataset ?? { products: [], suppliers: [] };
    const perQuery: any[] = [];
    const aggregate = {
      products: { ndcg10: 0, recall50: 0, mrr: 0, count: 0 },
      suppliers: { ndcg10: 0, recall50: 0, mrr: 0, count: 0 },
    };

    const modes = [
      { key: 'keyword', p: keywordOnlyProducts, s: keywordOnlySuppliers },
      { key: 'dense', p: denseOnlyProducts, s: denseOnlySuppliers },
      { key: 'hybrid', p: (c:any,q:string,cat?:string)=>hybridProductsLocal(c,q,cat,200,false), s: (c:any,q:string,country?:any)=>hybridSuppliersLocal(c,q,country,200,false) },
      { key: 'hybrid_rerank', p: (c:any,q:string,cat?:string)=>hybridProductsLocal(c,q,cat,200,true), s: (c:any,q:string,country?:any)=>hybridSuppliersLocal(c,q,country,200,true) },
    ];

    // Products
    for (const item of (ds.products ?? [])) {
      const rel = new Set(item.relevantIds.map(String));
      const row: any = { type: 'product', query: item.query };
      for (const m of modes) {
        const ids = await m.p(ctx, item.query, item.categoryId, 200);
        const metrics = {
          ndcg10: ndcgAtK(ids, rel, 10),
          recall50: recallAtK(ids, rel, 50),
          mrr: mrr(ids, rel),
        };
        row[m.key] = metrics;
      }
      perQuery.push(row);
    }
    // Suppliers
    for (const item of (ds.suppliers ?? [])) {
      const rel = new Set(item.relevantIds.map(String));
      const row: any = { type: 'supplier', query: item.query };
      for (const m of modes) {
        const ids = await m.s(ctx, item.query, item.country as any, 200);
        const metrics = {
          ndcg10: ndcgAtK(ids, rel, 10),
          recall50: recallAtK(ids, rel, 50),
          mrr: mrr(ids, rel),
        };
        row[m.key] = metrics;
      }
      perQuery.push(row);
    }

    // Aggregate
    for (const row of perQuery) {
      const agg = row.type === 'product' ? aggregate.products : aggregate.suppliers;
      agg.ndcg10 += row.hybrid_rerank.ndcg10;
      agg.recall50 += row.hybrid_rerank.recall50;
      agg.mrr += row.hybrid_rerank.mrr;
      agg.count += 1;
    }

    return {
      summary: {
        products: aggregate.products.count > 0 ? {
          avgNDCG10: aggregate.products.ndcg10 / aggregate.products.count,
          avgRecall50: aggregate.products.recall50 / aggregate.products.count,
          avgMRR: aggregate.products.mrr / aggregate.products.count,
          queries: aggregate.products.count,
        } : undefined,
        suppliers: aggregate.suppliers.count > 0 ? {
          avgNDCG10: aggregate.suppliers.ndcg10 / aggregate.suppliers.count,
          avgRecall50: aggregate.suppliers.recall50 / aggregate.suppliers.count,
          avgMRR: aggregate.suppliers.mrr / aggregate.suppliers.count,
          queries: aggregate.suppliers.count,
        } : undefined,
      },
      perQuery,
    };
  },
});

// =====================
// Phase 8 support: Top chunks per parent for "Why these results?"
// =====================
export const getTopChunksForParents = query({
  args: {
    entityType: v.union(v.literal('product'), v.literal('supplier')),
    parentIds: v.array(v.string()),
    query: v.string(),
    perParent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const qvec = await generateEmbedding(args.query);
    const perParent = args.perParent ?? 1;
    const result: any[] = [];
    for (const pid of args.parentIds) {
      // Gather chunks for this parent and score
      let cursor: string | undefined;
      const scored: { content: string; score: number }[] = [];
      while (true) {
        const page = await ctx.db
          .query('searchChunks')
          .withIndex('by_parent', q => q.eq('entityType', args.entityType as any).eq('parentId', String(pid)))
          .paginate({ numItems: 100, cursor: (cursor ?? null) as any });
        for (const ch of page.page) {
          const sim = cosine(qvec as any, (ch as any).embedding || []);
          if (sim > 0) scored.push({ content: (ch as any).content || '', score: sim });
        }
        if (page.isDone) break; cursor = page.continueCursor as any;
      }
      scored.sort((a, b) => b.score - a.score);
      result.push({ parentId: String(pid), snippets: scored.slice(0, perParent) });
    }
    return result;
  }
});
