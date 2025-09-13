import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getDispute = query({
  args: { disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.disputeId);
  },
});

export const listDisputesForOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("disputes")
      .withIndex("by_order", q => q.eq("orderId", args.orderId))
      .collect();
  },
});

export const openDispute = mutation({
  args: {
    orderId: v.id("orders"),
    initiatedBy: v.id("users"),
    type: v.union(
      v.literal("quality_issue"),
      v.literal("late_delivery"),
      v.literal("wrong_product"),
      v.literal("quantity_mismatch"),
      v.literal("damage_in_transit"),
      v.literal("documentation_issue"),
      v.literal("payment_issue"),
    ),
    description: v.string(),
    evidence: v.optional(
      v.array(
        v.object({
          type: v.union(v.literal("photo"), v.literal("video"), v.literal("document")),
          fileId: v.id("_storage"),
          description: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const disputeId = await ctx.db.insert("disputes", {
      orderId: args.orderId,
      initiatedBy: args.initiatedBy,
      type: args.type,
      description: args.description,
      evidence: args.evidence ?? [],
      status: "open",
      createdAt: Date.now(),
      targetResolutionDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    } as any);

    // Mark order as disputed
    await ctx.db.patch(args.orderId, { status: "disputed" as any });
    return disputeId;
  },
});

export const addDisputeEvidence = mutation({
  args: {
    disputeId: v.id("disputes"),
    evidence: v.object({
      type: v.union(v.literal("photo"), v.literal("video"), v.literal("document")),
      fileId: v.id("_storage"),
      description: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) throw new Error("Dispute not found");
    const newEvidence = [...(dispute.evidence ?? []), args.evidence] as any[];
    await ctx.db.patch(args.disputeId, { evidence: newEvidence });
  },
});

export const setDisputeStatus = mutation({
  args: {
    disputeId: v.id("disputes"),
    status: v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("mediation"),
      v.literal("resolved"),
      v.literal("escalated"),
      v.literal("closed")
    ),
    mediatorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.disputeId, {
      status: args.status,
      mediatorId: args.mediatorId,
      reviewStartedAt: args.status === "under_review" ? Date.now() : undefined,
    } as any);
  },
});

export const resolveDispute = mutation({
  args: {
    disputeId: v.id("disputes"),
    mediatorId: v.id("users"),
    resolution: v.object({
      type: v.union(
        v.literal("full_refund"),
        v.literal("partial_refund"),
        v.literal("replacement"),
        v.literal("discount"),
        v.literal("no_action")
      ),
      amount: v.optional(v.number()),
      notes: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) throw new Error("Dispute not found");

    await ctx.db.patch(args.disputeId, {
      status: "resolved",
      mediatorId: args.mediatorId,
      resolution: args.resolution as any,
      resolvedAt: Date.now(),
    });

    // Update order status based on resolution
    const orderId = dispute.orderId as Id<"orders">;
    if (args.resolution.type === "full_refund" || args.resolution.type === "partial_refund") {
      await ctx.db.patch(orderId, { status: "refunded" as any });
    } else if (args.resolution.type === "no_action" || args.resolution.type === "discount") {
      await ctx.db.patch(orderId, { status: "completed" as any });
    }
  },
});

