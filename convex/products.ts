import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { Doc, Id } from "./_generated/dataModel";

// Query to get product detail page data
export const getProductDetail = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    // Get supplier with trust signals
    const supplier = await ctx.db.get(product.supplierId);
    if (!supplier) return null;

    // Get product reviews
    const reviews = await ctx.db
      .query("productReviews")
      .withIndex("by_product", q => q.eq("productId", args.productId))
      .filter(q => q.eq(q.field("visibility"), "public"))
      .order("desc")
      .take(10);

    // Get category
    const category = await ctx.db.get(product.categoryId);

    // Get certifications with documents
    const certifications = await Promise.all(
      (product.certifications || []).map(async cert => ({
        ...cert,
        document: await ctx.db.get(cert.documentId)
      }))
    );

    // Get test reports
    const testReports = product.testReports ? 
      await Promise.all(product.testReports.map(id => ctx.db.get(id))) :
      [];

    // Get related products (same category, different supplier)
    const relatedProducts = await ctx.db
      .query("products")
      .withIndex("by_category", q => q.eq("categoryId", product.categoryId))
      .filter(q => 
        q.and(
          q.neq(q.field("_id"), args.productId),
          q.eq(q.field("status"), "active")
        )
      )
      .take(6);

    // Image URLs for gallery
    const imageUrls = await Promise.all((product.images || []).map((id) => ctx.storage.getUrl(id)));

    return {
      product: {
        ...product,
        imageUrls: imageUrls.filter(Boolean),
        certifications,
        testReports: testReports.filter(Boolean),
      },
      supplier: {
        _id: supplier._id,
        companyName: supplier.companyName,
        location: supplier.location,
        country: supplier.country,
        verificationStatus: supplier.verificationStatus,
        badges: supplier.badges,
        responseRate: supplier.responseRate,
        responseTime: supplier.responseTime,
        onTimeDeliveryRate: supplier.onTimeDeliveryRate,
        totalTransactions: supplier.totalTransactions,
        serviceRating: supplier.serviceRating,
        yearEstablished: supplier.yearEstablished,
      },
      category,
      reviews,
      relatedProducts,
    };
  }
});

