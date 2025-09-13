import { useState } from 'react'
import { Header } from './Header'
import { ProductGrid } from './ProductGrid'
import { CategoryNav } from './CategoryNav'
import { SearchBar } from './SearchBar'
import { SupplierGrid } from './SupplierGrid'
import { FavoritesList } from './FavoritesList'
import { InquiriesList } from './InquiriesList'

export function HomePage() {
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers' | 'favorites' | 'inquiries'>('products')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {(activeTab === 'products' || activeTab === 'suppliers') && (
            <div className="mb-6">
              <SearchBar 
                value={searchQuery} 
                onChange={setSearchQuery}
                placeholder={`Search ${activeTab}...`}
              />
            </div>
          )}

          {activeTab === 'products' && (
            <>
              <CategoryNav 
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
              />
              <ProductGrid 
                searchQuery={searchQuery}
                categoryId={selectedCategory}
              />
            </>
          )}

          {activeTab === 'suppliers' && (
            <SupplierGrid searchQuery={searchQuery} />
          )}

          {activeTab === 'favorites' && <FavoritesList />}

          {activeTab === 'inquiries' && <InquiriesList />}
        </div>
      </main>
    </div>
  )
}
