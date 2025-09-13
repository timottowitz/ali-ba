import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const toggle = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_product", (q) => 
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .first();
    
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    } else {
      await ctx.db.insert("favorites", {
        userId,
        productId: args.productId,
      });
      return true;
    }
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const favoritesWithProducts = await Promise.all(
      favorites.map(async (favorite) => {
        const product = await ctx.db.get(favorite.productId);
        if (!product) return null;
        
        const supplier = await ctx.db.get(product.supplierId);
        const imageUrls = await Promise.all(
          product.images.map(async (imageId) => await ctx.storage.getUrl(imageId))
        );
        
        return {
          ...favorite,
          product: {
            ...product,
            supplier,
            imageUrls: imageUrls.filter(Boolean),
          },
        };
      })
    );
    
    return favoritesWithProducts.filter(Boolean);
  },
});

export const isFavorite = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return false;
    
    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_product", (q) => 
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .first();
    
    return !!favorite;
  },
});
