import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listProductQuestions = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("productQuestions")
      .withIndex("by_product", q => q.eq("productId", args.productId))
      .filter(q => q.eq(q.field("visibility"), "public"))
      .order("desc")
      .take(50);
  },
});

export const askProductQuestion = mutation({
  args: { productId: v.id("products"), askerId: v.id("users"), question: v.string() },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("productQuestions", {
      productId: args.productId,
      askerId: args.askerId,
      question: args.question,
      createdAt: Date.now(),
      visibility: "public" as any,
    });
    return id;
  },
});

export const answerProductQuestion = mutation({
  args: { questionId: v.id("productQuestions"), answeredBy: v.id("users"), answer: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.questionId, { answer: args.answer, answeredBy: args.answeredBy, answeredAt: Date.now() } as any);
  },
});
