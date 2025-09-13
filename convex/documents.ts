import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { action } from "./_generated/server";

export const listDocumentsByOwner = query({
  args: {
    ownerType: v.union(v.literal("supplier"), v.literal("product"), v.literal("order")),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_owner", q => q.eq("ownerType", args.ownerType as any).eq("ownerId", args.ownerId))
      .collect();
  },
});

export const uploadDocument = mutation({
  args: {
    ownerType: v.union(v.literal("supplier"), v.literal("product"), v.literal("order")),
    ownerId: v.string(),
    uploadedBy: v.id("users"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    documentType: v.string(),
    issuedDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    issuingAuthority: v.optional(v.string()),
    documentHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("documents", {
      ownerType: args.ownerType as any,
      ownerId: args.ownerId,
      fileId: args.fileId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      documentType: args.documentType as any,
      uploadedBy: args.uploadedBy,
      verificationStatus: "pending" as any,
      issuedDate: args.issuedDate,
      expiryDate: args.expiryDate,
      issuingAuthority: args.issuingAuthority,
      documentHash: args.documentHash,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const verifyDocument = mutation({
  args: {
    documentId: v.id("documents"),
    verifierUserId: v.id("users"),
    status: v.union(v.literal("verified"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      verificationStatus: args.status,
      verifiedBy: args.verifierUserId,
      verifiedAt: Date.now(),
    } as any);
  },
});

// Generate a signed upload URL for Convex storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const url = await ctx.storage.generateUploadUrl();
    return url;
  },
});

// List all pending documents for admin review
export const listPendingDocuments = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_verification", q => q.eq("verificationStatus", "pending" as any))
      .order("desc")
      .take(200);
    return docs;
  },
});

// Get a signed download URL for a document's file
export const getDocumentUrl = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;
    const url = await ctx.storage.getUrl(doc.fileId);
    return url;
  },
});
