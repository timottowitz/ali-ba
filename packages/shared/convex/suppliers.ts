import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: { 
    paginationOpts: paginationOptsValidator,
    country: v.optional(v.string()),
    verified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let result;
    
    if (args.country) {
      result = await ctx.db
        .query("suppliers")
        .withIndex("by_country", (q) => q.eq("country", args.country!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db
        .query("suppliers")
        .withIndex("by_rating")
        .order("desc")
        .paginate(args.paginationOpts);
    }
    
    const suppliersWithDetails = await Promise.all(
      result.page.map(async (supplier) => {
        const logoUrl = supplier.logo ? await ctx.storage.getUrl(supplier.logo) : null;
        const productCount = await ctx.db
          .query("products")
          .withIndex("by_supplier", (q) => q.eq("supplierId", supplier._id))
          .collect()
          .then(products => products.length);
        
        return {
          ...supplier,
          logoUrl,
          productCount,
        };
      })
    );
    
    return {
      ...result,
      page: suppliersWithDetails,
    };
  },
});

export const get = query({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.id);
    if (!supplier) return null;
    
    const logoUrl = supplier.logo ? await ctx.storage.getUrl(supplier.logo) : null;
    const productCount = await ctx.db
      .query("products")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.id))
      .collect()
      .then(products => products.length);
    
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.id))
      .collect();
    
    return {
      ...supplier,
      logoUrl,
      productCount,
      reviewCount: reviews.length,
      averageRating: reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0,
    };
  },
});

export const create = mutation({
  args: {
    companyName: v.string(),
    description: v.string(),
    country: v.string(),
    city: v.string(),
    website: v.optional(v.string()),
    yearEstablished: v.number(),
    employees: v.string(),
    mainProducts: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Check if user already has a supplier profile
    const existing = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (existing) {
      throw new Error("User already has a supplier profile");
    }
    
    return await ctx.db.insert("suppliers", {
      userId,
      companyName: args.companyName,
      description: args.description,
      country: args.country,
      city: args.city,
      website: args.website,
      verified: false,
      rating: 0,
      totalOrders: 0,
      yearEstablished: args.yearEstablished,
      employees: args.employees,
      mainProducts: args.mainProducts,
    });
  },
});

export const getCurrentUserSupplier = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    
    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!supplier) return null;
    
    const logoUrl = supplier.logo ? await ctx.storage.getUrl(supplier.logo) : null;
    
    return {
      ...supplier,
      logoUrl,
    };
  },
});
