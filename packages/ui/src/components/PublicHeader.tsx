import { Link } from '@tanstack/react-router'

interface PublicHeaderProps {
  activeTab: 'products' | 'suppliers'
  onTabChange: (tab: 'products' | 'suppliers') => void
}

export function PublicHeader({ activeTab, onTabChange }: PublicHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-bold text-orange-600">
              Alibaba.com
            </Link>
            
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
                onClick={() => onTabChange('suppliers')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'suppliers'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Suppliers
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/supplier/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Supplier Login
            </Link>
            <Link
              to="/supplier/register"
              className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
            >
              Become a Supplier
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
