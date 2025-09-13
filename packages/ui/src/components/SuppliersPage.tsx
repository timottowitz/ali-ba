import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Header } from './Header'
import { SupplierGrid } from './SupplierGrid'
import { SearchBar } from './SearchBar'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Link } from '@tanstack/react-router'

export function SuppliersPage() {
  const routeSearch = useSearch({ from: '/suppliers' }) as any
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState(routeSearch?.q ?? '')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [minResponse, setMinResponse] = useState('')
  const [langEn, setLangEn] = useState(true)
  const [langEs, setLangEs] = useState(true)
  const [stateFilter, setStateFilter] = useState('')
  const [certFilter, setCertFilter] = useState('')
  const [sortBy, setSortBy] = useState<'default'|'trust_score'|'response_rate'|'service_rating'>(routeSearch?.sort ?? 'default')
  const [searchIn, setSearchIn] = useState<'name'|'description'|'description_es'>(routeSearch?.searchIn ?? 'name')
  const [capabilities, setCapabilities] = useState<{[k: string]: boolean}>({ oem: false, odm: false, custom_packaging: false, private_label: false })
  const [minOnTime, setMinOnTime] = useState<string>(routeSearch?.minOnTime ?? '')
  const [minService, setMinService] = useState<string>(routeSearch?.minService ?? '')

  useEffect(() => {
    setSearchQuery(routeSearch?.q ?? '')
    setVerifiedOnly(!!routeSearch?.verified)
    setMinResponse(routeSearch?.minResponse ?? '')
    setLangEn(routeSearch?.langEn ?? true)
    setLangEs(routeSearch?.langEs ?? true)
    setStateFilter(routeSearch?.state ?? '')
    setCertFilter(routeSearch?.cert ?? '')
    setSortBy(routeSearch?.sort ?? 'default')
    setSearchIn(routeSearch?.searchIn ?? 'name')
    setMinOnTime(routeSearch?.minOnTime ?? '')
    setMinService(routeSearch?.minService ?? '')
    // Parse caps CSV into state
    const caps = (routeSearch?.caps as string | undefined)?.split(',').filter(Boolean) || []
    setCapabilities({
      oem: caps.includes('oem'),
      odm: caps.includes('odm'),
      custom_packaging: caps.includes('custom_packaging'),
      private_label: caps.includes('private_label')
    })
  }, [routeSearch])

  const updateSearch = (patch: any) => {
    const capsCsv = Object.entries(capabilities).filter(([k, v]) => v).map(([k]) => k).join(',') || undefined
    const next = {
      q: searchQuery || undefined,
      verified: verifiedOnly || undefined,
      minResponse: minResponse || undefined,
      langEn: langEn || undefined,
      langEs: langEs || undefined,
      state: stateFilter || undefined,
      cert: certFilter || undefined,
      sort: sortBy || undefined,
      searchIn: searchIn || undefined,
      minOnTime: minOnTime || undefined,
      minService: minService || undefined,
      caps: capsCsv,
      ...patch,
    }
    navigate({ to: '/suppliers', search: next })
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header activeTab="suppliers" onTabChange={() => {}} />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
          {/* Quick picks for demo supplier */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">Quick Picks</div>
            <div className="flex gap-2">
              <Link
                to="/suppliers"
                search={{ q: 'screw', state: 'SON', verified: true }}
                className="px-3 py-1.5 rounded-full text-sm bg-orange-100 text-orange-800 hover:bg-orange-200"
              >
                Sonora Screw Manufacturers
              </Link>
            </div>
          </div>
          <div className="mb-6">
            <SearchBar
              value={searchQuery}
              onChange={(v) => { setSearchQuery(v); updateSearch({ q: v || undefined }) }}
              placeholder="Search suppliers..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={verifiedOnly} onChange={e => { setVerifiedOnly(e.target.checked); updateSearch({ verified: e.target.checked || undefined }) }} /> Verified</label>
              <input className="px-3 py-2 border rounded w-28" placeholder="Min resp %" value={minResponse} onChange={e => { setMinResponse(e.target.value); updateSearch({ minResponse: e.target.value || undefined }) }} />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={langEn} onChange={e => { setLangEn(e.target.checked); updateSearch({ langEn: e.target.checked || undefined }) }} /> EN</label>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={langEs} onChange={e => { setLangEs(e.target.checked); updateSearch({ langEs: e.target.checked || undefined }) }} /> ES</label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input className="px-3 py-2 border rounded" placeholder="State (MX)" value={stateFilter} onChange={e => { setStateFilter(e.target.value); updateSearch({ state: e.target.value || undefined }) }} />
              <input className="px-3 py-2 border rounded" placeholder="Cert (e.g. NOM)" value={certFilter} onChange={e => { setCertFilter(e.target.value); updateSearch({ cert: e.target.value || undefined }) }} />
              <select className="px-3 py-2 border rounded" value={sortBy} onChange={e => { setSortBy(e.target.value as any); updateSearch({ sort: e.target.value }) }}>
                <option value="default">Sort: Default</option>
                <option value="trust_score">Trust</option>
                <option value="response_rate">Response Rate</option>
                <option value="service_rating">Service Rating</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select className="px-3 py-2 border rounded" value={searchIn} onChange={e => { setSearchIn(e.target.value as any); updateSearch({ searchIn: e.target.value }) }}>
                <option value="name">Search in: Name</option>
                <option value="description">Description (EN)</option>
                <option value="description_es">Description (ES)</option>
              </select>
              <input className="px-3 py-2 border rounded" placeholder="Min on-time %" value={minOnTime} onChange={e => { setMinOnTime(e.target.value); updateSearch({ minOnTime: e.target.value || undefined }) }} />
              <input className="px-3 py-2 border rounded" placeholder="Min service ★" value={minService} onChange={e => { setMinService(e.target.value); updateSearch({ minService: e.target.value || undefined }) }} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {['oem','odm','custom_packaging','private_label'].map(k => (
                <label key={k} className="flex items-center gap-1">
                  <input type="checkbox" checked={!!capabilities[k]} onChange={e => { const v = { ...capabilities, [k]: e.target.checked }; setCapabilities(v); updateSearch({}) }} /> {k.replace('_',' ')}
                </label>
              ))}
            </div>
          </div>

          <SupplierGrid 
            searchQuery={searchQuery}
            verifiedOnly={verifiedOnly}
            minResponseRate={minResponse ? Number(minResponse) : undefined}
            languages={[langEn && 'en', langEs && 'es'].filter(Boolean) as string[]}
            stateFilter={stateFilter || undefined}
            certFilter={certFilter || undefined}
            sortBy={sortBy}
            searchIn={searchIn}
            minOnTimeDeliveryRate={minOnTime ? Number(minOnTime) : undefined}
            minServiceRating={minService ? Number(minService) : undefined}
            capabilities={Object.entries(capabilities).filter(([k,v]) => v).map(([k]) => k)}
          />
          </div>
          <aside className="space-y-6">
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-500">Recommended</div>
              <h2 className="text-lg font-semibold mb-3">Top Trusted</h2>
              <RecommendedSuppliers query={searchQuery} state={stateFilter} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function RecommendedSuppliers({ query, state }: { query: string; state: string }) {
  const rec = useQuery(api.suppliers.searchSuppliersPaged, {
    query: query || undefined,
    searchIn: 'name' as any,
    paginationOpts: { numItems: 6 },
    verificationStatus: ['verified','gold_verified'] as any,
    state: state || undefined,
    sortBy: 'trust_score' as any,
  } as any)
  if (!rec) return <div className="text-sm text-gray-500">Loading…</div>
  if (!rec.page || rec.page.length === 0) return <div className="text-sm text-gray-500">No suggestions</div>
  return (
    <ul className="space-y-2">
      {rec.page.map((s: any) => (
        <li key={s._id} className="text-sm">
          <Link to={`/suppliers/${s._id}`} className="block hover:underline">
            <div className="font-medium truncate">{s.companyName}</div>
            <div className="text-gray-500">{s.country} · {s.verificationStatus}</div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
