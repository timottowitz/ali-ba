import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  suppliers: defineTable({
    userId: v.id("users"),
    companyName: v.string(),
    description: v.string(),
    country: v.string(),
    city: v.string(),
    website: v.optional(v.string()),
    logo: v.optional(v.id("_storage")),
    verified: v.boolean(),
    rating: v.number(),
    totalOrders: v.number(),
    yearEstablished: v.number(),
    employees: v.string(),
    mainProducts: v.array(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_country", ["country"])
    .index("by_rating", ["rating"]),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("categories")),
    description: v.string(),
    image: v.optional(v.id("_storage")),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentId"]),

  products: defineTable({
    supplierId: v.id("suppliers"),
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.string(),
    images: v.array(v.id("_storage")),
    minOrderQuantity: v.number(),
    price: v.object({
      min: v.number(),
      max: v.number(),
      currency: v.string(),
    }),
    specifications: v.array(v.object({
      name: v.string(),
      value: v.string(),
    })),
    keywords: v.array(v.string()),
    inStock: v.boolean(),
    leadTime: v.string(),
    paymentTerms: v.array(v.string()),
    shippingMethods: v.array(v.string()),
    certifications: v.array(v.string()),
    featured: v.boolean(),
  })
    .index("by_supplier", ["supplierId"])
    .index("by_category", ["categoryId"])
    .index("by_featured", ["featured"])
    .searchIndex("search_products", {
      searchField: "name",
      filterFields: ["categoryId", "supplierId", "inStock"],
    }),

  inquiries: defineTable({
    buyerId: v.id("users"),
    productId: v.id("products"),
    supplierId: v.id("suppliers"),
    message: v.string(),
    quantity: v.number(),
    targetPrice: v.optional(v.number()),
    urgency: v.string(),
    status: v.string(),
    buyerContact: v.object({
      email: v.string(),
      phone: v.optional(v.string()),
      company: v.optional(v.string()),
    }),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_supplier", ["supplierId"])
    .index("by_product", ["productId"])
    .index("by_status", ["status"]),

  reviews: defineTable({
    buyerId: v.id("users"),
    supplierId: v.id("suppliers"),
    productId: v.optional(v.id("products")),
    rating: v.number(),
    comment: v.string(),
    orderValue: v.optional(v.number()),
    verified: v.boolean(),
  })
    .index("by_supplier", ["supplierId"])
    .index("by_product", ["productId"])
    .index("by_buyer", ["buyerId"]),

  favorites: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
  })
    .index("by_user", ["userId"])
    .index("by_product", ["productId"])
    .index("by_user_product", ["userId", "productId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
