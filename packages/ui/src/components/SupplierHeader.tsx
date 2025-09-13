import { SignOutButton } from './SignOutButton'

interface SupplierHeaderProps {
  supplier: any
  activeTab: 'products' | 'profile' | 'inquiries' | 'erp'
  onTabChange: (tab: 'products' | 'profile' | 'inquiries' | 'erp') => void
}

export function SupplierHeader({ supplier, activeTab, onTabChange }: SupplierHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="text-2xl font-bold text-orange-600">
              Supplier Dashboard
            </div>
            
            <nav className="flex space-x-6">
              <button
                onClick={() => onTabChange('products')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'products'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Products
              </button>
              <button
                onClick={() => onTabChange('profile')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => onTabChange('inquiries')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'inquiries'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Inquiries
              </button>
              <button
                onClick={() => onTabChange('erp')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'erp'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ERP Integration
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {supplier.companyName}
              {!supplier.verified && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Pending Verification
                </span>
              )}
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  )
}
