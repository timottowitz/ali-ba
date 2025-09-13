import { useMutation, useQuery } from "convex/react";
import { api as sharedApi } from "@alibaba-clone/shared/convex/_generated/api";
import { useState } from "react";
import { InquiryModal } from "./InquiryModal";
import { Link } from '@tanstack/react-router'

interface ProductCardProps {
  product: any;
  whySnippet?: string;
}

export function ProductCard({ product, whySnippet }: ProductCardProps) {
  const [showInquiry, setShowInquiry] = useState(false);
  const toggleFavorite = useMutation(sharedApi.favorites.toggle);
  const isFavorite = useQuery(sharedApi.favorites.isFavorite, { productId: product._id });

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite({ productId: product._id });
  };

  const formatPriceFromTiers = (tiers: any[]) => {
    if (!tiers || tiers.length === 0) return '—';
    const prices = tiers.map(t => t.price ?? t.unitPrice).filter((n: number) => typeof n === 'number');
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} - $${max.toFixed(2)}`;
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
        <div className="relative">
          <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
            {product.imageUrls?.[0] ? (
              <img
                src={product.imageUrls[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
          >
            <svg
              className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
          {whySnippet && (
            <div className="absolute bottom-2 left-2">
              <span
                title={whySnippet}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-50 text-yellow-800 border border-yellow-200 cursor-help"
              >
                Why?
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{product.name || product.title?.en || 'Product'}</h3>
          <div className="text-lg font-semibold text-orange-600 mb-2">
            {formatPriceFromTiers(product.pricingTiers || [])}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            MOQ: {product.minOrderQuantity} pieces
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span className="truncate mr-2">{product.supplier?.companyName}</span>
            <div className="flex items-center gap-1">
              {(product.supplier?.verificationStatus === 'verified' || product.supplier?.verificationStatus === 'gold_verified') && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">Verified</span>
              )}
              {(product.supplier?.badges || []).includes('trade_assurance') && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Assurance</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowInquiry(true)}
            className="w-full mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            Contact Supplier
          </button>
          <Link
            to={`/rfq/new`}
            search={{ productId: product._id }}
            className="block text-center w-full mt-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Start RFQ
          </Link>
        </div>
      </div>

      {showInquiry && (
        <InquiryModal
          product={product}
          onClose={() => setShowInquiry(false)}
        />
      )}
    </>
  );
}
