interface SupplierCardProps {
  supplier: any;
}

export function SupplierCard({ supplier }: SupplierCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start space-x-4 mb-4">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {supplier.logoUrl ? (
              <img
                src={supplier.logoUrl}
                alt={supplier.companyName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-xs text-center">
                No Logo
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {supplier.companyName}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-600">{supplier.country}</span>
              {supplier.verified && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          {supplier.description}
        </p>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Products:</span>
            <span className="font-medium">{supplier.productCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Established:</span>
            <span className="font-medium">{supplier.yearEstablished}</span>
          </div>
          <div className="flex justify-between">
            <span>Employees:</span>
            <span className="font-medium">{supplier.employees}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <div className="flex text-yellow-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(supplier.rating) ? 'fill-current' : 'text-gray-300'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                ({supplier.rating.toFixed(1)})
              </span>
            </div>
            <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
