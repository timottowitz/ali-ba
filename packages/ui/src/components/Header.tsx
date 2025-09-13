import { Authenticated, Unauthenticated } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { SignOutButton } from './SignOutButton'

interface HeaderProps {
  activeTab: 'products' | 'suppliers' | 'favorites' | 'inquiries'
  onTabChange: (tab: 'products' | 'suppliers' | 'favorites' | 'inquiries') => void
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-bold text-orange-600">
              Alibaba.com
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link
                to="/products"
                className={`px-3 py-2 text-sm font-medium ${
                  activeTab === 'products' 
                    ? 'text-orange-600 border-b-2 border-orange-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Products
              </Link>
              <Link
                to="/suppliers"
                className={`px-3 py-2 text-sm font-medium ${
                  activeTab === 'suppliers' 
                    ? 'text-orange-600 border-b-2 border-orange-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Suppliers
              </Link>
              <Authenticated>
                <Link
                  to="/favorites"
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'favorites' 
                      ? 'text-orange-600 border-b-2 border-orange-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Favorites
                </Link>
                <Link
                  to="/inquiries"
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'inquiries' 
                      ? 'text-orange-600 border-b-2 border-orange-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Inquiries
                </Link>
              </Authenticated>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Authenticated>
              <SignOutButton />
            </Authenticated>
            <Unauthenticated>
              <button className="text-sm text-gray-600 hover:text-gray-900">
                Sign In
              </button>
            </Unauthenticated>
          </div>
        </div>
      </div>
    </header>
  )
}
