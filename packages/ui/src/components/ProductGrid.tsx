import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { ProductCard } from "./ProductCard";
import { Id } from "../../../../convex/_generated/dataModel";

interface ProductGridProps {
  searchQuery: string;
  categoryId: string | null;
  searchIn?: 'title_en'|'description_en'|'title_es';
  minPrice?: number;
  maxPrice?: number;
  minMOQ?: number;
  maxMOQ?: number;
  minLeadTimeSample?: number;
  maxLeadTimeSample?: number;
  verifiedOnly?: boolean;
  tradeAssuranceOnly?: boolean;
  minResponseRate?: number;
  sortBy?: 'relevance'|'price_low'|'price_high'|'newest'|'rating';
  hsCode?: string;
  incoterm?: string;
  certifications?: string[];
  priceType?: 'FOB'|'EXW'|'DDP'|'CIF';
}

export function ProductGrid({ searchQuery, categoryId, searchIn, minPrice, maxPrice, minMOQ, maxMOQ, minLeadTimeSample, maxLeadTimeSample, verifiedOnly, tradeAssuranceOnly, minResponseRate, sortBy = 'relevance', hsCode, incoterm, certifications, priceType }: ProductGridProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  
  const products = useQuery(
    searchQuery
      ? api.products.searchProductsPaged
      : api.products.listProductsPaged,
    searchQuery
      ? {
          query: searchQuery,
          paginationOpts: { numItems: 20, cursor },
          ...(categoryId && { categoryId: categoryId as Id<"categories"> }),
          ...(searchIn ? { searchIn } : {}),
          ...(minPrice != null ? { minPrice } : {}),
          ...(maxPrice != null ? { maxPrice } : {}),
          ...(minMOQ != null ? { minMOQ } : {}),
          ...(maxMOQ != null ? { maxMOQ } : {}),
          ...(minLeadTimeSample != null ? { minLeadTimeSample } : {}),
          ...(maxLeadTimeSample != null ? { maxLeadTimeSample } : {}),
          ...(verifiedOnly ? { verifiedOnly } : {}),
          ...(tradeAssuranceOnly ? { tradeAssuranceOnly } : {}),
          ...(minResponseRate != null ? { minResponseRate } : {}),
          ...(sortBy ? { sortBy } : {}),
          ...(hsCode ? { hsCode } : {}),
          ...(incoterm ? { incoterm } : {}),
          ...(certifications && certifications.length ? { certifications } : {}),
          ...(priceType ? { priceType } : {}),
        }
      : {
          paginationOpts: { numItems: 20, cursor },
          ...(categoryId && { categoryId: categoryId as Id<"categories"> }),
          ...(minPrice != null ? { minPrice } : {}),
          ...(maxPrice != null ? { maxPrice } : {}),
          ...(minMOQ != null ? { minMOQ } : {}),
          ...(maxMOQ != null ? { maxMOQ } : {}),
          ...(minLeadTimeSample != null ? { minLeadTimeSample } : {}),
          ...(maxLeadTimeSample != null ? { maxLeadTimeSample } : {}),
          ...(verifiedOnly ? { verifiedOnly } : {}),
          ...(tradeAssuranceOnly ? { tradeAssuranceOnly } : {}),
          ...(minResponseRate != null ? { minResponseRate } : {}),
          ...(sortBy ? { sortBy } : {}),
          ...(hsCode ? { hsCode } : {}),
          ...(incoterm ? { incoterm } : {}),
          ...(certifications && certifications.length ? { certifications } : {}),
          ...(priceType ? { priceType } : {}),
        }
  );

  // Fetch top chunk snippet per product for "Why these results?"
  const snippets = useQuery(
    api.search.getTopChunksForParents,
    products && searchQuery && (products as any).page?.length
      ? { entityType: 'product' as any, parentIds: (products as any).page.map((p: any) => String(p._id)), query: searchQuery, perParent: 1 }
      : 'skip' as any
  ) as any[] | undefined;

  if (!products) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.page.map((product) => {
          const snip = snippets?.find(s => s.parentId === String(product._id))?.snippets?.[0]?.content as string | undefined;
          return <ProductCard key={product._id} product={product} whySnippet={snip} />
        })}
      </div>

      {!products.isDone && (
        <div className="text-center">
          <button
            onClick={() => setCursor(products.continueCursor)}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Load More
          </button>
        </div>
      )}

      {products.page.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">
            {searchQuery ? `No products found for "${searchQuery}"` : 'No products available'}
          </div>
        </div>
      )}
    </div>
  );
}
