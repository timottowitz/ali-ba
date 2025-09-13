import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Query to get supplier profile with all trust signals
export const getSupplierProfile = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) return null;

    // Get additional data
    const [auditReports, certifications, reviews, performanceHistory] = await Promise.all([
      // Get audit reports
      supplier.auditReports ? 
        Promise.all(supplier.auditReports.map(id => ctx.db.get(id))) :
        Promise.resolve([]),
      
      // Get certifications with documents
      Promise.all((supplier.certifications || []).map(async cert => ({
        ...cert,
        document: await ctx.db.get(cert.documentId)
      }))),
      
      // Get recent reviews
      ctx.db
        .query("supplierReviews")
        .withIndex("by_supplier", q => q.eq("supplierId", args.supplierId))
        .filter(q => q.eq(q.field("visibility"), "public"))
        .order("desc")
        .take(10),
      
      // Get performance history
      ctx.db
        .query("supplierPerformanceHistory")
        .withIndex("by_supplier", q => q.eq("supplierId", args.supplierId))
        .order("desc")
        .take(12) // Last 12 months
    ]);

    return {
      ...supplier,
      auditReports: auditReports.filter(Boolean),
      certifications,
      recentReviews: await reviews,
      performanceHistory: await performanceHistory,
    };
  }
});

