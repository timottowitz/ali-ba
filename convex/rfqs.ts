import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create RFQ (Request for Quotation)
export const createRFQ = mutation({
  args: {
    buyerId: v.id("users"),
    title: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    specifications: v.object({
      materials: v.optional(v.array(v.string())),
      tolerances: v.optional(v.string()),
      colors: v.optional(v.array(v.string())),
      certifications: v.array(v.string()),
      customRequirements: v.optional(v.string()),
    }),
    quantity: v.number(),
    unit: v.string(),
    targetPrice: v.optional(v.number()),
    currency: v.union(v.literal("USD"), v.literal("MXN")),
    incoterm: v.string(),
    deliveryDate: v.string(),
    deliveryLocation: v.string(),
    attachments: v.optional(v.array(v.object({
      fileId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
    }))),
    visibility: v.union(v.literal("public"), v.literal("invited")),
    invitedSuppliers: v.optional(v.array(v.id("suppliers"))),
    expiryDays: v.optional(v.number()), // Days until RFQ expires
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiryDays = args.expiryDays || 7;
    const expiresAt = now + (expiryDays * 24 * 60 * 60 * 1000);

    // Check specification completeness
    const completenessScore = calculateCompletenessScore(args.specifications);

    const rfqId = await ctx.db.insert("rfqs", {
      buyerId: args.buyerId,
      title: args.title,
      description: args.description,
      categoryId: args.categoryId,
      specifications: args.specifications,
      quantity: args.quantity,
      unit: args.unit,
      targetPrice: args.targetPrice,
      currency: args.currency,
      incoterm: args.incoterm as any,
      deliveryDate: args.deliveryDate,
      deliveryLocation: args.deliveryLocation,
      attachments: args.attachments || [],
      status: "open",
      visibility: args.visibility,
      invitedSuppliers: args.invitedSuppliers,
      quotesReceived: 0,
      createdAt: now,
      expiresAt,
      completenessScore,
    });

    // If public, notify matching suppliers
    if (args.visibility === "public") {
      await notifyMatchingSuppliers(ctx, rfqId, args.categoryId);
    } else if (args.invitedSuppliers) {
      // Notify invited suppliers
      await notifyInvitedSuppliers(ctx, rfqId, args.invitedSuppliers);
    }

    return rfqId;
  }
});

// Get RFQ details
export const getRFQDetails = query({
  args: { rfqId: v.id("rfqs") },
  handler: async (ctx, args) => {
    const rfq = await ctx.db.get(args.rfqId);
    if (!rfq) return null;

    // Get buyer info
    const buyer = await ctx.db.get(rfq.buyerId);

    // Get category
    const category = await ctx.db.get(rfq.categoryId);

    // Get quotes
    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_rfq", q => q.eq("rfqId", args.rfqId))
      .collect();

    // Get supplier info for each quote
    const quotesWithSuppliers = await Promise.all(
      quotes.map(async quote => {
        const supplier = await ctx.db.get(quote.supplierId);
        return {
          ...quote,
          supplier: supplier ? {
            _id: supplier._id,
            companyName: supplier.companyName,
            country: supplier.country,
            verificationStatus: supplier.verificationStatus,
            badges: supplier.badges,
            responseRate: supplier.responseRate,
            rating: supplier.serviceRating,
          } : null,
        };
      })
    );

    return {
      rfq,
      buyer: buyer ? {
        _id: buyer._id,
        name: buyer.name,
        email: buyer.email,
      } : null,
      category,
      quotes: quotesWithSuppliers,
      isExpired: rfq.expiresAt < Date.now(),
    };
  }
});

