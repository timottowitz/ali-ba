import { useQuery, useMutation } from "convex/react";
import { api } from "@alibaba-clone/shared/convex/_generated/api";

export function FavoritesList() {
  const favorites = useQuery(api.favorites.list);
  const toggleFavorite = useMutation(api.favorites.toggle);

  const handleRemoveFavorite = async (productId: any) => {
    await toggleFavorite({ productId });
  };

  if (!favorites) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
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

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">No favorites yet</div>
        <p className="text-gray-600">
          Start browsing products and add them to your favorites!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Favorites</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favorites.map((favorite) => favorite && (
          <div key={favorite._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="relative">
              <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                {favorite.product.imageUrls?.[0] ? (
                  <img
                    src={favorite.product.imageUrls[0]}
                    alt={favorite.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemoveFavorite(favorite.product._id)}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
              >
                <svg
                  className="w-5 h-5 text-red-500 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                {favorite.product.name}
              </h3>
              <div className="text-lg font-semibold text-orange-600 mb-2">
                ${favorite.product.price.min.toFixed(2)} - ${favorite.product.price.max.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                MOQ: {favorite.product.minOrderQuantity} pieces
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{favorite.product.supplier?.companyName}</span>
                <span>{favorite.product.supplier?.country}</span>
              </div>
              <button className="w-full mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                Contact Supplier
              </button>
            </div>
          </div>
        )).filter(Boolean)}
      </div>
    </div>
  );
}
