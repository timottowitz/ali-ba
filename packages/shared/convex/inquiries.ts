import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { paginationOptsValidator } from "convex/server";

export const create = mutation({
  args: {
    productId: v.id("products"),
    message: v.string(),
    quantity: v.number(),
    targetPrice: v.optional(v.number()),
    urgency: v.string(),
    buyerContact: v.object({
      email: v.string(),
      phone: v.optional(v.string()),
      company: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    
    return await ctx.db.insert("inquiries", {
      buyerId: userId,
      productId: args.productId,
      supplierId: product.supplierId,
      message: args.message,
      quantity: args.quantity,
      targetPrice: args.targetPrice,
      urgency: args.urgency,
      status: "pending",
      buyerContact: args.buyerContact,
    });
  },
});

export const getByBuyer = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: null };
    
    const result = await ctx.db
      .query("inquiries")
      .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
    
    const inquiriesWithDetails = await Promise.all(
      result.page.map(async (inquiry) => {
        const product = await ctx.db.get(inquiry.productId);
        const supplier = await ctx.db.get(inquiry.supplierId);
        
        return {
          ...inquiry,
          product,
          supplier,
        };
      })
    );
    
    return {
      ...result,
      page: inquiriesWithDetails,
    };
  },
});

export const getBySupplier = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: null };
    
    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!supplier) return { page: [], isDone: true, continueCursor: null };
    
    const result = await ctx.db
      .query("inquiries")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplier._id))
      .order("desc")
      .paginate(args.paginationOpts);
    
    const inquiriesWithDetails = await Promise.all(
      result.page.map(async (inquiry) => {
        const product = await ctx.db.get(inquiry.productId);
        const buyer = await ctx.db.get(inquiry.buyerId);
        
        return {
          ...inquiry,
          product,
          buyer,
        };
      })
    );
    
    return {
      ...result,
      page: inquiriesWithDetails,
    };
  },
});