// Get RFQs for supplier (marketplace view)
export const getRFQsForSupplier = query({
  args: {
    supplierId: v.id("suppliers"),
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("awarded")
    )),
    categoryId: v.optional(v.id("categories")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) return { rfqs: [], total: 0 };

    // Get public RFQs
    let query = ctx.db
      .query("rfqs")
      .withIndex("by_status", q => q.eq("status", args.status || "open"));

    // Filter by category if specified
    if (args.categoryId) {
      query = ctx.db
        .query("rfqs")
        .withIndex("by_category", q => q.eq("categoryId", args.categoryId!))
        .filter(q => q.eq(q.field("status"), args.status || "open"));
    }

    let rfqs = await query
      .order("desc")
      .take(args.limit || 50);

    // Filter for visibility and expiry
    const now = Date.now();
    rfqs = rfqs.filter((rfq: any) => {
      // Check if expired
      if (rfq.expiresAt < now) return false;
      
      // Check visibility
      if (rfq.visibility === "public") return true;
      if (rfq.visibility === "invited" && 
          rfq.invitedSuppliers?.includes(args.supplierId)) {
        return true;
      }
      return false;
    });

    // Get additional info for each RFQ
    const rfqsWithInfo = await Promise.all(
      rfqs.map(async (rfq: any) => {
        const [category, quotesCount, hasQuoted] = await Promise.all([
          ctx.db.get(rfq.categoryId),
          ctx.db
            .query("quotes")
            .withIndex("by_rfq", q => q.eq("rfqId", rfq._id))
            .collect()
            .then(quotes => quotes.length),
          ctx.db
            .query("quotes")
            .withIndex("by_rfq", q => q.eq("rfqId", rfq._id))
            .filter(q => q.eq(q.field("supplierId"), args.supplierId))
            .first()
            .then(quote => !!quote),
        ]);

        return {
          ...rfq,
          category: (category as any)?.name,
          quotesCount,
          hasQuoted,
          daysUntilExpiry: Math.ceil((rfq.expiresAt - now) / (24 * 60 * 60 * 1000)),
        };
      })
    );

    return {
      rfqs: rfqsWithInfo,
      total: rfqsWithInfo.length,
    };
  }
});

