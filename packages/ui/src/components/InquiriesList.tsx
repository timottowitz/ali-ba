import { useQuery } from "convex/react";
import { api } from "@alibaba-clone/shared/convex/_generated/api";
import { useState } from "react";

export function InquiriesList() {
  const [cursor, setCursor] = useState<string | null>(null);
  const inquiries = useQuery(api.inquiries.getByBuyer, {
    paginationOpts: { numItems: 10, cursor },
  });

  if (!inquiries) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border animate-pulse">
            <div className="p-6 space-y-4">
              <div className="flex space-x-4">
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

  if (inquiries.page.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">No inquiries yet</div>
        <p className="text-gray-600">
          Start contacting suppliers to see your inquiries here!
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'responded':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'normal':
        return 'text-blue-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Inquiries</h2>
      
      <div className="space-y-4">
        {inquiries.page.map((inquiry) => (
          <div key={inquiry._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                  {inquiry.product?.images?.[0] && (
                    <img
                      src={inquiry.product.images[0]}
                      alt={inquiry.product.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {inquiry.product?.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    To: {inquiry.supplier?.companyName}
                  </p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                      {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                    </span>
                    <span className={`font-medium ${getUrgencyColor(inquiry.urgency)}`}>
                      {inquiry.urgency.charAt(0).toUpperCase() + inquiry.urgency.slice(1)} Priority
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  {new Date(inquiry._creationTime).toLocaleDateString()}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">{inquiry.message}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Quantity:</span>
                  <div className="font-medium">{inquiry.quantity.toLocaleString()} pieces</div>
                </div>
                {inquiry.targetPrice && (
                  <div>
                    <span className="text-gray-500">Target Price:</span>
                    <div className="font-medium">${inquiry.targetPrice.toFixed(2)}</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Contact:</span>
                  <div className="font-medium">{inquiry.buyerContact.email}</div>
                </div>
                {inquiry.buyerContact.company && (
                  <div>
                    <span className="text-gray-500">Company:</span>
                    <div className="font-medium">{inquiry.buyerContact.company}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!inquiries.isDone && (
        <div className="text-center">
          <button
            onClick={() => setCursor(inquiries.continueCursor)}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
