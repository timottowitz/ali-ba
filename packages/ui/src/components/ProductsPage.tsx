import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Header } from './Header'
import { ProductGrid } from './ProductGrid'
import { CategoryNav } from './CategoryNav'
import { SearchBar } from './SearchBar'
import { useQuery } from 'convex/react'
import { api as sharedApi } from '@alibaba-clone/shared/convex/_generated/api'

export function ProductsPage() {
  const routeSearch = useSearch({ from: '/products' }) as any
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState(routeSearch?.q ?? '')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(routeSearch?.categoryId ?? null)
  const [minMOQ, setMinMOQ] = useState<string>('')
  const [maxMOQ, setMaxMOQ] = useState<string>('')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [minLeadSample, setMinLeadSample] = useState<string>('')
  const [maxLeadSample, setMaxLeadSample] = useState<string>('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [assuranceOnly, setAssuranceOnly] = useState(false)
  const [minResponse, setMinResponse] = useState<string>('')
  const [sortBy, setSortBy] = useState<'relevance'|'price_low'|'price_high'|'newest'|'rating'>(routeSearch?.sort ?? 'relevance')
  const [searchIn, setSearchIn] = useState<'title_en'|'description_en'|'title_es'>(routeSearch?.searchIn ?? 'title_en')
  const [hsCode, setHsCode] = useState<string>(routeSearch?.hs ?? '')
  const [incoterm, setIncoterm] = useState<string>(routeSearch?.incoterm ?? '')
  const [priceType, setPriceType] = useState<'FOB'|'EXW'|'DDP'|'CIF'|''>(routeSearch?.priceType ?? '')
  const [certs, setCerts] = useState<string>(routeSearch?.certs ?? '')

  useEffect(() => {
    setSearchQuery(routeSearch?.q ?? '')
    setSelectedCategory(routeSearch?.categoryId ?? null)
    setMinMOQ(routeSearch?.minMOQ ?? '')
    setMaxMOQ(routeSearch?.maxMOQ ?? '')
    setMinPrice(routeSearch?.minPrice ?? '')
    setMaxPrice(routeSearch?.maxPrice ?? '')
    setMinLeadSample(routeSearch?.minLeadSample ?? '')
    setMaxLeadSample(routeSearch?.maxLeadSample ?? '')
    setVerifiedOnly(!!routeSearch?.verified)
    setAssuranceOnly(!!routeSearch?.assurance)
    setMinResponse(routeSearch?.minResponse ?? '')
    setSortBy(routeSearch?.sort ?? 'relevance')
    setSearchIn(routeSearch?.searchIn ?? 'title_en')
    setHsCode(routeSearch?.hs ?? '')
    setIncoterm(routeSearch?.incoterm ?? '')
    setPriceType(routeSearch?.priceType ?? '')
    setCerts(routeSearch?.certs ?? '')
  }, [routeSearch])

  const updateSearch = (patch: any) => {
    const next = {
      q: searchQuery || undefined,
      categoryId: selectedCategory || undefined,
      minMOQ: minMOQ || undefined,
      maxMOQ: maxMOQ || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      minLeadSample: minLeadSample || undefined,
      maxLeadSample: maxLeadSample || undefined,
      verified: verifiedOnly || undefined,
      assurance: assuranceOnly || undefined,
      minResponse: minResponse || undefined,
      sort: sortBy || undefined,
      searchIn: searchIn || undefined,
      hs: hsCode || undefined,
      incoterm: incoterm || undefined,
      priceType: priceType || undefined,
      certs: certs || undefined,
      ...patch,
    }
    navigate({ to: '/products', search: next })
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header activeTab="products" onTabChange={() => {}} />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Quick picks for demo content */}
          <QuickPicks onSelectCategory={(id) => { setSelectedCategory(id); updateSearch({ categoryId: id || undefined }) }} />

          <div className="mb-6">
            <SearchBar
              value={searchQuery}
              onChange={(v) => { setSearchQuery(v); updateSearch({ q: v || undefined }) }}
              placeholder="Search products..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <input className="px-3 py-2 border rounded" placeholder="Min MOQ" value={minMOQ} onChange={e => { setMinMOQ(e.target.value); updateSearch({ minMOQ: e.target.value || undefined }) }} />
              <input className="px-3 py-2 border rounded" placeholder="Max MOQ" value={maxMOQ} onChange={e => { setMaxMOQ(e.target.value); updateSearch({ maxMOQ: e.target.value || undefined }) }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="px-3 py-2 border rounded" placeholder="Min $" value={minPrice} onChange={e => { setMinPrice(e.target.value); updateSearch({ minPrice: e.target.value || undefined }) }} />
              <input className="px-3 py-2 border rounded" placeholder="Max $" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); updateSearch({ maxPrice: e.target.value || undefined }) }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="px-3 py-2 border rounded" placeholder="Min lead (sample)" value={minLeadSample} onChange={e => { setMinLeadSample(e.target.value); updateSearch({ minLeadSample: e.target.value || undefined }) }} />
              <input className="px-3 py-2 border rounded" placeholder="Max lead (sample)" value={maxLeadSample} onChange={e => { setMaxLeadSample(e.target.value); updateSearch({ maxLeadSample: e.target.value || undefined }) }} />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={verifiedOnly} onChange={e => { setVerifiedOnly(e.target.checked); updateSearch({ verified: e.target.checked || undefined }) }} /> Verified</label>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={assuranceOnly} onChange={e => { setAssuranceOnly(e.target.checked); updateSearch({ assurance: e.target.checked || undefined }) }} /> Assurance</label>
              <input className="px-3 py-2 border rounded w-28" placeholder="Min resp %" value={minResponse} onChange={e => { setMinResponse(e.target.value); updateSearch({ minResponse: e.target.value || undefined }) }} />
            </div>
            <div>
              <select className="px-3 py-2 border rounded w-full" value={sortBy} onChange={e => { setSortBy(e.target.value as any); updateSearch({ sort: e.target.value }) }}>
                <option value="relevance">Sort: Relevance</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="rating">Rating</option>
              </select>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <select className="px-3 py-2 border rounded" value={searchIn} onChange={e => { setSearchIn(e.target.value as any); updateSearch({ searchIn: e.target.value }) }}>
                  <option value="title_en">Search in: Title (EN)</option>
                  <option value="description_en">Description (EN)</option>
                  <option value="title_es">Title (ES)</option>
                </select>
                <input className="px-3 py-2 border rounded" placeholder="HS Code" value={hsCode} onChange={e => { setHsCode(e.target.value); updateSearch({ hs: e.target.value || undefined }) }} />
              <select className="px-3 py-2 border rounded" value={incoterm} onChange={e => { setIncoterm(e.target.value); updateSearch({ incoterm: e.target.value || undefined }) }}>
                <option value="">Incoterm</option>
                <option value="EXW">EXW</option>
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="DDP">DDP</option>
                <option value="DAP">DAP</option>
              </select>
              <select className="px-3 py-2 border rounded" value={priceType} onChange={e => { setPriceType(e.target.value as any); updateSearch({ priceType: e.target.value || undefined }) }}>
                <option value="">Price Type</option>
                <option value="FOB">FOB</option>
                <option value="EXW">EXW</option>
                <option value="DDP">DDP</option>
                <option value="CIF">CIF</option>
              </select>
              <input className="px-3 py-2 border rounded" placeholder="Certs (comma)" value={certs} onChange={e => { setCerts(e.target.value); updateSearch({ certs: e.target.value || undefined }) }} />
              </div>
            </div>
          </div>

          <CategoryNav
            selectedCategory={selectedCategory}
            onCategorySelect={(id) => { setSelectedCategory(id); updateSearch({ categoryId: id || undefined }) }}
          />
          
          <ProductGrid 
            searchQuery={searchQuery}
            categoryId={selectedCategory}
            searchIn={searchIn}
            minMOQ={minMOQ ? Number(minMOQ) : undefined}
            maxMOQ={maxMOQ ? Number(maxMOQ) : undefined}
            minPrice={minPrice ? Number(minPrice) : undefined}
            maxPrice={maxPrice ? Number(maxPrice) : undefined}
            minLeadTimeSample={minLeadSample ? Number(minLeadSample) : undefined}
            maxLeadTimeSample={maxLeadSample ? Number(maxLeadSample) : undefined}
            verifiedOnly={verifiedOnly}
            tradeAssuranceOnly={assuranceOnly}
            minResponseRate={minResponse ? Number(minResponse) : undefined}
            sortBy={sortBy}
            hsCode={hsCode || undefined}
            incoterm={incoterm || undefined}
            priceType={priceType || undefined as any}
            certifications={certs ? certs.split(',').map(s => s.trim()).filter(Boolean) : undefined}
          />
        </div>
      </main>
    </div>
  )
}

function QuickPicks({ onSelectCategory }: { onSelectCategory: (id: string) => void }) {
  const fasteners = useQuery(sharedApi.categories.getBySlug, { slug: 'fasteners' } as any)
  if (fasteners === undefined) return null
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">Quick Picks</div>
      <div className="flex gap-2">
        {fasteners ? (
          <button
            onClick={() => onSelectCategory(String((fasteners as any)._id))}
            className="px-3 py-1.5 rounded-full text-sm bg-orange-100 text-orange-800 hover:bg-orange-200"
          >
            Browse Fasteners
          </button>
        ) : null}
      </div>
    </div>
  )
}