// Submit quote for RFQ
export const submitQuote = mutation({
  args: {
    rfqId: v.id("rfqs"),
    supplierId: v.id("suppliers"),
    pricingTiers: v.array(v.object({
      minQuantity: v.number(),
      maxQuantity: v.optional(v.number()),
      unitPrice: v.number(),
      totalPrice: v.number(),
    })),
    currency: v.union(v.literal("USD"), v.literal("MXN")),
    leadTime: v.number(), // days
    validityPeriod: v.number(), // days
    paymentTerms: v.string(),
    incoterm: v.string(),
    notes: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("_storage"))),
    sampleAvailable: v.boolean(),
    sampleCost: v.optional(v.number()),
    customizationOffered: v.optional(v.object({
      types: v.array(v.string()),
      additionalCost: v.number(),
      additionalLeadTime: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const rfq = await ctx.db.get(args.rfqId);
    if (!rfq) throw new Error("RFQ not found");
    if (rfq.status !== "open") throw new Error("RFQ is not open for quotes");
    if (rfq.expiresAt < Date.now()) throw new Error("RFQ has expired");

    // Check if supplier already quoted
    const existingQuote = await ctx.db
      .query("quotes")
      .withIndex("by_rfq", q => q.eq("rfqId", args.rfqId))
      .filter(q => q.eq(q.field("supplierId"), args.supplierId))
      .first();

    if (existingQuote && existingQuote.status !== "draft") {
      throw new Error("You have already submitted a quote for this RFQ");
    }

    const now = Date.now();
    const responseTime = (now - rfq.createdAt) / 3600000; // hours

    const quoteData = {
      rfqId: args.rfqId,
      supplierId: args.supplierId,
      pricingTiers: args.pricingTiers,
      currency: args.currency,
      leadTime: args.leadTime,
      validityPeriod: args.validityPeriod,
      paymentTerms: args.paymentTerms,
      incoterm: args.incoterm as any,
      notes: args.notes,
      attachments: args.attachments,
      sampleAvailable: args.sampleAvailable,
      sampleCost: args.sampleCost,
      customizationOffered: args.customizationOffered,
      status: "submitted" as const,
      submittedAt: now,
      responseTime,
    };

    let quoteId: Id<"quotes">;
    if (existingQuote) {
      // Update draft quote
      await ctx.db.patch(existingQuote._id, quoteData);
      quoteId = existingQuote._id;
    } else {
      // Create new quote
      quoteId = await ctx.db.insert("quotes", quoteData);
      
      // Update RFQ quotes count
      await ctx.db.patch(args.rfqId, {
        quotesReceived: rfq.quotesReceived + 1,
      });
    }

    // Track supplier response
    await ctx.db.insert("responseTracking", {
      supplierId: args.supplierId,
      inquiryType: "rfq",
      inquiryId: args.rfqId,
      receivedAt: rfq.createdAt,
      respondedAt: now,
      responseTime: responseTime * 60, // convert to minutes
      autoAcknowledged: false,
    });

    return quoteId;
  }
});

// Get quotes for an RFQ (buyer view)
export const getRFQQuotes = query({
  args: {
    rfqId: v.id("rfqs"),
    sortBy: v.optional(v.union(
      v.literal("price_low"),
      v.literal("price_high"),
      v.literal("lead_time"),
      v.literal("response_time")
    )),
  },
  handler: async (ctx, args) => {
    const rfq = await ctx.db.get(args.rfqId);
    if (!rfq) return { quotes: [], rfq: null };

    let quotes = await ctx.db
      .query("quotes")
      .withIndex("by_rfq", q => q.eq("rfqId", args.rfqId))
      .filter(q => q.eq(q.field("status"), "submitted"))
      .collect();

    // Get supplier details for each quote
    const quotesWithSuppliers = await Promise.all(
      quotes.map(async quote => {
        const supplier = await ctx.db.get(quote.supplierId);
        if (!supplier) return null;

        // Calculate price for RFQ quantity
        const applicableTier = quote.pricingTiers.find(tier => {
          const min = tier.minQuantity;
          const max = tier.maxQuantity || Infinity;
          return rfq.quantity >= min && rfq.quantity <= max;
        }) || quote.pricingTiers[0];

        const totalPrice = applicableTier ? 
          applicableTier.unitPrice * rfq.quantity : 0;

        return {
          ...quote,
          calculatedPrice: totalPrice,
          supplier: {
            _id: supplier._id,
            companyName: supplier.companyName,
            location: supplier.location,
            country: supplier.country,
            verificationStatus: supplier.verificationStatus,
            badges: supplier.badges,
            responseRate: supplier.responseRate,
            onTimeDeliveryRate: supplier.onTimeDeliveryRate,
            rating: supplier.serviceRating,
            totalTransactions: supplier.totalTransactions,
          },
        };
      })
    );

    const validQuotes = quotesWithSuppliers.filter(Boolean) as any[];

    // Sort quotes
    switch (args.sortBy) {
      case "price_low":
        validQuotes.sort((a, b) => a.calculatedPrice - b.calculatedPrice);
        break;
      case "price_high":
        validQuotes.sort((a, b) => b.calculatedPrice - a.calculatedPrice);
        break;
      case "lead_time":
        validQuotes.sort((a, b) => a.leadTime - b.leadTime);
        break;
      case "response_time":
        validQuotes.sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0));
        break;
    }

    return {
      rfq,
      quotes: validQuotes,
      statistics: {
        totalQuotes: validQuotes.length,
        avgPrice: validQuotes.reduce((sum, q) => sum + q.calculatedPrice, 0) / validQuotes.length,
        minPrice: Math.min(...validQuotes.map(q => q.calculatedPrice)),
        maxPrice: Math.max(...validQuotes.map(q => q.calculatedPrice)),
        avgLeadTime: validQuotes.reduce((sum, q) => sum + q.leadTime, 0) / validQuotes.length,
      },
    };
  }
});