// Query to search suppliers with filters
export const searchSuppliers = query({
  args: {
    query: v.optional(v.string()),
    country: v.optional(v.union(v.literal("MX"), v.literal("US"))),
    state: v.optional(v.string()),
    verificationStatus: v.optional(v.array(v.string())),
    badges: v.optional(v.array(v.string())),
    minResponseRate: v.optional(v.number()),
    businessType: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    languages: v.optional(v.array(v.union(v.literal("en"), v.literal("es")))),
    certifications: v.optional(v.array(v.string())),
    topMarket: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("suppliers");

    // Apply filters
    if (args.country) {
      query = query.filter(q => q.eq(q.field("country"), args.country));
    }
    
    if (args.state) {
      query = query.filter(q => q.eq(q.field("state"), args.state));
    }

    if (args.verificationStatus && args.verificationStatus.length > 0) {
      const statuses = args.verificationStatus;
      query = query.filter((q: any) => 
        q.or(...(statuses as any).map((status: any) => 
          q.eq(q.field("verificationStatus"), status)
        ))
      );
    }

    if (args.minResponseRate != null) {
      query = query.filter((q: any) => 
        q.gte(q.field("responseRate"), args.minResponseRate as number)
      );
    }

    if (args.businessType) {
      query = query.filter(q => 
        q.eq(q.field("businessType"), args.businessType)
      );
    }

    // Language filter will be applied in-memory

    // Sort by trust score if available
    const suppliers = await query
      .order("desc")
      .take(args.limit || 50);

    // Filter by badges if specified
    let filteredSuppliers: any[] = suppliers as any[];
    if (args.badges && args.badges.length > 0) {
      filteredSuppliers = suppliers.filter((supplier: any) =>
        args.badges!.some(badge => supplier.badges?.includes(badge as any))
      );
    }

    // Filter by certifications (supplier-level)
    if (args.certifications && args.certifications.length > 0) {
      filteredSuppliers = filteredSuppliers.filter((supplier: any) =>
        supplier.certifications?.some((c: any) => args.certifications!.includes(c.type))
      );
    }

    // Filter by top market (simple contains match)
    if (args.topMarket) {
      filteredSuppliers = filteredSuppliers.filter((s: any) => s.topMarkets?.includes(args.topMarket!));
    }

    // If searching by text, filter by company name and main products
    if (args.query) {
      const searchLower = args.query.toLowerCase();
      filteredSuppliers = filteredSuppliers.filter((supplier: any) =>
        supplier.companyName.toLowerCase().includes(searchLower) ||
        supplier.description.en.toLowerCase().includes(searchLower) ||
        supplier.description.es.toLowerCase().includes(searchLower) ||
        supplier.mainProducts?.some((product: any) => 
          product.toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply language filter in-memory
    if (args.languages && args.languages.length > 0) {
      filteredSuppliers = filteredSuppliers.filter((s: any) => (s.languages || []).some((l: any) => (args.languages as any).includes(l)));
    }

    return filteredSuppliers;
  }
});

// Paged supplier search with keyword, filters and sort options
export const searchSuppliersPaged = query({
  args: {
    query: v.optional(v.string()),
    paginationOpts: v.object({ numItems: v.number(), cursor: v.optional(v.string()) }),
    country: v.optional(v.union(v.literal("MX"), v.literal("US"))),
    state: v.optional(v.string()),
    verificationStatus: v.optional(v.array(v.string())),
    badges: v.optional(v.array(v.string())),
    languages: v.optional(v.array(v.union(v.literal("en"), v.literal("es")))),
    certifications: v.optional(v.array(v.string())),
    minResponseRate: v.optional(v.number()),
    minOnTimeDeliveryRate: v.optional(v.number()),
    minServiceRating: v.optional(v.number()),
    capabilities: v.optional(v.array(v.string())),
    searchIn: v.optional(v.union(v.literal("name"), v.literal("description"), v.literal("description_es"))),
    sortBy: v.optional(v.union(
      v.literal("trust_score"),
      v.literal("response_rate"),
      v.literal("service_rating"),
      v.literal("default"),
    )),
  },
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("suppliers");

    // Keyword search on companyName
    if (args.query) {
      const indexName = args.searchIn === 'description' ? "search_suppliers_desc" : (args.searchIn === 'description_es' ? 'search_suppliers_desc_es' : "search_suppliers");
      q = ctx.db
        .query("suppliers")
        .withSearchIndex(indexName as any, qq => qq.search(
          args.searchIn === 'description' ? "description.en" : (args.searchIn === 'description_es' ? 'description.es' : "companyName"),
          args.query!
        ));
      if (args.country) q = q.filter((qq: any) => qq.eq(qq.field("country"), args.country));
      if (args.state) q = q.filter((qq: any) => qq.eq(qq.field("state"), args.state));
      if (args.verificationStatus && args.verificationStatus.length) {
        q = q.filter((qq: any) => qq.or(...args.verificationStatus!.map(vs => qq.eq(qq.field("verificationStatus"), vs))));
      }
    } else {
      if (args.country) q = q.filter((qq: any) => qq.eq(qq.field("country"), args.country));
      if (args.state) q = q.filter((qq: any) => qq.eq(qq.field("state"), args.state));
      if (args.verificationStatus && args.verificationStatus.length) {
        q = q.filter((qq: any) => qq.or(...args.verificationStatus!.map(vs => qq.eq(qq.field("verificationStatus"), vs))));
      }
    }

    // Language filter applied in-memory after pagination
    if (args.minResponseRate != null) { q = q.filter((qq: any) => qq.gte(qq.field("responseRate"), args.minResponseRate!)); }
    if (args.minOnTimeDeliveryRate != null) { q = q.filter((qq: any) => qq.gte(qq.field("onTimeDeliveryRate"), args.minOnTimeDeliveryRate!)); }
    if (args.minServiceRating != null) { q = q.filter((qq: any) => qq.gte(qq.field("serviceRating"), args.minServiceRating!)); }
    // Capabilities filter is applied after pagination (in-memory)

    // Sort selection
    // Defer sorting to in-memory after pagination to avoid type issues

    const page = await q.paginate(args.paginationOpts as any);

    // Post-filter for badges/certifications if provided
    let filtered = page.page;
    // Apply capabilities filter in-memory
    if (args.capabilities && args.capabilities.length) {
      filtered = filtered.filter((s: any) => (s.capabilities || []).some((c: any) => (args.capabilities as any).includes(c)));
    }
    if (args.languages && args.languages.length) {
      filtered = filtered.filter((s: any) => (s.languages || []).some((l: any) => (args.languages as any).includes(l)));
    }
    if (args.badges && args.badges.length) {
      filtered = filtered.filter((s: any) => (s.badges || []).some((b: any) => args.badges!.includes(b as any)));
    }
    if (args.certifications && args.certifications.length) {
      filtered = filtered.filter((s: any) => s.certifications?.some((c: any) => args.certifications!.includes(c.type)));
    }

    // In-memory sorting
    if (args.sortBy === 'trust_score') {
      filtered.sort((a: any, b: any) => (b.trustScore ?? 0) - (a.trustScore ?? 0));
    } else if (args.sortBy === 'response_rate') {
      filtered.sort((a: any, b: any) => (b.responseRate ?? 0) - (a.responseRate ?? 0));
    } else if (args.sortBy === 'service_rating') {
      filtered.sort((a: any, b: any) => (b.serviceRating ?? 0) - (a.serviceRating ?? 0));
    }

    return { ...page, page: filtered };
  },
});

// Mutation to create or update supplier profile
export const upsertSupplier = mutation({
  args: {
    supplierId: v.optional(v.id("suppliers")),
    userId: v.id("users"),
    companyName: v.string(),
    legalEntityName: v.string(),
    description: v.object({
      en: v.string(),
      es: v.string(),
    }),
    location: v.string(),
    state: v.string(),
    country: v.union(v.literal("MX"), v.literal("US")),
    contactEmail: v.string(),
    contactPhone: v.string(),
    website: v.optional(v.string()),
    languages: v.array(v.union(v.literal("en"), v.literal("es"))),
    timeZone: v.string(),
    yearEstablished: v.number(),
    employeeCount: v.string(),
    businessType: v.union(
      v.literal("manufacturer"),
      v.literal("trading_company"),
      v.literal("wholesaler"),
      v.literal("distributor"),
      v.literal("service_provider")
    ),
    mainProducts: v.array(v.string()),
    topMarkets: v.array(v.string()),
    exportPercentage: v.optional(v.number()),
    factoryLines: v.optional(v.number()),
    productionCapacity: v.optional(v.object({
      monthly: v.number(),
      unit: v.string(),
    })),
    capabilities: v.array(v.union(
      v.literal("oem"),
      v.literal("odm"),
      v.literal("custom_packaging"),
      v.literal("private_label"),
      v.literal("minor_customization"),
      v.literal("samples_available")
    )),
  },
  handler: async (ctx, args) => {
    const { supplierId, ...supplierData } = args;

    if (supplierId) {
      // Update existing supplier
      await ctx.db.patch(supplierId, {
        ...supplierData,
        // Initialize performance metrics if not set
        responseRate: (await ctx.db.get(supplierId))?.responseRate || 0,
        responseTime: (await ctx.db.get(supplierId))?.responseTime || 48,
        onTimeDeliveryRate: (await ctx.db.get(supplierId))?.onTimeDeliveryRate || 0,
        productQualityScore: (await ctx.db.get(supplierId))?.productQualityScore || 0,
        serviceRating: (await ctx.db.get(supplierId))?.serviceRating || 0,
        disputeRate: (await ctx.db.get(supplierId))?.disputeRate || 0,
        totalTransactions: (await ctx.db.get(supplierId))?.totalTransactions || 0,
      });
      // Re-chunk supplier text for retrieval
      await ctx.runMutation(api.search.upsertSupplierChunks, { supplierId, language: 'en' as any });
      return supplierId;
    } else {
      // Create new supplier
      const newId = await ctx.db.insert("suppliers", {
        ...supplierData,
        verificationStatus: "unverified",
        responseRate: 0,
        responseTime: 48, // Default 48 hours
        onTimeDeliveryRate: 0,
        productQualityScore: 0,
        serviceRating: 0,
        disputeRate: 0,
        totalTransactions: 0,
        badges: [],
        certifications: [],
      });
      await ctx.runMutation(api.search.upsertSupplierChunks, { supplierId: newId, language: 'en' as any });
      return newId;
    }
  }
});

// Mutation to submit verification request
export const submitVerificationRequest = mutation({
  args: {
    supplierId: v.id("suppliers"),
    documents: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found");

    // Check if there's already a pending request
    const existingRequest = await ctx.db
      .query("verificationRequests")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.supplierId))
      .filter((q: any) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      throw new Error("Verification request already pending");
    }

    // Create verification request
    const requestId = await ctx.db.insert("verificationRequests", {
      companyId: args.supplierId,
      requestedBy: supplier.userId,
      documents: args.documents,
      status: "pending",
      createdAt: Date.now(),
    });

    // Update supplier status
    await ctx.db.patch(args.supplierId, {
      verificationStatus: "pending",
    });

    return requestId;
  }
});

