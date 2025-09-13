import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { ProductCard } from "./ProductCard";
import { Id } from "../../convex/_generated/dataModel";

interface ProductGridProps {
  searchQuery: string;
  categoryId: string | null;
  aiResults?: any[];
}

export function ProductGrid({ searchQuery, categoryId, aiResults }: ProductGridProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  
  const products = useQuery(api.products.list, {
    searchQuery,
    categoryId: categoryId as Id<"categories"> | null,
    limit: 20,
  });

  // Use AI results if available, otherwise use regular query results
  const displayProducts = aiResults || products;

  if (!displayProducts) {
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
        {displayProducts.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      {displayProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">
            {searchQuery ? `No products found for "${searchQuery}"` : 'No products available'}
          </div>
        </div>
      )}
    </div>
  );
}
