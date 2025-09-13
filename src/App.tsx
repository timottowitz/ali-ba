import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { useState } from "react";
import { ProductGrid } from "./components/ProductGrid";
import { CategoryNav } from "./components/CategoryNav";
import { SearchBar } from "./components/SearchBar";
import { FavoritesList } from "./components/FavoritesList";
import { InquiriesList } from "./components/InquiriesList";
import { SupplierGrid } from "./components/SupplierGrid";
import { SignOutButton } from "./SignOutButton";

// Supplier Dashboard Components
import { SupplierProductList } from "../packages/ui/src/components/SupplierProductList";
import { SupplierProfile } from "../packages/ui/src/components/SupplierProfile";
import { SupplierInquiries } from "../packages/ui/src/components/SupplierInquiries";
import { ERPIntegration } from "../packages/ui/src/components/ERPIntegration";

function BuyerDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [aiSearchResults, setAISearchResults] = useState<any>(null);

  const user = useQuery(api.auth.loggedInUser);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-orange-600">GlobalTrade</h1>
              <nav className="flex space-x-6">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'products'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('suppliers')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'suppliers'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Suppliers
                </button>
                <button
                  onClick={() => setActiveTab('favorites')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'favorites'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Favorites
                </button>
                <button
                  onClick={() => setActiveTab('inquiries')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'inquiries'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  My Inquiries
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name || 'User'}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'products' && (
          <div className="space-y-6">
            <SearchBar 
              onSearch={setSearchQuery} 
              onAIResults={setAISearchResults}
              enableAI={true}
              placeholder="Search products... (🤖 AI available)"
            />
            {aiSearchResults && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-900 mb-2">🤖 AI Search Results</h3>
                <p className="text-sm text-blue-700 mb-1">Enhanced: "{aiSearchResults.enhancedQuery}"</p>
                <p className="text-xs text-blue-600">Found {aiSearchResults.totalFound} results using AI-powered search</p>
              </div>
            )}
            <CategoryNav selectedCategory={selectedCategory} onCategorySelect={setSelectedCategory} />
            <ProductGrid 
              searchQuery={searchQuery} 
              categoryId={selectedCategory}
              aiResults={aiSearchResults?.results}
            />
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="space-y-6">
            <SearchBar onSearch={setSearchQuery} placeholder="Search suppliers..." />
            <SupplierGrid searchQuery={searchQuery} />
          </div>
        )}

        {activeTab === 'favorites' && <FavoritesList />}
        {activeTab === 'inquiries' && <InquiriesList />}
      </main>
    </div>
  );
}

function SupplierDashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  const user = useQuery(api.auth.loggedInUser);
  const supplier = useQuery(api.suppliers.getByUserId);
  const products = useQuery(api.products.listBySupplier);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-orange-600">Supplier Portal</h1>
              <nav className="flex space-x-6">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'profile'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'products'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('inquiries')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'inquiries'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Inquiries
                </button>
                <button
                  onClick={() => setActiveTab('erp')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'erp'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ERP Integration
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {supplier?.companyName || user?.name || 'Supplier'}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'profile' && <SupplierProfile supplier={supplier} />}
        {activeTab === 'products' && <SupplierProductList products={products || []} />}
        {activeTab === 'inquiries' && <SupplierInquiries supplierId={supplier?._id || ''} />}
        {activeTab === 'erp' && <ERPIntegration supplierId={supplier?._id || ''} />}
      </main>
    </div>
  );
}

function AuthenticatedApp() {
  const [userType, setUserType] = useState<'buyer' | 'supplier'>('buyer');
  const user = useQuery(api.auth.loggedInUser);
  const supplier = useQuery(api.suppliers.getByUserId);

  // Auto-detect user type based on supplier profile
  if (supplier && userType === 'buyer') {
    setUserType('supplier');
  }

  return (
    <div>
      {/* User Type Selector */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center py-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setUserType('buyer')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  userType === 'buyer'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Buyer Portal
              </button>
              <button
                onClick={() => setUserType('supplier')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  userType === 'supplier'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Supplier Portal
              </button>
            </div>
          </div>
        </div>
      </div>

      {userType === 'buyer' ? <BuyerDashboard /> : <SupplierDashboard />}
    </div>
  );
}

export default function App() {
  return (
    <main className="container max-w-2xl flex flex-col gap-8">
      <Unauthenticated>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">GlobalTrade</h1>
              <p className="text-gray-600">Connect with suppliers worldwide</p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
      
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
    </main>
  );
}