// Mutation to update supplier performance metrics
export const updateSupplierMetrics = mutation({
  args: {
    supplierId: v.id("suppliers"),
    metric: v.union(
      v.literal("response"),
      v.literal("delivery"),
      v.literal("quality"),
      v.literal("dispute")
    ),
    value: v.number(),
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found");

    const updates: Partial<Doc<"suppliers">> = {};

    switch (args.metric) {
      case "response":
        // Update response metrics
        const totalResponses = supplier.totalTransactions + 1;
        updates.responseRate = 
          (supplier.responseRate * supplier.totalTransactions + args.value) / totalResponses;
        break;
      
      case "delivery":
        // Update on-time delivery rate
        const totalDeliveries = supplier.totalTransactions;
        updates.onTimeDeliveryRate = 
          (supplier.onTimeDeliveryRate * totalDeliveries + args.value) / (totalDeliveries + 1);
        break;
      
      case "quality":
        // Update quality score
        updates.productQualityScore = args.value;
        break;
      
      case "dispute":
        // Update dispute rate
        const totalOrders = supplier.totalTransactions;
        updates.disputeRate = 
          (supplier.disputeRate * totalOrders + args.value) / (totalOrders + 1);
        break;
    }

    await ctx.db.patch(args.supplierId, updates);
  }
});