// Query to search products with filters
export const searchProducts = query({
  args: {
    query: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    supplierId: v.optional(v.id("suppliers")),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    minMOQ: v.optional(v.number()),
    maxMOQ: v.optional(v.number()),
    country: v.optional(v.union(v.literal("MX"), v.literal("US"))),
    verifiedOnly: v.optional(v.boolean()),
    tradeAssuranceOnly: v.optional(v.boolean()),
    samplesAvailable: v.optional(v.boolean()),
    certifications: v.optional(v.array(v.string())),
    incoterms: v.optional(v.array(v.string())),
    // Lead time filters (days)
    minLeadTimeSample: v.optional(v.number()),
    maxLeadTimeSample: v.optional(v.number()),
    minLeadTimeBulk: v.optional(v.number()),
    maxLeadTimeBulk: v.optional(v.number()),
    sortBy: v.optional(v.union(
      v.literal("relevance"),
      v.literal("price_low"),
      v.literal("price_high"),
      v.literal("moq_low"),
      v.literal("rating"),
      v.literal("newest")
    )),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("products")
      .withIndex("by_status", q => q.eq("status", "active"));

    // Apply category filter
    if (args.categoryId) {
      query = ctx.db.query("products")
        .withIndex("by_category", q => q.eq("categoryId", args.categoryId!))
        .filter(q => q.eq(q.field("status"), "active"));
    }

    // Apply supplier filter
    if (args.supplierId) {
      query = ctx.db.query("products")
        .withIndex("by_supplier", q => q.eq("supplierId", args.supplierId!))
        .filter(q => q.eq(q.field("status"), "active"));
    }

    // Get all products first
    let products = await query.collect();

    // Apply additional filters
    if (args.minMOQ !== undefined) {
      products = products.filter(p => p.minOrderQuantity >= args.minMOQ!);
    }
    if (args.maxMOQ !== undefined) {
      products = products.filter(p => p.minOrderQuantity <= args.maxMOQ!);
    }
    if (args.samplesAvailable) {
      products = products.filter(p => p.samplesAvailable);
    }

    // Filter by price range (using first tier)
    if (args.minPrice !== undefined || args.maxPrice !== undefined) {
      products = products.filter(p => {
        const firstTier = p.pricingTiers[0];
        if (!firstTier) return false;
        if (args.minPrice && firstTier.price < args.minPrice) return false;
        if (args.maxPrice && firstTier.price > args.maxPrice) return false;
        return true;
      });
    }

    // Filter by certifications
    if (args.certifications && args.certifications.length > 0) {
      products = products.filter(p =>
        args.certifications!.some(cert =>
          p.certifications?.some(pCert => pCert.type === cert)
        )
      );
    }

    // Filter by incoterms
    if (args.incoterms && args.incoterms.length > 0) {
      products = products.filter(p =>
        args.incoterms!.some(term =>
          p.incoterms?.includes(term as any)
        )
      );
    }

    // Get supplier data for filtering
    if (args.verifiedOnly || args.tradeAssuranceOnly || args.country) {
      const supplierIds = [...new Set(products.map(p => p.supplierId))];
      const suppliers = await Promise.all(
        supplierIds.map(id => ctx.db.get(id))
      );
      const supplierMap = new Map(
        suppliers.filter(Boolean).map(s => [s!._id, s!])
      );

      products = products.filter(p => {
        const supplier = supplierMap.get(p.supplierId);
        if (!supplier) return false;
        
        if (args.verifiedOnly && 
            !["verified", "gold_verified"].includes(supplier.verificationStatus)) {
          return false;
        }
        
        if (args.tradeAssuranceOnly && 
            !supplier.badges?.includes("trade_assurance")) {
          return false;
        }
        
        if (args.country && supplier.country !== args.country) {
          return false;
        }
        
        return true;
      });
    }

    // Text search
    if (args.query) {
      const searchLower = args.query.toLowerCase();
      products = products.filter(p =>
        p.title.en.toLowerCase().includes(searchLower) ||
        p.title.es.toLowerCase().includes(searchLower) ||
        p.description.en.toLowerCase().includes(searchLower) ||
        p.description.es.toLowerCase().includes(searchLower) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort products
    switch (args.sortBy) {
      case "price_low":
        products.sort((a, b) => 
          (a.pricingTiers[0]?.price || 0) - (b.pricingTiers[0]?.price || 0)
        );
        break;
      case "price_high":
        products.sort((a, b) => 
          (b.pricingTiers[0]?.price || 0) - (a.pricingTiers[0]?.price || 0)
        );
        break;
      case "moq_low":
        products.sort((a, b) => a.minOrderQuantity - b.minOrderQuantity);
        break;
      case "rating":
        products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
        products.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
    }

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 20;
    const paginatedProducts = products.slice(offset, offset + limit);

    // Get supplier info for each product
    const productsWithSuppliers = await Promise.all(
      paginatedProducts.map(async product => {
        const supplier = await ctx.db.get(product.supplierId);
        return {
          ...product,
          supplier: supplier ? {
            _id: supplier._id,
            companyName: supplier.companyName,
            country: supplier.country,
            verificationStatus: supplier.verificationStatus,
            badges: supplier.badges,
            responseRate: supplier.responseRate,
          } : null,
        };
      })
    );

    return {
      products: productsWithSuppliers,
      total: products.length,
      hasMore: offset + limit < products.length,
    };
  }
});

// Mutation to create or update product
export const upsertProduct = mutation({
  args: {
    productId: v.optional(v.id("products")),
    supplierId: v.id("suppliers"),
    title: v.object({
      en: v.string(),
      es: v.string(),
    }),
    description: v.object({
      en: v.string(),
      es: v.string(),
    }),
    categoryId: v.id("categories"),
    pricingTiers: v.array(v.object({
      minQuantity: v.number(),
      maxQuantity: v.optional(v.number()),
      price: v.number(),
      currency: v.union(v.literal("USD"), v.literal("MXN")),
      priceType: v.union(v.literal("FOB"), v.literal("EXW"), v.literal("DDP")),
    })),
    minOrderQuantity: v.number(),
    moqUnit: v.string(),
    inventoryCount: v.number(),
    inventoryUnit: v.string(),
    leadTime: v.object({
      sample: v.number(),
      bulk: v.number(),
    }),
    productionCapacity: v.object({
      daily: v.number(),
      unit: v.string(),
    }),
    specifications: v.any(),
    customizationOptions: v.object({
      oem: v.boolean(),
      odm: v.boolean(),
      customLogo: v.boolean(),
      customPackaging: v.boolean(),
      customColors: v.boolean(),
      minCustomizationQty: v.optional(v.number()),
    }),
    incoterms: v.array(v.union(v.literal("EXW"), v.literal("FOB"), v.literal("CIF"), v.literal("DDP"), v.literal("DAP"))),
    samplesAvailable: v.boolean(),
    samplePrice: v.optional(v.number()),
    sampleLeadTime: v.optional(v.number()),
    samplePolicy: v.optional(v.string()),
    warranty: v.optional(v.object({
      duration: v.number(),
      unit: v.union(v.literal("days"), v.literal("months"), v.literal("years")),
      terms: v.string(),
    })),
    returnPolicy: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { productId, ...productData } = args;
    const now = Date.now();
    const tiers = (productData as any).pricingTiers || [];
    const minUnitPrice = tiers.length ? Math.min(...tiers.map((t: any) => t.price)) : undefined;

    // Fetch supplier to denormalize flags
    const supplier = await ctx.db.get((productData as any).supplierId);

    if (productId) {
      // Update existing product
      await ctx.db.patch(productId, {
        ...productData,
        updatedAt: now,
        ...(minUnitPrice != null ? { minUnitPrice } : {}),
        ...(supplier ? {
          supplierVerificationStatus: (supplier as any).verificationStatus,
          supplierBadges: (supplier as any).badges,
          supplierResponseRate: (supplier as any).responseRate,
          supplierOnTimeDeliveryRate: (supplier as any).onTimeDeliveryRate,
          supplierServiceRating: (supplier as any).serviceRating,
        } : {}),
      });
      // Re-chunk product text
      await ctx.runMutation(api.search.upsertProductChunks, { productId, language: 'en' as any });
      return productId;
    } else {
      // Create new product
      const newId = await ctx.db.insert("products", {
        ...productData,
        images: [],
        status: "active",
        rating: 0,
        reviewCount: 0,
        certifications: [],
        createdAt: now,
        updatedAt: now,
        incoterms: productData.incoterms as any,
        ...(minUnitPrice != null ? { minUnitPrice } : {}),
        ...(supplier ? {
          supplierVerificationStatus: (supplier as any).verificationStatus,
          supplierBadges: (supplier as any).badges,
          supplierResponseRate: (supplier as any).responseRate,
          supplierOnTimeDeliveryRate: (supplier as any).onTimeDeliveryRate,
          supplierServiceRating: (supplier as any).serviceRating,
        } : {}),
      });
      await ctx.runMutation(api.search.upsertProductChunks, { productId: newId, language: 'en' as any });
      return newId;
    }
  }
});

// Mutation to upload product images
export const uploadProductImages = mutation({
  args: {
    productId: v.id("products"),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    await ctx.db.patch(args.productId, {
      images: [...(product.images || []), ...args.imageIds],
      updatedAt: Date.now(),
    });
  }
});

// Mutation to add product certification
export const addProductCertification = mutation({
  args: {
    productId: v.id("products"),
    type: v.string(),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const certification = {
      type: args.type,
      documentId: args.documentId,
      verifiedDate: Date.now(),
    };

    await ctx.db.patch(args.productId, {
      certifications: [...(product.certifications || []), certification],
      updatedAt: Date.now(),
    });
  }
});

// Mutation to update product inventory
export const updateInventory = mutation({
  args: {
    productId: v.id("products"),
    inventoryCount: v.number(),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("out_of_stock"),
      v.literal("discontinued")
    )),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      inventoryCount: args.inventoryCount,
      updatedAt: Date.now(),
    };

    // Auto-update status based on inventory
    if (args.inventoryCount === 0) {
      updates.status = "out_of_stock";
    } else if (args.status) {
      updates.status = args.status;
    }

    await ctx.db.patch(args.productId, updates);
  }
});