// Accept quote and convert to order
export const acceptQuote = mutation({
  args: {
    quoteId: v.id("quotes"),
    buyerId: v.id("users"),
    shippingAddress: v.optional(v.object({
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error("Quote not found");
    if (quote.status !== "submitted") throw new Error("Quote is not available");

    const rfq = await ctx.db.get(quote.rfqId);
    if (!rfq) throw new Error("RFQ not found");
    if (rfq.buyerId !== args.buyerId) throw new Error("Unauthorized");

    // Update quote status
    await ctx.db.patch(args.quoteId, { status: "accepted" });

    // Update RFQ status
    await ctx.db.patch(quote.rfqId, { status: "awarded" });

    // Reject other quotes
    const otherQuotes = await ctx.db
      .query("quotes")
      .withIndex("by_rfq", q => q.eq("rfqId", quote.rfqId))
      .filter(q => q.neq(q.field("_id"), args.quoteId))
      .collect();

    for (const otherQuote of otherQuotes) {
      if (otherQuote.status === "submitted") {
        await ctx.db.patch(otherQuote._id, { status: "rejected" });
      }
    }

    // Create order from quote
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate pricing for RFQ quantity
    const applicableTier = quote.pricingTiers.find(tier => {
      const min = tier.minQuantity;
      const max = tier.maxQuantity || Infinity;
      return rfq.quantity >= min && rfq.quantity <= max;
    }) || quote.pricingTiers[0];

    const unitPrice = applicableTier.unitPrice;
    const subtotal = unitPrice * rfq.quantity;
    const shippingCost = subtotal * 0.1; // Estimate 10%
    const taxAmount = subtotal * 0.08; // Estimate 8%
    const totalAmount = subtotal + shippingCost + taxAmount;

    const orderId = await ctx.db.insert("orders", {
      buyerId: args.buyerId,
      supplierId: quote.supplierId,
      sourceType: "rfq",
      quoteId: args.quoteId,
      orderNumber,
      items: [{
        productId: "" as Id<"products">, // RFQ may not have specific product
        quantity: rfq.quantity,
        unitPrice,
        totalPrice: subtotal,
        specifications: rfq.specifications,
      }],
      subtotal,
      shippingCost,
      taxAmount,
      totalAmount,
      currency: quote.currency,
      tradeAssurance: {
        enabled: true,
        contractId: `TA-${orderNumber}`,
        protectedAmount: totalAmount,
        qcCriteria: {
          inspectionLevel: "standard",
          acceptanceQualityLimit: 2.5,
          inspectionPoints: ["pre-production", "during-production", "pre-shipment"],
          requiredDocuments: rfq.specifications.certifications || [],
        },
        deliveryTerms: {
          incoterm: quote.incoterm,
          deliveryDate: new Date(rfq.deliveryDate).getTime(),
        },
        paymentMilestones: [
          {
            phase: "deposit",
            percentage: 30,
            amount: totalAmount * 0.3,
            dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
            status: "pending",
          },
          {
            phase: "pre_shipment",
            percentage: 70,
            amount: totalAmount * 0.7,
            dueDate: new Date(rfq.deliveryDate).getTime() - 7 * 24 * 60 * 60 * 1000,
            status: "pending",
          },
        ],
      },
      status: "pending_payment",
      shipping: {
        method: "sea", // Default, can be updated
      },
      createdAt: Date.now(),
    });

    return orderId;
  }
});

// Compare quotes side by side
export const compareQuotes = query({
  args: {
    quoteIds: v.array(v.id("quotes")),
    rfqQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quoteIds.length < 2 || args.quoteIds.length > 4) {
      throw new Error("Select 2-4 quotes to compare");
    }

    const quotes = await Promise.all(
      args.quoteIds.map(id => ctx.db.get(id))
    );

    const quotesWithDetails = await Promise.all(
      quotes.filter(Boolean).map(async quote => {
        const supplier = await ctx.db.get(quote!.supplierId);
        
        // Calculate price for specified quantity
        const applicableTier = quote!.pricingTiers.find(tier => {
          const min = tier.minQuantity;
          const max = tier.maxQuantity || Infinity;
          return args.rfqQuantity >= min && args.rfqQuantity <= max;
        }) || quote!.pricingTiers[0];

        const totalPrice = applicableTier.unitPrice * args.rfqQuantity;

        return {
          quoteId: quote!._id,
          supplier: supplier ? {
            name: supplier.companyName,
            country: supplier.country,
            verificationStatus: supplier.verificationStatus,
            responseRate: supplier.responseRate,
            onTimeDelivery: supplier.onTimeDeliveryRate,
            rating: supplier.serviceRating,
          } : null,
          pricing: {
            unitPrice: applicableTier.unitPrice,
            totalPrice,
            currency: quote!.currency,
            tiers: quote!.pricingTiers,
          },
          terms: {
            leadTime: quote!.leadTime,
            paymentTerms: quote!.paymentTerms,
            incoterm: quote!.incoterm,
            validityPeriod: quote!.validityPeriod,
          },
          extras: {
            sampleAvailable: quote!.sampleAvailable,
            sampleCost: quote!.sampleCost,
            customization: quote!.customizationOffered,
          },
        };
      })
    );

    return {
      quotes: quotesWithDetails,
      bestPrice: Math.min(...quotesWithDetails.map(q => q.pricing.totalPrice)),
      fastestDelivery: Math.min(...quotesWithDetails.map(q => q.terms.leadTime)),
    };
  }
});

// List open RFQs (paged) with filters
export const listOpenPaged = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.optional(v.string()) }),
    categoryId: v.optional(v.id("categories")),
    minQuantity: v.optional(v.number()),
    maxQuantity: v.optional(v.number()),
    incoterm: v.optional(v.string()),
    sortBy: v.optional(v.union(v.literal("expires"), v.literal("newest"))),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("rfqs")
      .withIndex("by_status", qq => qq.eq("status", "open"));

    if (args.categoryId) q = q.filter(qq => qq.eq(qq.field("categoryId"), args.categoryId!));
    if (args.minQuantity != null) q = q.filter(qq => qq.gte(qq.field("quantity"), args.minQuantity!));
    if (args.maxQuantity != null) q = q.filter(qq => qq.lte(qq.field("quantity"), args.maxQuantity!));
    if (args.incoterm) q = q.filter(qq => qq.eq(qq.field("incoterm"), args.incoterm as any));
    // Sort by newest in query; otherwise sort in-memory by soonest expiry
    if (args.sortBy === "newest") {
      q = (q as any).order("desc");
    }

    const page = await q.paginate(args.paginationOpts as any);
    // Optional simple keyword filter on title/description
    let rfqs = page.page;
    if (args.sortBy !== 'newest') {
      rfqs = [...rfqs].sort((a: any, b: any) => (a.expiresAt || 0) - (b.expiresAt || 0));
    }
    if (args.query) {
      const s = args.query.toLowerCase();
      rfqs = rfqs.filter(r => (r.title?.toLowerCase().includes(s) || (r.description || '').toLowerCase().includes(s)));
    }
    // Enrich with category + quote count
    const enriched = await Promise.all(rfqs.map(async (r) => {
      const cat = await ctx.db.get(r.categoryId);
      const quotesCount = await ctx.db
        .query("quotes")
        .withIndex("by_rfq", qq => qq.eq("rfqId", r._id))
        .collect()
        .then(a => a.length);
      return { rfq: r, category: cat, quotesCount };
    }));
    return { ...page, page: enriched };
  },
});

