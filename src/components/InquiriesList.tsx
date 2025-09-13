import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function InquiriesList() {
  const inquiries = useQuery(api.inquiries.listByUser);

  if (!inquiries) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border animate-pulse">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'responded': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (inquiries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">No inquiries yet</div>
        <p className="text-gray-500">Your product inquiries will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Inquiries</h2>
      
      <div className="space-y-4">
        {inquiries.map((inquiry) => (
          <div key={inquiry._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                  {/* Product image placeholder - would need to get image URL from storage */}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {(inquiry.product as any)?.title?.en || (inquiry.product as any)?.name || 'Product not found'}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                      {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                    </span>
                    <span>Qty: {inquiry.quantity}</span>
                  </div>
                  <p className="text-gray-700 text-sm mb-3">{inquiry.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Contact</div>
                  <div className="font-medium">{inquiry.contactEmail}</div>
                  <div className="text-gray-600">{inquiry.contactName}</div>
                </div>
                
                <div>
                  <div className="text-gray-500 mb-1">Supplier</div>
                  <div className="font-medium">{inquiry.supplier?.companyName || 'Unknown'}</div>
                  <div className="text-gray-600">{inquiry.supplier?.location || ''}</div>
                </div>

                <div>
                  <div className="text-gray-500 mb-1">Date</div>
                  <div className="font-medium">
                    {new Date(inquiry._creationTime).toLocaleDateString()}
                  </div>
                  {inquiry.respondedAt && (
                    <div className="text-gray-600">
                      Responded: {new Date(inquiry.respondedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {inquiry.response && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-800 mb-1">Supplier Response:</div>
                  <p className="text-green-700 text-sm">{inquiry.response}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
