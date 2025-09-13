import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const enhancedApplicationTables = {
  // Enhanced Categories with multilingual support and Mexico-specific taxonomy
  categories: defineTable({
    name: v.object({
      en: v.string(),
      es: v.string(), // Spanish required for Mexico focus
    }),
    description: v.object({
      en: v.string(),
      es: v.string(),
    }),
    parentId: v.optional(v.id("categories")),
    slug: v.string(),
    image: v.optional(v.id("_storage")),
    hsCode: v.optional(v.string()), // HS code for customs
    nomCode: v.optional(v.string()), // Mexican NOM standards
  })
    .index("by_parent", ["parentId"])
    .index("by_slug", ["slug"])
    .index("by_hs_code", ["hsCode"]),

  // Enhanced Suppliers with trust signals and performance metrics
  suppliers: defineTable({
    userId: v.id("users"),
    // Basic company info
    companyName: v.string(),
    legalEntityName: v.string(), // Legal entity for compliance
    description: v.object({
      en: v.string(),
      es: v.string(),
    }),
    location: v.string(),
    state: v.string(), // Mexican state for filtering
    country: v.union(v.literal("MX"), v.literal("US")),
    contactEmail: v.string(),
    contactPhone: v.string(),
    website: v.optional(v.string()),
    languages: v.array(v.union(v.literal("en"), v.literal("es"))),
    timeZone: v.string(),
    
    // Business details
    yearEstablished: v.number(),
    employeeCount: v.string(),
    annualRevenue: v.optional(v.string()),
    businessType: v.union(
      v.literal("manufacturer"),
      v.literal("trading_company"),
      v.literal("wholesaler"),
      v.literal("distributor"),
      v.literal("service_provider")
    ),
    mainProducts: v.array(v.string()),
    topMarkets: v.array(v.string()),
    exportPercentage: v.optional(v.number()),
    
    // Factory & capacity
    factoryLines: v.optional(v.number()),
    productionCapacity: v.optional(v.object({
      monthly: v.number(),
      unit: v.string(),
    })),
    factoryArea: v.optional(v.number()), // in sq meters
    
    // Trust & verification
    logo: v.optional(v.id("_storage")),
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("pending"),
      v.literal("verified"),
      v.literal("gold_verified"), // Premium verification level
      v.literal("rejected")
    ),
    verificationDate: v.optional(v.number()),
    verificationExpiry: v.optional(v.number()),
    auditReports: v.optional(v.array(v.id("documents"))),
    
    // Performance metrics (displayed on PDP and profile)
    responseRate: v.number(), // Percentage
    responseTime: v.number(), // Average in hours
    onTimeDeliveryRate: v.number(), // Percentage
    productQualityScore: v.number(), // 1-5 rating
    serviceRating: v.number(), // 1-5 rating
    disputeRate: v.number(), // Percentage
    totalTransactions: v.number(),
    repeatBuyerRate: v.optional(v.number()),
    
    // Badges and tags
    badges: v.array(v.union(
      v.literal("verified_manufacturer"),
      v.literal("trade_assurance"),
      v.literal("fast_response"), // <24h response
      v.literal("immediate_response"), // <1h response
      v.literal("gold_supplier"),
      v.literal("usmca_certified"),
      v.literal("iso_certified")
    )),
    
    // Capabilities
    capabilities: v.array(v.union(
      v.literal("oem"),
      v.literal("odm"),
      v.literal("custom_packaging"),
      v.literal("private_label"),
      v.literal("minor_customization"),
      v.literal("samples_available")
    )),
    
    // Certifications (structured)
    certifications: v.array(v.object({
      type: v.string(), // ISO9001, USMCA, NOM, etc.
      documentId: v.id("documents"),
      issuedDate: v.number(),
      expiryDate: v.optional(v.number()),
      verifiedBy: v.optional(v.string()), // SGS, Intertek, TÜV
    })),
    
    // VR/3D showroom
    vrShowroomUrl: v.optional(v.string()),
    factoryPhotos: v.optional(v.array(v.id("_storage"))),
    
    // AI features
    trustScore: v.optional(v.number()), // AI-calculated trust score
    searchEmbedding: v.optional(v.array(v.float64())), // For semantic search
  })
    .index("by_user", ["userId"])
    .index("by_verification_status", ["verificationStatus"])
    .index("by_country", ["country"])
    .index("by_state", ["state"])
    .index("by_response_rate", ["responseRate"])
    .index("by_trust_score", ["trustScore"])
    .index("by_service_rating", ["serviceRating"]) 
    .searchIndex("search_suppliers", {
      searchField: "companyName",
      filterFields: ["country", "state", "verificationStatus"],
    })
    .searchIndex("search_suppliers_desc", {
      searchField: "description.en",
      filterFields: ["country", "state", "verificationStatus"],
    })
    .searchIndex("search_suppliers_desc_es", {
      searchField: "description.es",
      filterFields: ["country", "state", "verificationStatus"],
    }),

  // Enhanced Products with tiered pricing and production details
  products: defineTable({
    supplierId: v.id("suppliers"),
    
    // Basic info (bilingual)
    title: v.object({
      en: v.string(),
      es: v.string(),
    }),
    description: v.object({
      en: v.string(),
      es: v.string(),
    }),
    categoryId: v.id("categories"),
    
    // Pricing & MOQ
    pricingTiers: v.array(v.object({
      minQuantity: v.number(),
      maxQuantity: v.optional(v.number()),
      price: v.number(),
      currency: v.union(v.literal("USD"), v.literal("MXN")),
      priceType: v.union(v.literal("FOB"), v.literal("EXW"), v.literal("DDP")),
    })),
    minOrderQuantity: v.number(),
    moqUnit: v.string(), // pieces, kg, etc.
    
    // Inventory & production
    inventoryCount: v.number(),
    inventoryUnit: v.string(),
    leadTime: v.object({
      sample: v.number(), // days
      bulk: v.number(), // days
    }),
    productionCapacity: v.object({
      daily: v.number(),
      unit: v.string(),
    }),
    
    // Images & media
    images: v.array(v.id("_storage")),
    videos: v.optional(v.array(v.id("_storage"))),
    
    // Detailed specifications
    specifications: v.object({
      material: v.optional(v.string()),
      color: v.optional(v.array(v.string())),
      size: v.optional(v.string()),
      weight: v.optional(v.string()),
      brand: v.optional(v.string()),
      model: v.optional(v.string()),
      origin: v.string(), // Country of origin
      hsCode: v.optional(v.string()),
      dimensions: v.optional(v.object({
        length: v.number(),
        width: v.number(),
        height: v.number(),
        unit: v.string(),
      })),
      packaging: v.optional(v.object({
        type: v.string(),
        unitsPerCarton: v.number(),
        cartonDimensions: v.string(),
        grossWeight: v.string(),
      })),
    }),
    
    // Customization options
    customizationOptions: v.object({
      oem: v.boolean(),
      odm: v.boolean(),
      customLogo: v.boolean(),
      customPackaging: v.boolean(),
      customColors: v.boolean(),
      minCustomizationQty: v.optional(v.number()),
    }),
    
    // Shipping & logistics
    incoterms: v.array(v.union(
      v.literal("EXW"),
      v.literal("FOB"),
      v.literal("CIF"),
      v.literal("DDP"),
      v.literal("DAP")
    )),
    portOfLoading: v.optional(v.string()),
    
    // Compliance & certifications
    certifications: v.array(v.object({
      type: v.string(), // UL, FCC, NOM, RoHS, REACH, FDA
      documentId: v.id("documents"),
      verifiedDate: v.number(),
    })),
    testReports: v.optional(v.array(v.id("documents"))),
    
    // Samples
    samplesAvailable: v.boolean(),
    samplePrice: v.optional(v.number()),
    sampleLeadTime: v.optional(v.number()), // days
    samplePolicy: v.optional(v.string()), // Credit rules, etc.
    
    // Status & ratings
    status: v.union(
      v.literal("active"),
      v.literal("out_of_stock"),
      v.literal("discontinued"),
      v.literal("removed")
    ),
    rating: v.number(),
    reviewCount: v.number(),
    
    // Warranty & returns
    warranty: v.optional(v.object({
      duration: v.number(),
      unit: v.union(v.literal("days"), v.literal("months"), v.literal("years")),
      terms: v.string(),
    })),
    returnPolicy: v.optional(v.string()),
    
    // AI features
    searchEmbedding: v.optional(v.array(v.float64())),
    tags: v.array(v.string()),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),

    // Denormalized for search/sort and supplier filter performance
    minUnitPrice: v.optional(v.number()),
    supplierVerificationStatus: v.optional(v.union(
      v.literal("unverified"), v.literal("pending"), v.literal("verified"), v.literal("gold_verified"), v.literal("rejected")
    )),
    supplierBadges: v.optional(v.array(v.union(
      v.literal("verified_manufacturer"), v.literal("trade_assurance"), v.literal("fast_response"), v.literal("immediate_response"), v.literal("gold_supplier"), v.literal("usmca_certified"), v.literal("iso_certified")
    ))),
    supplierResponseRate: v.optional(v.number()),
    supplierOnTimeDeliveryRate: v.optional(v.number()),
    supplierServiceRating: v.optional(v.number()),
  })
    .index("by_supplier", ["supplierId"])
    .index("by_category", ["categoryId"])
    .index("by_status", ["status"])
    .index("by_rating", ["rating"])
    .index("by_hs_code", ["specifications.hsCode"])
    .index("by_created", ["createdAt"])
    .index("by_min_price", ["minUnitPrice"])
    .searchIndex("search_title", {
      searchField: "title.en",
      filterFields: ["supplierId", "categoryId", "status", "specifications.hsCode"],
    })
    .searchIndex("search_description_en", {
      searchField: "description.en",
      filterFields: ["supplierId", "categoryId", "status", "specifications.hsCode"],
    })
    .searchIndex("search_description_es", {
      searchField: "description.es",
      filterFields: ["supplierId", "categoryId", "status", "specifications.hsCode"],
    })
    .searchIndex("search_title_es", {
      searchField: "title.es",
      filterFields: ["supplierId", "categoryId", "status", "specifications.hsCode"],
    }),

  // RFQ (Request for Quotation) system
  rfqs: defineTable({
    buyerId: v.id("users"),
    
    // RFQ details
    title: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    
    // Requirements (structured)
    specifications: v.object({
      materials: v.optional(v.array(v.string())),
      tolerances: v.optional(v.string()),
      colors: v.optional(v.array(v.string())),
      certifications: v.array(v.string()),
      customRequirements: v.optional(v.string()),
    }),
    
    // Quantity & pricing
    quantity: v.number(),
    unit: v.string(),
    targetPrice: v.optional(v.number()),
    currency: v.union(v.literal("USD"), v.literal("MXN")),
    
    // Delivery
    incoterm: v.union(
      v.literal("EXW"),
      v.literal("FOB"),
      v.literal("CIF"),
      v.literal("DDP"),
      v.literal("DAP")
    ),
    deliveryDate: v.string(),
    deliveryLocation: v.string(),
    
    // Attachments
    attachments: v.array(v.object({
      fileId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
    })),
    
    // Status & visibility
    status: v.union(
      v.literal("draft"),
      v.literal("open"),
      v.literal("closed"),
      v.literal("awarded"),
      v.literal("cancelled")
    ),
    visibility: v.union(
      v.literal("public"), // All suppliers can see
      v.literal("invited"), // Only invited suppliers
    ),
    invitedSuppliers: v.optional(v.array(v.id("suppliers"))),
    
    // Metadata
    quotesReceived: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
    
    // AI features
    completenessScore: v.optional(v.number()), // AI-checked spec completeness
    matchedSuppliers: v.optional(v.array(v.id("suppliers"))), // AI-matched
  })
    .index("by_buyer", ["buyerId"])
    .index("by_status", ["status"])
    .index("by_category", ["categoryId"])
    .index("by_expires", ["expiresAt"]),

  // Supplier quotes for RFQs
  quotes: defineTable({
    rfqId: v.id("rfqs"),
    supplierId: v.id("suppliers"),
    
    // Pricing (tiered)
    pricingTiers: v.array(v.object({
      minQuantity: v.number(),
      maxQuantity: v.optional(v.number()),
      unitPrice: v.number(),
      totalPrice: v.number(),
    })),
    currency: v.union(v.literal("USD"), v.literal("MXN")),
    
    // Terms
    leadTime: v.number(), // days
    validityPeriod: v.number(), // days
    paymentTerms: v.string(),
    incoterm: v.union(
      v.literal("EXW"),
      v.literal("FOB"),
      v.literal("CIF"),
      v.literal("DDP"),
      v.literal("DAP")
    ),
    
    // Additional info
    notes: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("_storage"))),
    sampleAvailable: v.boolean(),
    sampleCost: v.optional(v.number()),
    
    // Customization offered
    customizationOffered: v.optional(v.object({
      types: v.array(v.string()),
      additionalCost: v.number(),
      additionalLeadTime: v.number(),
    })),
    
    // Status
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("expired"),
      v.literal("withdrawn")
    ),
    
    // Metadata
    submittedAt: v.number(),
    responseTime: v.optional(v.number()), // hours from RFQ creation
  })
    .index("by_rfq", ["rfqId"])
    .index("by_supplier", ["supplierId"])
    .index("by_status", ["status"]),

  // Sample requests
  sampleRequests: defineTable({
    productId: v.id("products"),
    buyerId: v.id("users"),
    supplierId: v.id("suppliers"),
    
    // Request details
    quantity: v.number(),
    shippingAddress: v.object({
      name: v.string(),
      company: v.optional(v.string()),
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
      phone: v.string(),
    }),
    
    // Pricing
    sampleCost: v.number(),
    shippingCost: v.number(),
    totalCost: v.number(),
    currency: v.union(v.literal("USD"), v.literal("MXN")),
    creditApplicable: v.boolean(), // Credit towards bulk order
    
    // Status
    status: v.union(
      v.literal("requested"),
      v.literal("approved"),
      v.literal("paid"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("rejected"),
      v.literal("cancelled")
    ),
    
    // Tracking
    trackingNumber: v.optional(v.string()),
    carrier: v.optional(v.string()),
    estimatedDelivery: v.optional(v.number()),
    
    // Metadata
    requestedAt: v.number(),
    approvedAt: v.optional(v.number()),
    shippedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    
    // Follow-up
    bulkOrderPlaced: v.optional(v.boolean()),
    bulkOrderId: v.optional(v.id("orders")),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_supplier", ["supplierId"])
    .index("by_product", ["productId"])
    .index("by_status", ["status"]),

  // Enhanced Orders with Trade Assurance
  orders: defineTable({
    buyerId: v.id("users"),
    supplierId: v.id("suppliers"),
    
    // Order source
    sourceType: v.union(
      v.literal("product"), // Direct from PDP
      v.literal("rfq"), // From RFQ/Quote
      v.literal("sample_followup") // After sample
    ),
    productId: v.optional(v.id("products")),
    quoteId: v.optional(v.id("quotes")),
    sampleRequestId: v.optional(v.id("sampleRequests")),
    
    // Order details
    orderNumber: v.string(),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
      unitPrice: v.number(),
      totalPrice: v.number(),
      specifications: v.optional(v.any()),
    })),
    
    // Pricing
    subtotal: v.number(),
    shippingCost: v.number(),
    taxAmount: v.number(),
    totalAmount: v.number(),
    currency: v.union(v.literal("USD"), v.literal("MXN")),
    
    // Trade Assurance contract
    tradeAssurance: v.object({
      enabled: v.boolean(),
      contractId: v.string(),
      protectedAmount: v.number(),
      
      // Quality criteria
      qcCriteria: v.object({
        inspectionLevel: v.union(v.literal("basic"), v.literal("standard"), v.literal("strict")),
        acceptanceQualityLimit: v.number(), // AQL percentage
        inspectionPoints: v.array(v.string()),
        requiredDocuments: v.array(v.string()),
      }),
      
      // Delivery terms
      deliveryTerms: v.object({
        incoterm: v.string(),
        deliveryDate: v.number(),
        lateDeliveryPenalty: v.optional(v.number()), // percentage per day
        port: v.optional(v.string()),
      }),
      
      // Payment milestones
      paymentMilestones: v.array(v.object({
        phase: v.union(
          v.literal("deposit"),
          v.literal("pre_production"),
          v.literal("production"),
          v.literal("pre_shipment"),
          v.literal("post_delivery")
        ),
        percentage: v.number(),
        amount: v.number(),
        dueDate: v.number(),
        status: v.union(v.literal("pending"), v.literal("paid"), v.literal("released")),
        paidAt: v.optional(v.number()),
      })),
    }),
    
    // Order status
    status: v.union(
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
      v.literal("refunded")
    ),
    
    // Shipping details
    shipping: v.object({
      method: v.union(v.literal("air"), v.literal("sea"), v.literal("land")),
      carrier: v.optional(v.string()),
      trackingNumber: v.optional(v.string()),
      estimatedDelivery: v.optional(v.number()),
      actualDelivery: v.optional(v.number()),
      
      // Documents
      billOfLading: v.optional(v.id("documents")),
      commercialInvoice: v.optional(v.id("documents")),
      packingList: v.optional(v.id("documents")),
      certificateOfOrigin: v.optional(v.id("documents")),
      customsDocuments: v.optional(v.array(v.id("documents"))),
    }),
    
    // Timestamps
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
    productionStartedAt: v.optional(v.number()),
    shippedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_supplier", ["supplierId"])
    .index("by_status", ["status"])
    .index("by_order_number", ["orderNumber"]),

  // Disputes & mediation
  disputes: defineTable({
    orderId: v.id("orders"),
    initiatedBy: v.id("users"),
    
    // Dispute details
    type: v.union(
      v.literal("quality_issue"),
      v.literal("late_delivery"),
      v.literal("wrong_product"),
      v.literal("quantity_mismatch"),
      v.literal("damage_in_transit"),
      v.literal("documentation_issue"),
      v.literal("payment_issue")
    ),
    description: v.string(),
    evidence: v.array(v.object({
      type: v.union(v.literal("photo"), v.literal("video"), v.literal("document")),
      fileId: v.id("_storage"),
      description: v.string(),
    })),
    
    // Resolution
    status: v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("mediation"),
      v.literal("resolved"),
      v.literal("escalated"),
      v.literal("closed")
    ),
    mediatorId: v.optional(v.id("users")),
    resolution: v.optional(v.object({
      type: v.union(
        v.literal("full_refund"),
        v.literal("partial_refund"),
        v.literal("replacement"),
        v.literal("discount"),
        v.literal("no_action")
      ),
      amount: v.optional(v.number()),
      notes: v.string(),
    })),
    
    // Timeline
    createdAt: v.number(),
    reviewStartedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    targetResolutionDate: v.number(), // SLA: 7 days
  })
    .index("by_order", ["orderId"])
    .index("by_status", ["status"])
    .index("by_initiated_by", ["initiatedBy"]),

  // Supplier performance history
  supplierPerformanceHistory: defineTable({
    supplierId: v.id("suppliers"),
    period: v.string(), // YYYY-MM
    
    // Metrics
    responseRate: v.number(),
    avgResponseTime: v.number(), // hours
    onTimeDeliveryRate: v.number(),
    qualityScore: v.number(),
    disputeRate: v.number(),
    
    // Volume
    totalOrders: v.number(),
    totalRevenue: v.number(),
    uniqueBuyers: v.number(),
    repeatBuyerRate: v.number(),
    
    // Calculated at end of period
    calculatedAt: v.number(),
  })
    .index("by_supplier", ["supplierId"])
    .index("by_period", ["period"]),

  // Logistics quotes
  logisticsQuotes: defineTable({
    orderId: v.optional(v.id("orders")),
    rfqId: v.optional(v.id("rfqs")),
    
    // Shipment details
    origin: v.object({
      city: v.string(),
      state: v.string(),
      country: v.string(),
      postalCode: v.string(),
    }),
    destination: v.object({
      city: v.string(),
      state: v.string(),
      country: v.string(),
      postalCode: v.string(),
    }),
    
    // Cargo details
    cargoType: v.union(v.literal("parcel"), v.literal("ltl"), v.literal("ftl"), v.literal("fcl")),
    weight: v.number(),
    weightUnit: v.union(v.literal("kg"), v.literal("lb")),
    dimensions: v.optional(v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
      unit: v.string(),
    })),
    
    // Quote details
    carriers: v.array(v.object({
      name: v.string(),
      service: v.string(),
      transitTime: v.number(), // days
      price: v.number(),
      currency: v.string(),
    })),
    
    // Customs & duties
    hsCode: v.string(),
    declaredValue: v.number(),
    estimatedDuties: v.number(),
    estimatedTaxes: v.number(),
    
    // Total landed cost
    landedCost: v.object({
      productCost: v.number(),
      shippingCost: v.number(),
      duties: v.number(),
      taxes: v.number(),
      brokerageFees: v.number(),
      total: v.number(),
    }),
    
    // Metadata
    createdAt: v.number(),
    validUntil: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_rfq", ["rfqId"]),

  // AI embeddings for semantic search
  searchEmbeddings: defineTable({
    entityType: v.union(v.literal("product"), v.literal("supplier"), v.literal("category")),
    entityId: v.string(),
    embedding: v.array(v.float64()),
    language: v.union(v.literal("en"), v.literal("es")),
    updatedAt: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"]),

  // Chunked passages for retrieval (per product/supplier)
  searchChunks: defineTable({
    entityType: v.union(v.literal("product"), v.literal("supplier")),
    parentId: v.string(),
    content: v.string(),
    language: v.union(v.literal("en"), v.literal("es")),
    embedding: v.array(v.float64()),
    order: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["entityType", "parentId"])
    .index("by_updated", ["updatedAt"]),

  // Search configuration (singleton table used for tuning fusion and defaults)
  searchSettings: defineTable({
    interleaveKeyword: v.number(), // e.g., 2
    interleaveSemantic: v.number(), // e.g., 1
    defaultLimit: v.number(), // default result size for hybrid
    reindexBatchSize: v.number(), // default batch size for reindex
    // Phase 4: hybrid fusion weights & trust boosts (all optional, defaults applied in code)
    hybridKwWeight: v.optional(v.number()),
    hybridSemWeight: v.optional(v.number()),
    boostVerified: v.optional(v.number()),
    boostGoldVerified: v.optional(v.number()),
    boostTradeAssurance: v.optional(v.number()),
    boostServiceRatingMultiplier: v.optional(v.number()), // multiplied by serviceRating/5
    boostResponseRateMultiplier: v.optional(v.number()), // multiplied by responseRate/100
    // Phase 5: reranking controls
    rerankEnabled: v.optional(v.boolean()),
    rerankTopK: v.optional(v.number()),
    rerankTimeoutMs: v.optional(v.number()),
    rerankWeight: v.optional(v.number()),
    updatedAt: v.number(),
  }),

  // Supplier responsiveness tracking
  responseTracking: defineTable({
    supplierId: v.id("suppliers"),
    inquiryType: v.union(v.literal("message"), v.literal("rfq"), v.literal("sample")),
    inquiryId: v.string(),
    receivedAt: v.number(),
    respondedAt: v.optional(v.number()),
    responseTime: v.optional(v.number()), // in minutes
    autoAcknowledged: v.boolean(),
  })
    .index("by_supplier", ["supplierId"])
    .index("by_received", ["receivedAt"]),

  // Keep existing tables for compatibility
  conversations: defineTable({
    buyerId: v.id("users"),
    supplierId: v.id("suppliers"),
    subject: v.optional(v.string()),
    participantUserIds: v.array(v.id("users")),
    lastMessageTime: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("archived")
    ),
    // Enhanced fields
    inquiryType: v.optional(v.union(
      v.literal("product_inquiry"),
      v.literal("quotation"),
      v.literal("order_support"),
      v.literal("general")
    )),
    relatedProductId: v.optional(v.id("products")),
    relatedOrderId: v.optional(v.id("orders")),
    language: v.union(v.literal("en"), v.literal("es")),
    autoTranslate: v.boolean(),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_supplier", ["supplierId"])
    .index("by_last_message_time", ["lastMessageTime"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    senderRole: v.union(v.literal("buyer"), v.literal("supplier")),
    body: v.string(),
    translatedBody: v.optional(v.object({
      en: v.optional(v.string()),
      es: v.optional(v.string()),
    })),
    attachments: v.optional(v.array(v.id("_storage"))),
    timestamp: v.number(),
    isAutoReply: v.optional(v.boolean()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_timestamp", ["timestamp"]),

  // Enhanced product reviews
  productReviews: defineTable({
    productId: v.id("products"),
    orderId: v.optional(v.id("orders")),
    reviewerId: v.id("users"),
    verifiedPurchase: v.boolean(),
    
    // Ratings
    overallRating: v.number(),
    qualityRating: v.number(),
    valueRating: v.number(),
    communicationRating: v.number(),
    
    // Review content
    title: v.optional(v.string()),
    comment: v.string(),
    language: v.union(v.literal("en"), v.literal("es")),
    photos: v.optional(v.array(v.id("_storage"))),
    
    // Metadata
    visibility: v.union(v.literal("public"), v.literal("hidden")),
    helpfulCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_reviewer", ["reviewerId"])
    .index("by_visibility", ["visibility"])
    .index("by_rating", ["overallRating"]),

  // Enhanced supplier reviews
  supplierReviews: defineTable({
    supplierId: v.id("suppliers"),
    orderId: v.optional(v.id("orders")),
    reviewerId: v.id("users"),
    verifiedTransaction: v.boolean(),
    
    // Ratings
    overallRating: v.number(),
    communicationRating: v.number(),
    onTimeDeliveryRating: v.number(),
    productQualityRating: v.number(),
    
    // Review content
    title: v.optional(v.string()),
    comment: v.string(),
    language: v.union(v.literal("en"), v.literal("es")),
    
    // Would work with again?
    wouldRecommend: v.boolean(),
    
    // Metadata
    visibility: v.union(v.literal("public"), v.literal("hidden")),
    createdAt: v.number(),
  })
    .index("by_supplier", ["supplierId"])
    .index("by_reviewer", ["reviewerId"])
    .index("by_visibility", ["visibility"]),

  // Product Q&A
  productQuestions: defineTable({
    productId: v.id("products"),
    askerId: v.id("users"),
    question: v.string(),
    answer: v.optional(v.string()),
    answeredBy: v.optional(v.id("users")),
    createdAt: v.number(),
    answeredAt: v.optional(v.number()),
    visibility: v.union(v.literal("public"), v.literal("hidden")),
  })
    .index("by_product", ["productId"])
    .index("by_visibility", ["visibility"]),

  // Favorites
  favorites: defineTable({
    userId: v.id("users"),
    entityType: v.union(v.literal("product"), v.literal("supplier")),
    entityId: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"]),

  // Documents (enhanced)
  documents: defineTable({
    ownerType: v.union(v.literal("supplier"), v.literal("product"), v.literal("order")),
    ownerId: v.string(),
    
    // File info
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    
    // Document classification
    documentType: v.union(
      // Business documents
      v.literal("business_license"),
      v.literal("tax_certificate"),
      v.literal("bank_statement"),
      
      // Certifications
      v.literal("iso_certificate"),
      v.literal("quality_certification"),
      v.literal("usmca_certificate"),
      v.literal("nom_certificate"),
      
      // Product documents
      v.literal("product_specification"),
      v.literal("test_report"),
      v.literal("msds"), // Material Safety Data Sheet
      v.literal("product_brochure"),
      
      // Trade documents
      v.literal("commercial_invoice"),
      v.literal("packing_list"),
      v.literal("bill_of_lading"),
      v.literal("certificate_of_origin"),
      
      // Audit reports
      v.literal("factory_audit"),
      v.literal("social_compliance_audit"),
      v.literal("quality_audit"),
      
      v.literal("other")
    ),
    
    // Verification
    uploadedBy: v.id("users"),
    verificationStatus: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected")
    ),
    verifiedBy: v.optional(v.id("users")),
    verifiedAt: v.optional(v.number()),
    
    // Document details
    issuedDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    issuingAuthority: v.optional(v.string()),
    documentHash: v.optional(v.string()), // For authenticity
    
    // Metadata
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerType", "ownerId"])
    .index("by_type", ["documentType"])
    .index("by_verification", ["verificationStatus"]),

  // Simple verification request tracking for suppliers (used by submitVerificationRequest)
  verificationRequests: defineTable({
    companyId: v.id("suppliers"),
    requestedBy: v.id("users"),
    documents: v.array(v.id("documents")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["status"]),

  // Moderation logs
  moderationLogs: defineTable({
    adminId: v.id("users"),
    actionType: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    reason: v.string(),
    details: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_admin", ["adminId"])
    .index("by_target", ["targetType", "targetId"]),
};

export default defineSchema({
  ...authTables,
  ...enhancedApplicationTables,
});
