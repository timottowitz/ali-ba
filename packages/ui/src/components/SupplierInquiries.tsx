import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useState } from 'react'

interface SupplierInquiriesProps {
  supplierId: string
}

export function SupplierInquiries({ supplierId }: SupplierInquiriesProps) {
  const inquiries = useQuery(api.inquiries.listBySupplier)
  const respondToInquiry = useMutation(api.inquiries.respond)
  const updateInquiryStatus = useMutation(api.inquiries.updateStatus)

  const [responses, setResponses] = useState<Record<string, string>>({})

  const handleRespond = async (inquiryId: any) => {
    const response = responses[inquiryId]
    if (!response?.trim()) return

    try {
      await respondToInquiry({ inquiryId, response })
      setResponses({ ...responses, [inquiryId]: '' })
    } catch (error) {
      console.error('Error responding to inquiry:', error)
      alert('Error sending response. Please try again.')
    }
  }

  const handleStatusChange = async (inquiryId: any, status: 'pending' | 'responded' | 'closed') => {
    try {
      await updateInquiryStatus({ inquiryId, status })
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'responded': return 'text-green-600 bg-green-100'
      case 'closed': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!inquiries) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border animate-pulse p-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (inquiries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">No inquiries yet</div>
        <p className="text-gray-500">Customer inquiries will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Customer Inquiries</h2>
      
      <div className="space-y-4">
        {inquiries.map((inquiry: any) => (
          <div key={inquiry._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                  {/* Product image placeholder */}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {inquiry.product?.name || 'Product not found'}
                    </h3>
                    <select
                      value={inquiry.status}
                      onChange={(e) => handleStatusChange(inquiry._id, e.target.value as any)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${getStatusColor(inquiry.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="responded">Responded</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <span>Quantity: {inquiry.quantity}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(inquiry._creationTime).toLocaleDateString()}</span>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{inquiry.message}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 mb-1">Customer Contact</div>
                      <div className="font-medium">{inquiry.contactEmail}</div>
                      <div className="text-gray-600">{inquiry.contactName}</div>
                      {inquiry.contactPhone && (
                        <div className="text-gray-600">{inquiry.contactPhone}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {inquiry.response && (
                <div className="mb-4 p-4 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-800 mb-1">Your Response:</div>
                  <p className="text-green-700 text-sm">{inquiry.response}</p>
                  <div className="text-xs text-green-600 mt-1">
                    Sent: {inquiry.respondedAt ? new Date(inquiry.respondedAt).toLocaleString() : 'Unknown'}
                  </div>
                </div>
              )}

              {inquiry.status === 'pending' && (
                <div className="border-t pt-4">
                  <div className="flex space-x-3">
                    <textarea
                      value={responses[inquiry._id] || ''}
                      onChange={(e) => setResponses({ ...responses, [inquiry._id]: e.target.value })}
                      placeholder="Type your response..."
                      rows={3}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => handleRespond(inquiry._id)}
                      disabled={!responses[inquiry._id]?.trim()}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send Response
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
