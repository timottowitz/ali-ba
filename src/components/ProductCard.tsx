import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { InquiryModal } from "./InquiryModal";

interface ProductCardProps {
  product: any;
}

export function ProductCard({ product }: ProductCardProps) {
  const [showInquiry, setShowInquiry] = useState(false);
  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.remove);
  const isFavorite = useQuery(api.favorites.isFavorite, { productId: product._id });

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // For now, just add to favorites - we'd need to check if it's already favorited
    await addFavorite({ productId: product._id });
  };

  const formatPrice = (price: any) => {
    if (price.min === price.max) {
      return `$${price.min.toFixed(2)}`;
    }
    return `$${price.min.toFixed(2)} - $${price.max.toFixed(2)}`;
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
        </div>

        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
          <div className="text-lg font-semibold text-orange-600 mb-2">
            {formatPrice(product.price)}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            MOQ: {product.minOrderQuantity} pieces
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{product.supplier?.companyName}</span>
            <span>{product.supplier?.country}</span>
          </div>
          <button
            onClick={() => setShowInquiry(true)}
            className="w-full mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            Contact Supplier
          </button>
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
