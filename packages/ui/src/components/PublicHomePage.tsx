import { useState } from 'react'
import { PublicHeader } from './PublicHeader'
import { ProductGrid } from './ProductGrid'
import { CategoryNav } from './CategoryNav'
import { SearchBar } from './SearchBar'
import { SupplierGrid } from './SupplierGrid'
import { useQuery } from 'convex/react'
import { api as sharedApi } from '@alibaba-clone/shared/convex/_generated/api'
import { Link } from '@tanstack/react-router'

export function PublicHomePage() {
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers'>('products')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicHeader activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <QuickPicks onPickFasteners={(id) => setSelectedCategory(id)} />
          <div className="mb-6">
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery}
              placeholder={`Search ${activeTab}...`}
            />
          </div>

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
        </div>
      </main>
    </div>
  )
}

function QuickPicks({ onPickFasteners }: { onPickFasteners: (id: string) => void }) {
  const fasteners = useQuery(sharedApi.categories.getBySlug, { slug: 'fasteners' } as any)
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">Quick Picks</div>
      <div className="flex gap-2">
        <button
          onClick={() => fasteners && onPickFasteners(String((fasteners as any)._id))}
          className="px-3 py-1.5 rounded-full text-sm bg-orange-100 text-orange-800 hover:bg-orange-200"
        >
          Fasteners
        </button>
        <Link
          to="/suppliers"
          search={{ q: 'screw', state: 'SON', verified: true }}
          className="px-3 py-1.5 rounded-full text-sm bg-orange-100 text-orange-800 hover:bg-orange-200"
        >
          Sonora Screw Manufacturers
        </Link>
      </div>
    </div>
  )
}
