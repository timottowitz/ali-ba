import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    // If categories exist, assume already seeded
    const existingCat = await ctx.db.query("categories").first();
    if (existingCat) {
      return { message: "Already seeded" };
    }

    const now = Date.now();

    const catId = await ctx.db.insert("categories", {
      name: { en: "Plastics", es: "Plásticos" },
      description: { en: "Plastic goods", es: "Productos plásticos" },
      slug: "plastics",
      createdAt: now,
      updatedAt: now,
    } as any);

    const user = await ctx.db.insert("users", { name: "Demo Buyer", createdAt: now } as any);

    const supplierId = await ctx.db.insert("suppliers", {
      userId: user as any,
      companyName: "MexiPlast SA de CV",
      legalEntityName: "MexiPlast SA de CV",
      description: { en: "Injection molded plastics", es: "Plásticos moldeados por inyección" },
      location: "Monterrey",
      state: "NL",
      country: "MX",
      contactEmail: "sales@mexiplast.mx",
      contactPhone: "+52-81-5555-0101",
      website: "https://mexiplast.mx",
      languages: ["es", "en"],
      timeZone: "America/Mexico_City",
      yearEstablished: 2010,
      employeeCount: "100-200",
      businessType: "manufacturer" as any,
      mainProducts: ["Plastic housings", "Caps", "Containers"],
      topMarkets: ["US", "MX"],
      exportPercentage: 60,
      factoryLines: 6,
      productionCapacity: { monthly: 100000, unit: "pcs" },
      verificationStatus: "verified" as any,
      responseRate: 95,
      responseTime: 12,
      onTimeDeliveryRate: 98,
      productQualityScore: 4.6,
      serviceRating: 4.7,
      disputeRate: 0.5,
      totalTransactions: 125,
      badges: ["verified_manufacturer", "trade_assurance", "fast_response"],
      certifications: [],
      createdAt: now,
      updatedAt: now,
      tags: ["injection_molding"],
    } as any);

    await ctx.db.insert("products", {
      supplierId: supplierId as any,
      title: { en: "Plastic Enclosure", es: "Caja Plástica" },
      description: { en: "ABS enclosure for electronics", es: "Caja de ABS para electrónica" },
      categoryId: catId as any,
      pricingTiers: [
        { minQuantity: 50, maxQuantity: 199, price: 3.2, currency: "USD", priceType: "FOB" },
        { minQuantity: 200, maxQuantity: 999, price: 2.7, currency: "USD", priceType: "FOB" },
        { minQuantity: 1000, price: 2.2, currency: "USD", priceType: "FOB" },
      ],
      minOrderQuantity: 50,
      moqUnit: "pieces",
      inventoryCount: 10000,
      inventoryUnit: "pieces",
      leadTime: { sample: 7, bulk: 21 },
      productionCapacity: { daily: 5000, unit: "pieces" },
      images: [],
      specifications: { material: "ABS", origin: "MX" },
      samplesAvailable: true,
      samplePrice: 10,
      sampleLeadTime: 5,
      incoterms: ["EXW", "FOB", "CIF", "DAP"] as any,
      status: "active" as any,
      rating: 4.5,
      reviewCount: 12,
      createdAt: now,
      updatedAt: now,
      tags: ["electronics"],
      certifications: [],
    } as any);

    return { message: "Seeded demo data" };
  },
});

