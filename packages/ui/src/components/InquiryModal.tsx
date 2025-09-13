import { useMutation, useQuery } from "convex/react";
import { api } from "@alibaba-clone/shared/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

interface InquiryModalProps {
  product: any;
  onClose: () => void;
}

export function InquiryModal({ product, onClose }: InquiryModalProps) {
  const [formData, setFormData] = useState({
    message: '',
    quantity: product.minOrderQuantity,
    targetPrice: '',
    urgency: 'normal',
    email: '',
    phone: '',
    company: '',
  });

  const createInquiry = useMutation(api.inquiries.create);
  const user = useQuery(api.auth.loggedInUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createInquiry({
        productId: product._id,
        message: formData.message,
        quantity: formData.quantity,
        targetPrice: formData.targetPrice ? parseFloat(formData.targetPrice) : undefined,
        urgency: formData.urgency,
        buyerContact: {
          email: formData.email || user?.email || '',
          phone: formData.phone || undefined,
          company: formData.company || undefined,
        },
      });
      
      toast.success('Inquiry sent successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to send inquiry');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Send Inquiry
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex space-x-4">
              <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                {product.imageUrls?.[0] && (
                  <img
                    src={product.imageUrls[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-1">{product.supplier?.companyName}</p>
                <p className="text-sm text-orange-600 font-medium">
                  ${product.price.min.toFixed(2)} - ${product.price.max.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Please provide details about your requirements..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  required
                  min={product.minOrderQuantity}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min order: {product.minOrderQuantity} pieces
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Price (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.targetPrice}
                  onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgency
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="low">Low - Within 1 month</option>
                <option value="normal">Normal - Within 2 weeks</option>
                <option value="high">High - Within 1 week</option>
                <option value="urgent">Urgent - Within 3 days</option>
              </select>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    placeholder={user?.email || "your@email.com"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Send Inquiry
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
