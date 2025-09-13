import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Compute a placeholder logistics quote and persist it
export const computeLogisticsQuote = mutation({
  args: {
    orderId: v.optional(v.id("orders")),
    rfqId: v.optional(v.id("rfqs")),
    origin: v.object({ city: v.string(), state: v.string(), country: v.string(), postalCode: v.string() }),
    destination: v.object({ city: v.string(), state: v.string(), country: v.string(), postalCode: v.string() }),
    cargoType: v.union(v.literal("parcel"), v.literal("ltl"), v.literal("ftl"), v.literal("fcl")),
    weight: v.number(),
    weightUnit: v.union(v.literal("kg"), v.literal("lb")),
    dimensions: v.optional(v.object({ length: v.number(), width: v.number(), height: v.number(), unit: v.string() })),
    hsCode: v.string(),
    declaredValue: v.number(),
    currency: v.union(v.literal("USD"), v.literal("MXN")),
  },
  handler: async (ctx, args) => {
    // Heuristic carrier pricing
    const base = Math.max(20, args.weight * (args.weightUnit === "kg" ? 1.0 : 0.45));
    const carrierOptions = [
      { name: "FastShip", service: "Express", transitTime: 5, multiplier: 2.0 },
      { name: "OceanMX", service: "Economy", transitTime: 21, multiplier: 0.6 },
      { name: "RoadLink", service: "Standard", transitTime: 10, multiplier: 1.0 },
    ];

    const carriers = carrierOptions.map((c) => ({
      name: c.name,
      service: c.service,
      transitTime: c.transitTime,
      price: Math.round(base * c.multiplier * 100) / 100,
      currency: args.currency,
    }));

    // Duties/Taxes rough estimate (placeholder): 5% duty + 16% tax on declared value
    const duties = Math.round(args.declaredValue * 0.05 * 100) / 100;
    const taxes = Math.round(args.declaredValue * 0.16 * 100) / 100;
    const shippingCost = carriers[1].price; // choose economy as baseline for landed total

    const landedCost = {
      productCost: args.declaredValue,
      shippingCost,
      duties,
      taxes,
      brokerageFees: 50,
      total: Math.round((args.declaredValue + shippingCost + duties + taxes + 50) * 100) / 100,
    };

    const id = await ctx.db.insert("logisticsQuotes", {
      orderId: args.orderId,
      rfqId: args.rfqId,
      origin: args.origin as any,
      destination: args.destination as any,
      cargoType: args.cargoType as any,
      weight: args.weight,
      weightUnit: args.weightUnit as any,
      dimensions: args.dimensions as any,
      carriers: carriers as any,
      hsCode: args.hsCode,
      declaredValue: args.declaredValue,
      estimatedDuties: duties,
      estimatedTaxes: taxes,
      landedCost: landedCost as any,
      createdAt: Date.now(),
      validUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return id;
  },
});

export const getLogisticsQuotesForOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("logisticsQuotes")
      .withIndex("by_order", q => q.eq("orderId", args.orderId))
      .collect();
  },
});

export const getLogisticsQuotesForRfq = query({
  args: { rfqId: v.id("rfqs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("logisticsQuotes")
      .withIndex("by_rfq", q => q.eq("rfqId", args.rfqId))
      .collect();
  },
});

