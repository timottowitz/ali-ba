import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { parentId: v.optional(v.id("categories")) },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => 
        args.parentId ? q.eq("parentId", args.parentId) : q.eq("parentId", undefined)
      )
      .collect();
    
    const categoriesWithImages = await Promise.all(
      categories.map(async (category) => {
        const imageUrl = category.image ? await ctx.storage.getUrl(category.image) : null;
        const productCount = await ctx.db
          .query("products")
          .withIndex("by_category", (q) => q.eq("categoryId", category._id))
          .collect()
          .then(products => products.length);
        
        return {
          ...category,
          imageUrl,
          productCount,
        };
      })
    );
    
    return categoriesWithImages;
  },
});

export const get = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) return null;
    
    const imageUrl = category.image ? await ctx.storage.getUrl(category.image) : null;
    const parent = category.parentId ? await ctx.db.get(category.parentId) : null;
    
    return {
      ...category,
      imageUrl,
      parent,
    };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    if (!category) return null;
    
    const imageUrl = category.image ? await ctx.storage.getUrl(category.image) : null;
    const parent = category.parentId ? await ctx.db.get(category.parentId) : null;
    
    return {
      ...category,
      imageUrl,
      parent,
    };
  },
});