// Query to get products by supplier
export const getSupplierProducts = query({
  args: {
    supplierId: v.id("suppliers"),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("out_of_stock"),
      v.literal("discontinued"),
      v.literal("removed")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("products")
      .withIndex("by_supplier", q => q.eq("supplierId", args.supplierId));

    if (args.status) {
      query = query.filter(q => q.eq(q.field("status"), args.status));
    }

    const products = await query
      .order("desc")
      .take(args.limit || 50);

    // Get categories for each product
    const productsWithCategories = await Promise.all(
      products.map(async product => {
        const category = await ctx.db.get(product.categoryId);
        return {
          ...product,
          category: category ? {
            _id: category._id,
            name: category.name,
          } : null,
        };
      })
    );

    return productsWithCategories;
  }
});

// Paged list of products with supplier, category, and image URLs
export const listProductsPaged = query({
  args: {
    paginationOpts: paginationOptsValidator,
    categoryId: v.optional(v.id("categories")),
    supplierId: v.optional(v.id("suppliers")),
    // Filters (applied on page)
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    minMOQ: v.optional(v.number()),
    maxMOQ: v.optional(v.number()),
    minLeadTimeSample: v.optional(v.number()),
    maxLeadTimeSample: v.optional(v.number()),
    verifiedOnly: v.optional(v.boolean()),
    tradeAssuranceOnly: v.optional(v.boolean()),
    minResponseRate: v.optional(v.number()),
    hsCode: v.optional(v.string()),
    incoterm: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
    priceType: v.optional(v.union(v.literal("FOB"), v.literal("EXW"), v.literal("DDP"), v.literal("CIF"))),
    sortBy: v.optional(v.union(
      v.literal("relevance"),
      v.literal("price_low"),
      v.literal("price_high"),
      v.literal("newest"),
      v.literal("rating"),
    )),
  },
  handler: async (ctx, args) => {
    // Build base query without mixing different query types to satisfy TS
    const base = ctx.db.query("products");
    const qInit = args.categoryId
      ? ctx.db.query("products").withIndex("by_category", qi => qi.eq("categoryId", args.categoryId!))
      : args.supplierId
        ? ctx.db.query("products").withIndex("by_supplier", qi => qi.eq("supplierId", args.supplierId!))
        : base;
    const result = await qInit.order("desc").paginate(args.paginationOpts);
    let page = await Promise.all(result.page.map(async (p: any) => {
      const supplier = await ctx.db.get(p.supplierId);
      const category = await ctx.db.get(p.categoryId);
      const imageUrls = await Promise.all((p.images || []).map((id: any) => ctx.storage.getUrl(id)));
      return { ...p, supplier, category, imageUrls: imageUrls.filter(Boolean) };
    }));

    // Apply basic filters in-memory on the current page
    page = page.filter((p) => {
      // MOQ
      if (args.minMOQ != null && p.minOrderQuantity < args.minMOQ) return false;
      if (args.maxMOQ != null && p.minOrderQuantity > args.maxMOQ) return false;
      // Lead time
      if (args.minLeadTimeSample != null && (p.leadTime?.sample ?? Infinity) < args.minLeadTimeSample) return false;
      if (args.maxLeadTimeSample != null && (p.leadTime?.sample ?? 0) > args.maxLeadTimeSample) return false;
      // Price range (use min price across tiers)
      const tierPrices = (p.pricingTiers || []).map((t: any) => t.price).filter((n: number) => typeof n === 'number');
      const minP = tierPrices.length ? Math.min(...tierPrices) : undefined;
      if (args.minPrice != null && (minP ?? Infinity) < args.minPrice) { /* ok */ } // min filter compares min price lower bound not strictly needed
      if (args.minPrice != null && (minP ?? Infinity) < args.minPrice) return false;
      if (args.maxPrice != null && (minP ?? 0) > args.maxPrice) return false;
      // Supplier flags
      if (args.verifiedOnly && p.supplier?.verificationStatus !== 'verified' && p.supplier?.verificationStatus !== 'gold_verified') return false;
      if (args.tradeAssuranceOnly && !(p.supplier?.badges || []).includes('trade_assurance')) return false;
      if (args.minResponseRate != null && (p.supplier?.responseRate ?? 0) < args.minResponseRate) return false;
      if (args.hsCode && p.specifications?.hsCode !== args.hsCode) return false;
      if (args.incoterm && !(p.incoterms || []).includes(args.incoterm as any)) return false;
      if (args.priceType && !((p.pricingTiers || []).some((t: any) => t.priceType === args.priceType))) return false;
      if (args.certifications && args.certifications.length) {
        const certs = (p.certifications || []).map((c: any) => c.type)
        if (!args.certifications.some((c) => certs.includes(c))) return false;
      }
      return true;
    });
    // Sorting
    if (args.sortBy === "price_low" || args.sortBy === "price_high") {
      page.sort((a: any, b: any) => {
        const aMin = (a.minUnitPrice != null) ? a.minUnitPrice : Math.min(...(a.pricingTiers || []).map((t: any) => t.price));
        const bMin = (b.minUnitPrice != null) ? b.minUnitPrice : Math.min(...(b.pricingTiers || []).map((t: any) => t.price));
        return args.sortBy === "price_low" ? aMin - bMin : bMin - aMin;
      });
    } else if (args.sortBy === "newest") {
      page.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (args.sortBy === "rating") {
      page.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    }
    return { ...result, page };
  }
});

// Paged search by title with supplier, category, and image URLs
export const searchProductsPaged = query({
  args: {
    query: v.string(),
    paginationOpts: paginationOptsValidator,
    categoryId: v.optional(v.id("categories")),
    searchIn: v.optional(v.union(
      v.literal("title_en"),
      v.literal("description_en"),
      v.literal("title_es"),
      v.literal("description_es"),
    )),
    // Filters (applied on page)
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    minMOQ: v.optional(v.number()),
    maxMOQ: v.optional(v.number()),
    minLeadTimeSample: v.optional(v.number()),
    maxLeadTimeSample: v.optional(v.number()),
    verifiedOnly: v.optional(v.boolean()),
    tradeAssuranceOnly: v.optional(v.boolean()),
    minResponseRate: v.optional(v.number()),
    hsCode: v.optional(v.string()),
    incoterm: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
    priceType: v.optional(v.union(v.literal("FOB"), v.literal("EXW"), v.literal("DDP"), v.literal("CIF"))),
    sortBy: v.optional(v.union(
      v.literal("relevance"),
      v.literal("price_low"),
      v.literal("price_high"),
      v.literal("newest"),
      v.literal("rating"),
    )),
  },
  handler: async (ctx, args) => {
    const indexName = args.searchIn === 'description_en'
      ? 'search_description_en'
      : args.searchIn === 'description_es'
        ? 'search_description_es'
        : args.searchIn === 'title_es'
          ? 'search_title_es'
          : 'search_title';
    const fieldName = args.searchIn === 'description_en'
      ? 'description.en'
      : args.searchIn === 'description_es'
        ? 'description.es'
        : (args.searchIn === 'title_es' ? 'title.es' : 'title.en');
    const result = await ctx.db
      .query("products")
      .withSearchIndex(indexName as any, q => {
        let qq = q.search(fieldName as any, args.query);
        if (args.categoryId) qq = qq.eq("categoryId", args.categoryId as any);
        return qq;
      })
      .paginate(args.paginationOpts);
    let page = await Promise.all(result.page.map(async (p: any) => {
      const supplier = await ctx.db.get(p.supplierId);
      const category = await ctx.db.get(p.categoryId);
      const imageUrls = await Promise.all((p.images || []).map((id: any) => ctx.storage.getUrl(id)));
      return { ...p, supplier, category, imageUrls: imageUrls.filter(Boolean) };
    }));
    // Apply filters on the page
    page = page.filter((p) => {
      if (args.minMOQ != null && p.minOrderQuantity < args.minMOQ) return false;
      if (args.maxMOQ != null && p.minOrderQuantity > args.maxMOQ) return false;
      if (args.minLeadTimeSample != null && (p.leadTime?.sample ?? Infinity) < args.minLeadTimeSample) return false;
      if (args.maxLeadTimeSample != null && (p.leadTime?.sample ?? 0) > args.maxLeadTimeSample) return false;
      const tierPrices = (p.pricingTiers || []).map((t: any) => t.price).filter((n: number) => typeof n === 'number');
      const minP = tierPrices.length ? Math.min(...tierPrices) : undefined;
      if (args.minPrice != null && (minP ?? Infinity) < args.minPrice) return false;
      if (args.maxPrice != null && (minP ?? 0) > args.maxPrice) return false;
      if (args.verifiedOnly && p.supplier?.verificationStatus !== 'verified' && p.supplier?.verificationStatus !== 'gold_verified') return false;
      if (args.tradeAssuranceOnly && !(p.supplier?.badges || []).includes('trade_assurance')) return false;
      if (args.minResponseRate != null && (p.supplier?.responseRate ?? 0) < args.minResponseRate) return false;
      if (args.hsCode && p.specifications?.hsCode !== args.hsCode) return false;
      if (args.incoterm && !(p.incoterms || []).includes(args.incoterm as any)) return false;
      if (args.priceType && !((p.pricingTiers || []).some((t: any) => t.priceType === args.priceType))) return false;
      if (args.certifications && args.certifications.length) {
        const certs = (p.certifications || []).map((c: any) => c.type)
        if (!args.certifications.some((c) => certs.includes(c))) return false;
      }
      return true;
    });
    if (args.sortBy === "price_low" || args.sortBy === "price_high") {
      page.sort((a: any, b: any) => {
        const aMin = Math.min(...(a.pricingTiers || []).map((t: any) => t.price));
        const bMin = Math.min(...(b.pricingTiers || []).map((t: any) => t.price));
        return args.sortBy === "price_low" ? aMin - bMin : bMin - aMin;
      });
    } else if (args.sortBy === "newest") {
      page.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (args.sortBy === "rating") {
      page.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    }
    return { ...result, page };
  }
});

// Mutation to create sample request
export const createSampleRequest = mutation({
  args: {
    productId: v.id("products"),
    buyerId: v.id("users"),
    quantity: v.number(),
    shippingAddress: v.object({
      name: v.string(),
      company: v.optional(v.string()),
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
      phone: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    if (!product.samplesAvailable) throw new Error("Samples not available for this product");

    const sampleCost = product.samplePrice || 0;
    const shippingCost = 10; // Calculate based on location
    const totalCost = sampleCost * args.quantity + shippingCost;

    const sampleRequestId = await ctx.db.insert("sampleRequests", {
      productId: args.productId,
      buyerId: args.buyerId,
      supplierId: product.supplierId,
      quantity: args.quantity,
      shippingAddress: args.shippingAddress,
      sampleCost,
      shippingCost,
      totalCost,
      currency: "USD",
      creditApplicable: true,
      status: "requested",
      requestedAt: Date.now(),
    });

    // Track response time for supplier
    await ctx.db.insert("responseTracking", {
      supplierId: product.supplierId,
      inquiryType: "sample",
      inquiryId: sampleRequestId,
      receivedAt: Date.now(),
      autoAcknowledged: false,
    });

    return sampleRequestId;
  }
});

// Query to get product price calculator
export const calculatePrice = query({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    currency: v.optional(v.union(v.literal("USD"), v.literal("MXN"))),
    incoterm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    // Find applicable pricing tier
    let applicableTier = product.pricingTiers.find(tier => {
      const min = tier.minQuantity;
      const max = tier.maxQuantity || Infinity;
      return args.quantity >= min && args.quantity <= max;
    });

    if (!applicableTier) {
      // Use last tier for quantities above max
      const lastTier = product.pricingTiers[product.pricingTiers.length - 1];
      if (!lastTier) return null;
      applicableTier = lastTier;
    }

    const unitPrice = applicableTier.price;
    const subtotal = unitPrice * args.quantity;

    // Calculate shipping estimate based on incoterm
    let shippingEstimate = 0;
    if (args.incoterm === "DDP" || args.incoterm === "DAP") {
      shippingEstimate = subtotal * 0.15; // 15% estimate
    } else if (args.incoterm === "CIF") {
      shippingEstimate = subtotal * 0.10; // 10% estimate
    }

    return {
      quantity: args.quantity,
      unitPrice,
      subtotal,
      shippingEstimate,
      total: subtotal + shippingEstimate,
      currency: applicableTier.currency,
      priceType: applicableTier.priceType,
      tier: {
        minQuantity: applicableTier.minQuantity,
        maxQuantity: applicableTier.maxQuantity,
      },
    };
  }
});

// Action to generate product comparison
export const compareProducts = action({
  args: {
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    if (args.productIds.length < 2 || args.productIds.length > 4) {
      throw new Error("Please select 2-4 products to compare");
    }

    const products = await Promise.all(
      args.productIds.map((id) =>
        ctx.runQuery(api.products.getProductDetail as any, { productId: id } as any)
      )
    ) as any[];

    // Build comparison matrix
    const comparison: any = {
      products: products.filter(Boolean).map((p: any) => ({
        id: p!.product._id,
        title: p!.product.title,
        supplier: p!.supplier.companyName,
        image: p!.product.images?.[0],
      })),
      pricing: products.filter(Boolean).map((p: any) => ({
        moq: p!.product.minOrderQuantity,
        moqUnit: p!.product.moqUnit,
        tiers: p!.product.pricingTiers,
      })),
      delivery: products.filter(Boolean).map((p: any) => ({
        sampleLeadTime: p!.product.leadTime.sample,
        bulkLeadTime: p!.product.leadTime.bulk,
        incoterms: p!.product.incoterms,
      })),
      supplier: products.filter(Boolean).map((p: any) => ({
        verificationStatus: p!.supplier.verificationStatus,
        responseRate: p!.supplier.responseRate,
        onTimeDelivery: p!.supplier.onTimeDeliveryRate,
        rating: p!.supplier.serviceRating,
      })),
      features: products.filter(Boolean).map((p: any) => ({
        samplesAvailable: p!.product.samplesAvailable,
        customization: p!.product.customizationOptions,
        certifications: p!.product.certifications?.map((c: any) => c.type),
      })),
    };

    return comparison;
  }
});

// api already imported at top

// Mutation to start an Assurance order directly from a PDP
export const startOrderFromProduct = mutation({
  args: {
    productId: v.id("products"),
    buyerId: v.id("users"),
    quantity: v.number(),
    incoterm: v.union(
      v.literal("EXW"),
      v.literal("FOB"),
      v.literal("CIF"),
      v.literal("DDP"),
      v.literal("DAP")
    ),
    deliveryDate: v.optional(v.string()),
    shippingMethod: v.optional(v.union(v.literal("air"), v.literal("sea"), v.literal("land"))),
    qcCriteria: v.optional(v.object({
      inspectionLevel: v.union(v.literal("basic"), v.literal("standard"), v.literal("strict")),
      acceptanceQualityLimit: v.number(),
      inspectionPoints: v.array(v.string()),
      requiredDocuments: v.array(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Determine applicable pricing tier
    const tier = product.pricingTiers.find(t => {
      const min = t.minQuantity;
      const max = t.maxQuantity ?? Infinity;
      return args.quantity >= min && args.quantity <= max;
    }) || product.pricingTiers[product.pricingTiers.length - 1];
    if (!tier) throw new Error("No pricing available for this product");

    const unitPrice = tier.price;
    const subtotal = unitPrice * args.quantity;
    const currency = tier.currency as any;

    // Basic shipping/tax placeholders (can be refined later)
    const shippingCost = 0;
    const taxAmount = 0;

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const estimatedDelivery = args.deliveryDate
      ? new Date(args.deliveryDate).getTime()
      : Date.now() + (product.leadTime?.bulk ?? 30) * 24 * 60 * 60 * 1000;

    const orderId = await ctx.db.insert("orders", {
      buyerId: args.buyerId,
      supplierId: product.supplierId,
      sourceType: "product",
      productId: args.productId,
      orderNumber,
      items: [
        {
          productId: args.productId,
          quantity: args.quantity,
          unitPrice,
          totalPrice: subtotal,
          specifications: product.specifications,
        },
      ],
      subtotal,
      shippingCost,
      taxAmount,
      totalAmount: subtotal + shippingCost + taxAmount,
      currency,
      tradeAssurance: {
        enabled: true,
        contractId: `TA-${orderNumber}`,
        protectedAmount: subtotal,
        qcCriteria: args.qcCriteria ?? {
          inspectionLevel: "standard",
          acceptanceQualityLimit: 2.5,
          inspectionPoints: [],
          requiredDocuments: [],
        },
        deliveryTerms: {
          incoterm: args.incoterm,
          deliveryDate: estimatedDelivery,
          lateDeliveryPenalty: 0.01,
          port: product.portOfLoading,
        },
        paymentMilestones: [
          {
            phase: "deposit",
            percentage: 30,
            amount: Number((subtotal * 0.3).toFixed(2)),
            dueDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
            status: "pending",
          },
          {
            phase: "pre_shipment",
            percentage: 70,
            amount: Number((subtotal * 0.7).toFixed(2)),
            dueDate: estimatedDelivery,
            status: "pending",
          },
        ],
      },
      status: "pending_payment",
      shipping: {
        method: (args.shippingMethod ?? "sea") as any,
      },
      createdAt: Date.now(),
    });

    return orderId;
  }
});
    
