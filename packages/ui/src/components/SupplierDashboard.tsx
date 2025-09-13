import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { SupplierHeader } from './SupplierHeader'
import { SupplierProductList } from './SupplierProductList'
import { SupplierProfile } from './SupplierProfile'
import { SupplierInquiries } from './SupplierInquiries'
import { ERPIntegration } from './ERPIntegration'

export function SupplierDashboard() {
  const [activeTab, setActiveTab] = useState<'products' | 'profile' | 'inquiries' | 'erp'>('products')
  const supplier = useQuery(api.suppliers.getMySupplier)
  const products = useQuery(api.products.getMyProducts)

  if (supplier === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (supplier === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Supplier Profile</h2>
          <p className="text-gray-600 mb-6">
            You need to create a supplier profile to access the dashboard.
          </p>
          <button
            onClick={() => setActiveTab('profile')}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors"
          >
            Create Profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SupplierHeader 
        supplier={supplier}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'products' && (
          <SupplierProductList products={products || []} />
        )}
        
        {activeTab === 'profile' && (
          <SupplierProfile supplier={supplier} />
        )}
        
        {activeTab === 'inquiries' && (
          <SupplierInquiries supplierId={supplier._id} />
        )}
        
        {activeTab === 'erp' && (
          <ERPIntegration supplierId={supplier._id} />
        )}
      </main>
    </div>
  )
}
