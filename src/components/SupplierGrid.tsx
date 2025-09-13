import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { SupplierCard } from "./SupplierCard";

interface SupplierGridProps {
  searchQuery: string;
}

export function SupplierGrid({ searchQuery }: SupplierGridProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  
  const suppliers = useQuery(api.suppliers.list, {
    searchQuery,
    limit: 20,
  });

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

  // Filter suppliers based on search query
  const filteredSuppliers = searchQuery
    ? suppliers.filter(supplier =>
        supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (supplier.mainProducts && supplier.mainProducts.some(product => 
          product.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      )
    : suppliers;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => (
          <SupplierCard key={supplier._id} supplier={supplier} />
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">
            {searchQuery ? `No suppliers found for "${searchQuery}"` : 'No suppliers available'}
          </div>
        </div>
      )}
    </div>
  );
}