// Link a document as a supplier certification
export const addSupplierCertification = mutation({
  args: {
    supplierId: v.id("suppliers"),
    type: v.string(),
    documentId: v.id("documents"),
    issuedDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found");
    const certifications = [...(supplier.certifications || [])];
    certifications.push({
      type: args.type,
      documentId: args.documentId,
      issuedDate: args.issuedDate ?? Date.now(),
      expiryDate: args.expiryDate,
    } as any);
    await ctx.db.patch(args.supplierId, { certifications } as any);
  },
});

// Admin: set supplier verification status directly
export const setSupplierVerificationStatus = mutation({
  args: {
    supplierId: v.id("suppliers"),
    status: v.union(
      v.literal("unverified"),
      v.literal("pending"),
      v.literal("verified"),
      v.literal("gold_verified"),
      v.literal("rejected"),
    ),
  },
  handler: async (ctx, args) => {
    const patch: any = { verificationStatus: args.status };
    if (args.status === "verified" || args.status === "gold_verified") {
      patch.verificationDate = Date.now();
    }
    await ctx.db.patch(args.supplierId, patch);
  },
});

// Mutation to track response time
export const trackResponse = mutation({
  args: {
    supplierId: v.id("suppliers"),
    inquiryType: v.union(v.literal("message"), v.literal("rfq"), v.literal("sample")),
    inquiryId: v.string(),
    receivedAt: v.number(),
    respondedAt: v.optional(v.number()),
    autoAcknowledged: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Insert tracking record
    await ctx.db.insert("responseTracking", {
      supplierId: args.supplierId,
      inquiryType: args.inquiryType,
      inquiryId: args.inquiryId,
      receivedAt: args.receivedAt,
      respondedAt: args.respondedAt,
      responseTime: args.respondedAt ? 
        (args.respondedAt - args.receivedAt) / 60000 : // Convert to minutes
        undefined,
      autoAcknowledged: args.autoAcknowledged,
    });

    // Update supplier average response time if responded
    if (args.respondedAt) {
      const supplier = await ctx.db.get(args.supplierId);
      if (supplier) {
        const responseTimeHours = (args.respondedAt - args.receivedAt) / 3600000;
        const newAvgResponseTime = supplier.responseTime ?
          (supplier.responseTime + responseTimeHours) / 2 :
          responseTimeHours;

        await ctx.db.patch(args.supplierId, {
          responseTime: newAvgResponseTime,
        });

        // Update badges based on response time
        const badges = [...(supplier.badges || [])];
        if (responseTimeHours < 1 && !badges.includes("immediate_response")) {
          badges.push("immediate_response");
        } else if (responseTimeHours < 24 && !badges.includes("fast_response")) {
          badges.push("fast_response");
        }

        if (badges.length !== supplier.badges?.length) {
          await ctx.db.patch(args.supplierId, { badges: badges as any });
        }
      }
    }
  }
});