export const createScrewManufacturerDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Upsert Fasteners category
    let fasteners = await ctx.db
      .query("categories")
      .withIndex("by_slug", q => q.eq("slug", "fasteners"))
      .first();
    if (!fasteners) {
      const catId = await ctx.db.insert("categories", {
        name: { en: "Fasteners", es: "Sujetadores" },
        description: { en: "Screws, bolts, nuts and washers", es: "Tornillos, pernos, tuercas y arandelas" },
        slug: "fasteners",
        createdAt: now,
        updatedAt: now,
      } as any);
      fasteners = await ctx.db.get(catId);
    }

    // Create a demo user (lightweight)
    const userId = await ctx.db.insert("users", { name: "ScrewCo Admin", createdAt: now } as any);

    // Create supplier in Sonora, MX
    const supplierId = await ctx.db.insert("suppliers", {
      userId: userId as any,
      companyName: "ScrewCo Sonora S.A. de C.V.",
      legalEntityName: "ScrewCo Sonora S.A. de C.V.",
      description: { en: "Precision screw manufacturer in Sonora, Mexico.", es: "Fabricante de tornillos de precisión en Sonora, México." },
      location: "Hermosillo",
      state: "SON",
      country: "MX",
      contactEmail: "sales@screwco.mx",
      contactPhone: "+52-662-555-0123",
      website: "https://screwco.mx",
      languages: ["es", "en"],
      timeZone: "America/Hermosillo",
      yearEstablished: 2005,
      employeeCount: "80-120",
      businessType: "manufacturer" as any,
      mainProducts: ["Hex screws", "Self-tapping screws", "Machine screws"],
      topMarkets: ["US", "MX"],
      exportPercentage: 70,
      factoryLines: 4,
      productionCapacity: { monthly: 500000, unit: "pcs" },
      verificationStatus: "verified" as any,
      responseRate: 92,
      responseTime: 10,
      onTimeDeliveryRate: 97,
      productQualityScore: 4.5,
      serviceRating: 4.6,
      disputeRate: 0.4,
      totalTransactions: 210,
      badges: ["verified_manufacturer", "trade_assurance", "fast_response"],
      certifications: [],
      createdAt: now,
      updatedAt: now,
    } as any);

    const catId = fasteners!._id as any;

    // Three screw products
    const productsToInsert: any[] = [
      {
        title: { en: "Hex Head Screw M6 x 20mm", es: "Tornillo de Cabeza Hexagonal M6 x 20mm" },
        description: { en: "Carbon steel, zinc-plated. Ideal for general assembly.", es: "Acero al carbono, galvanizado. Ideal para ensamblaje general." },
        pricingTiers: [
          { minQuantity: 100, maxQuantity: 999, price: 0.08, currency: "USD", priceType: "FOB" },
          { minQuantity: 1000, maxQuantity: 9999, price: 0.06, currency: "USD", priceType: "FOB" },
          { minQuantity: 10000, price: 0.05, currency: "USD", priceType: "FOB" },
        ],
        specifications: { material: "Carbon steel", finish: "Zinc-plated", size: "M6 x 20mm", origin: "MX" },
        tags: ["fasteners", "screws", "hex"],
      },
      {
        title: { en: "Self-Tapping Screw #8 x 1\"", es: "Tornillo Autoperforante #8 x 1\"" },
        description: { en: "Stainless steel, pan head. For sheet metal applications.", es: "Acero inoxidable, cabeza pan. Para lámina metálica." },
        pricingTiers: [
          { minQuantity: 100, maxQuantity: 999, price: 0.09, currency: "USD", priceType: "FOB" },
          { minQuantity: 1000, maxQuantity: 9999, price: 0.07, currency: "USD", priceType: "FOB" },
          { minQuantity: 10000, price: 0.06, currency: "USD", priceType: "FOB" },
        ],
        specifications: { material: "Stainless steel", head: "Pan", size: "#8 x 1\"", origin: "MX" },
        tags: ["fasteners", "screws", "self-tapping"],
      },
      {
        title: { en: "Machine Screw M4 x 10mm", es: "Tornillo de Máquina M4 x 10mm" },
        description: { en: "Alloy steel, black oxide finish. Precision threads.", es: "Acero aleado, acabado óxido negro. Rosca de precisión." },
        pricingTiers: [
          { minQuantity: 100, maxQuantity: 999, price: 0.07, currency: "USD", priceType: "FOB" },
          { minQuantity: 1000, maxQuantity: 9999, price: 0.055, currency: "USD", priceType: "FOB" },
          { minQuantity: 10000, price: 0.045, currency: "USD", priceType: "FOB" },
        ],
        specifications: { material: "Alloy steel", finish: "Black oxide", size: "M4 x 10mm", origin: "MX" },
        tags: ["fasteners", "screws", "machine"],
      }
    ];

    const productIds: any[] = [];
    for (const p of productsToInsert) {
      const newId = await ctx.db.insert("products", {
        supplierId: supplierId as any,
        title: p.title,
        description: p.description,
        categoryId: catId,
        pricingTiers: p.pricingTiers,
        minOrderQuantity: 100,
        moqUnit: "pieces",
        inventoryCount: 50000,
        inventoryUnit: "pieces",
        leadTime: { sample: 5, bulk: 15 },
        productionCapacity: { daily: 20000, unit: "pieces" },
        images: [],
        specifications: p.specifications,
        samplesAvailable: true,
        samplePrice: 5,
        sampleLeadTime: 5,
        incoterms: ["EXW", "FOB", "CIF", "DAP"] as any,
        status: "active" as any,
        rating: 4.5,
        reviewCount: 0,
        createdAt: now,
        updatedAt: now,
        tags: p.tags,
        certifications: [],
      } as any);
      productIds.push(newId);
    }

    // Build search chunks for supplier and products
    await ctx.runMutation(api.search.upsertSupplierChunks, { supplierId: supplierId as any, language: 'en' as any });
    for (const pid of productIds) {
      await ctx.runMutation(api.search.upsertProductChunks, { productId: pid as any, language: 'en' as any });
    }

    return { supplierId, productIds };
  },
});
