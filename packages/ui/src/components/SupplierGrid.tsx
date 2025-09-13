import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { SupplierCard } from "./SupplierCard";
// use root api for search snippets

interface SupplierGridProps {
  searchQuery: string;
  verifiedOnly?: boolean;
  minResponseRate?: number;
  languages?: string[];
  stateFilter?: string;
  certFilter?: string;
  sortBy?: 'default'|'trust_score'|'response_rate'|'service_rating';
  searchIn?: 'name'|'description'|'description_es';
  minOnTimeDeliveryRate?: number;
  minServiceRating?: number;
  capabilities?: string[];
}

export function SupplierGrid({ searchQuery, verifiedOnly, minResponseRate, languages, stateFilter, certFilter, sortBy = 'default', searchIn = 'name', minOnTimeDeliveryRate, minServiceRating, capabilities }: SupplierGridProps) {
  const [cursor, setCursor] = useState<string | null>(null)
  const suppliers = useQuery(api.suppliers.searchSuppliersPaged, {
    query: searchQuery || undefined,
    paginationOpts: { numItems: 24, cursor },
    verificationStatus: verifiedOnly ? ['verified', 'gold_verified'] as any : undefined,
    minResponseRate: minResponseRate,
    state: stateFilter || undefined,
    certifications: certFilter ? [certFilter] : undefined,
    languages: languages && languages.length ? languages as any : undefined,
    searchIn,
    sortBy,
    minOnTimeDeliveryRate,
    minServiceRating,
    capabilities,
  } as any);

  if (!suppliers) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border animate-pulse">
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const filteredSuppliers = suppliers?.page || [];

  const snippets = useQuery(
    api.search.getTopChunksForParents as any,
    searchQuery && filteredSuppliers.length
      ? { entityType: 'supplier' as any, parentIds: filteredSuppliers.map((s: any) => String(s._id)), query: searchQuery, perParent: 1 }
      : 'skip' as any
  ) as any[] | undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => {
          const snip = snippets?.find(s => s.parentId === String(supplier._id))?.snippets?.[0]?.content as string | undefined;
          return <SupplierCard key={supplier._id} supplier={supplier} whySnippet={snip} />
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">
            {searchQuery ? `No suppliers found for "${searchQuery}"` : 'No suppliers available'}
          </div>
        </div>
      )}

      {!searchQuery && suppliers && !suppliers.isDone && (
        <div className="text-center">
          <button
            onClick={() => setCursor(suppliers.continueCursor)}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
