import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query a single order by id
export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});

// Record payment for a specific payment milestone
export const recordMilestonePayment = mutation({
  args: {
    orderId: v.id("orders"),
    milestoneIndex: v.number(),
    amountPaid: v.number(),
    paidAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (!order.tradeAssurance?.paymentMilestones) {
      throw new Error("Order has no payment milestones");
    }
    const milestones = [...order.tradeAssurance.paymentMilestones];
    if (args.milestoneIndex < 0 || args.milestoneIndex >= milestones.length) {
      throw new Error("Invalid milestone index");
    }

    // Update milestone
    milestones[args.milestoneIndex] = {
      ...milestones[args.milestoneIndex],
      status: "paid",
      paidAt: args.paidAt ?? Date.now(),
      amount: args.amountPaid,
    } as any;

    // Determine new order status heuristically
    let newStatus = order.status as typeof order.status;
    const allPaid = milestones.every((m: any) => m.status === "paid");
    if (order.status === "pending_payment") {
      newStatus = "in_production";
    }
    if (allPaid && newStatus !== "paid" && newStatus !== "completed") {
      newStatus = "paid" as any;
    }

    await ctx.db.patch(args.orderId, {
      tradeAssurance: { ...order.tradeAssurance, paymentMilestones: milestones } as any,
      status: newStatus,
      paidAt: newStatus === "paid" ? Date.now() : order.paidAt,
    });

    return { status: newStatus, milestones };
  },
});

// Update order status with allowed transitions
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    nextStatus: v.union(
      v.literal("draft"),
      v.literal("pending_payment"),
      v.literal("paid"),
      v.literal("in_production"),
      v.literal("quality_check"),
      v.literal("ready_to_ship"),
      v.literal("shipped"),
      v.literal("in_transit"),
      v.literal("customs_clearance"),
      v.literal("delivered"),
      v.literal("disputed"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("refunded"),
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const allowed: Record<string, string[]> = {
      draft: ["pending_payment", "cancelled"],
      pending_payment: ["paid", "in_production", "cancelled", "disputed"],
      paid: ["in_production", "disputed"],
      in_production: ["quality_check", "cancelled", "disputed"],
      quality_check: ["ready_to_ship", "in_production", "disputed"],
      ready_to_ship: ["shipped", "disputed"],
      shipped: ["in_transit", "disputed"],
      in_transit: ["customs_clearance", "delivered", "disputed"],
      customs_clearance: ["delivered", "disputed"],
      delivered: ["completed", "disputed"],
      disputed: ["resolved", "refunded", "cancelled", "completed"],
      completed: [],
      cancelled: [],
      refunded: [],
    } as any;

    const current = order.status as keyof typeof allowed;
    const next = args.nextStatus as string;
    if (!(allowed[current] ?? []).includes(next)) {
      throw new Error(`Invalid status transition ${current} -> ${next}`);
    }

    const patch: any = { status: args.nextStatus };
    const now = Date.now();
    switch (args.nextStatus) {
      case "paid":
        patch.paidAt = now;
        break;
      case "shipped":
        patch.shippedAt = now;
        break;
      case "delivered":
        patch.deliveredAt = now;
        break;
      case "completed":
        patch.completedAt = now;
        break;
    }

    await ctx.db.patch(args.orderId, patch);
    return { status: args.nextStatus };
  },
});