// Backfill/denormalize supplier flags into all of their products
export const syncSupplierFlagsToProducts = mutation({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found");
    let cursor: string | undefined;
    let updated = 0;
    while (true) {
      const page = await ctx.db
        .query("products")
        .withIndex("by_supplier", q => q.eq("supplierId", args.supplierId))
        .paginate({ numItems: 100, cursor: (cursor ?? null) as any });
      for (const p of page.page) {
        // Recompute minUnitPrice if missing
        const tiers = (p as any).pricingTiers || [];
        const minUnitPrice = tiers.length ? Math.min(...tiers.map((t: any) => t.price)) : undefined;
        await ctx.db.patch(p._id, {
          ...(minUnitPrice != null ? { minUnitPrice } : {}),
          supplierVerificationStatus: (supplier as any).verificationStatus,
          supplierBadges: (supplier as any).badges,
          supplierResponseRate: (supplier as any).responseRate,
          supplierOnTimeDeliveryRate: (supplier as any).onTimeDeliveryRate,
          supplierServiceRating: (supplier as any).serviceRating,
        } as any);
        updated++;
      }
      if (page.isDone) break;
      cursor = page.continueCursor as any;
    }
    return { updated };
  },
});

// Action to calculate supplier trust score
export const calculateTrustScore = action({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.runQuery(api.suppliers.getSupplierProfile as any, {
      supplierId: args.supplierId,
    });

    if (!supplier) throw new Error("Supplier not found");

    // Calculate trust score based on multiple factors
    let score = 0;
    let maxScore = 0;

    // Verification status (30 points)
    maxScore += 30;
    if (supplier.verificationStatus === "gold_verified") score += 30;
    else if (supplier.verificationStatus === "verified") score += 20;
    else if (supplier.verificationStatus === "pending") score += 5;

    // Response rate (20 points)
    maxScore += 20;
    score += (supplier.responseRate / 100) * 20;

    // On-time delivery (20 points)
    maxScore += 20;
    score += (supplier.onTimeDeliveryRate / 100) * 20;

    // Quality score (15 points)
    maxScore += 15;
    score += (supplier.productQualityScore / 5) * 15;

    // Low dispute rate (10 points)
    maxScore += 10;
    score += Math.max(0, 10 - (supplier.disputeRate * 10));

    // Years in business (5 points)
    maxScore += 5;
    const yearsInBusiness = new Date().getFullYear() - supplier.yearEstablished;
    score += Math.min(5, yearsInBusiness / 2);

    // Calculate final score (0-100)
    const trustScore = Math.round((score / maxScore) * 100);

    // Update supplier with trust score
    await ctx.runMutation(api.suppliers.updateTrustScore as any, {
      supplierId: args.supplierId,
      trustScore,
    });

    return trustScore;
  }
});

// Mutation to update trust score
export const updateTrustScore = mutation({
  args: {
    supplierId: v.id("suppliers"),
    trustScore: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.supplierId, {
      trustScore: args.trustScore,
    });
  }
});

// Query to get supplier performance dashboard
export const getSupplierDashboard = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) return null;

    // Get current month's data
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentPerformance = await ctx.db
      .query("supplierPerformanceHistory")
      .withIndex("by_supplier", q => q.eq("supplierId", args.supplierId))
      .filter(q => q.eq(q.field("period"), currentMonth))
      .first();

    // Get recent orders
    const recentOrders = await ctx.db
      .query("orders")
      .withIndex("by_supplier", q => q.eq("supplierId", args.supplierId))
      .order("desc")
      .take(10);

    // Get pending RFQs
    const pendingQuotes = await ctx.db
      .query("quotes")
      .withIndex("by_supplier", q => q.eq("supplierId", args.supplierId))
      .filter(q => q.eq(q.field("status"), "draft"))
      .collect();

    // Get unread messages
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_supplier", q => q.eq("supplierId", args.supplierId))
      .filter(q => q.eq(q.field("status"), "open"))
      .collect();

    return {
      profile: supplier,
      currentPerformance,
      recentOrders,
      pendingQuotes: pendingQuotes.length,
      activeConversations: conversations.length,
      metrics: {
        responseRate: supplier.responseRate,
        avgResponseTime: supplier.responseTime,
        onTimeDelivery: supplier.onTimeDeliveryRate,
        qualityScore: supplier.productQualityScore,
        disputeRate: supplier.disputeRate,
      }
    };
  }
});

// Import api for action
import { api } from "./_generated/api";
