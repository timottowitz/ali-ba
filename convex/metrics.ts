import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Update supplier response metrics from responseTracking table
export const updateSupplierResponseMetrics = mutation({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("responseTracking")
      .withIndex("by_supplier", q => q.eq("supplierId", args.supplierId))
      .collect();

    if (items.length === 0) return { responseRate: 0, responseTime: 0 };

    const received = items.length;
    const responded = items.filter(i => i.respondedAt).length;
    const avgResponseMinutes = Math.round(
      items.filter(i => i.responseTime != null).reduce((acc, i) => acc + (i.responseTime as number), 0) /
        Math.max(1, items.filter(i => i.responseTime != null).length)
    );

    const responseRate = Math.round((responded / received) * 100);
    const responseTimeHours = Math.round((avgResponseMinutes / 60) * 10) / 10;

    await ctx.db.patch(args.supplierId, {
      responseRate,
      responseTime: responseTimeHours,
    } as any);

    return { responseRate, responseTime: responseTimeHours };
  },
});