// Helper functions
function calculateCompletenessScore(specifications: any): number {
  let score = 0;
  let maxScore = 5;

  if (specifications.materials && specifications.materials.length > 0) score++;
  if (specifications.tolerances) score++;
  if (specifications.colors && specifications.colors.length > 0) score++;
  if (specifications.certifications && specifications.certifications.length > 0) score++;
  if (specifications.customRequirements) score++;

  return (score / maxScore) * 100;
}

async function notifyMatchingSuppliers(ctx: any, rfqId: Id<"rfqs">, categoryId: Id<"categories">) {
  // Find suppliers that match the category
  // In production, this would send notifications
  const suppliers = await ctx.db
    .query("suppliers")
    .filter((q: any) => q.eq(q.field("verificationStatus"), "verified"))
    .take(100)
    .collect();

  // Track RFQ as received for each supplier
  for (const supplier of suppliers) {
    await ctx.db.insert("responseTracking", {
      supplierId: supplier._id,
      inquiryType: "rfq",
      inquiryId: rfqId,
      receivedAt: Date.now(),
      autoAcknowledged: false,
    });
  }
}

async function notifyInvitedSuppliers(ctx: any, rfqId: Id<"rfqs">, supplierIds: Id<"suppliers">[]) {
  // Track RFQ as received for invited suppliers
  for (const supplierId of supplierIds) {
    await ctx.db.insert("responseTracking", {
      supplierId,
      inquiryType: "rfq",
      inquiryId: rfqId,
      receivedAt: Date.now(),
      autoAcknowledged: false,
    });
  }
}
