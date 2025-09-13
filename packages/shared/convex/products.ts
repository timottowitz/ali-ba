import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: { 
    paginationOpts: paginationOptsValidator,
    categoryId: v.optional(v.id("categories")),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let result;
    
    if (args.categoryId) {
      result = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.featured) {
      result = await ctx.db
        .query("products")
        .withIndex("by_featured", (q) => q.eq("featured", true))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db
        .query("products")
        .order("desc")
        .paginate(args.paginationOpts);
    }
    
    const productsWithDetails = await Promise.all(
      result.page.map(async (product) => {
        const supplier = await ctx.db.get(product.supplierId);
        const category = await ctx.db.get(product.categoryId);
        const imageUrls = await Promise.all(
          product.images.map(async (imageId) => await ctx.storage.getUrl(imageId))
        );
        
        return {
          ...product,
          supplier,
          category,
          imageUrls: imageUrls.filter(Boolean),
        };
      })
    );
    
    return {
      ...result,
      page: productsWithDetails,
    };
  },
});

export const search = query({
  args: {
    query: v.string(),
    paginationOpts: paginationOptsValidator,
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    let searchQuery = ctx.db
      .query("products")
      .withSearchIndex("search_products", (q) => {
        let query = q.search("name", args.query);
        if (args.categoryId) {
          query = query.eq("categoryId", args.categoryId);
        }
        return query;
      });
    
    const result = await searchQuery.paginate(args.paginationOpts);
    
    const productsWithDetails = await Promise.all(
      result.page.map(async (product) => {
        const supplier = await ctx.db.get(product.supplierId);
        const category = await ctx.db.get(product.categoryId);
        const imageUrls = await Promise.all(
          product.images.map(async (imageId) => await ctx.storage.getUrl(imageId))
        );
        
        return {
          ...product,
          supplier,
          category,
          imageUrls: imageUrls.filter(Boolean),
        };
      })
    );
    
    return {
      ...result,
      page: productsWithDetails,
    };
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;
    
    const supplier = await ctx.db.get(product.supplierId);
    const category = await ctx.db.get(product.categoryId);
    const imageUrls = await Promise.all(
      product.images.map(async (imageId) => await ctx.storage.getUrl(imageId))
    );
    
    return {
      ...product,
      supplier,
      category,
      imageUrls: imageUrls.filter(Boolean),
    };
  },
});

export const getBySupplier = query({
  args: { 
    supplierId: v.id("suppliers"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("products")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .order("desc")
      .paginate(args.paginationOpts);
    
    const productsWithDetails = await Promise.all(
      result.page.map(async (product) => {
        const category = await ctx.db.get(product.categoryId);
        const imageUrls = await Promise.all(
          product.images.map(async (imageId) => await ctx.storage.getUrl(imageId))
        );
        
        return {
          ...product,
          category,
          imageUrls: imageUrls.filter(Boolean),
        };
      })
    );
    
    return {
      ...result,
      page: productsWithDetails,
    };
  },
});
