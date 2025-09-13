import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/search/semantic')({
  component: SemanticSearchPage,
})

function SemanticSearchPage() {
  const params = useSearch({ from: '/search/semantic' }) as any
  const navigate = useNavigate()
  const [q, setQ] = useState<string>(params?.q ?? '')
  const [limit, setLimit] = useState<number>(params?.limit ? Number(params.limit) : 24)
  const results = useQuery(api.search.hybridSearchProducts, q ? { query: q, limit } : 'skip' as any)

  useEffect(() => {
    setQ(params?.q ?? '')
    setLimit(params?.limit ? Number(params.limit) : 24)
  }, [params])

  const apply = (patch: any) => {
    navigate({ to: '/search/semantic', search: { q: q || undefined, limit, ...patch } })
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg border p-4 flex items-center gap-2">
          <input
            className="flex-1 px-3 py-2 border rounded"
            placeholder="Semantic search products…"
            value={q}
            onChange={e => { setQ(e.target.value); apply({ q: e.target.value || undefined }) }}
          />
          <select className="px-3 py-2 border rounded" value={String(limit)} onChange={e => { const v = Number(e.target.value); setLimit(v); apply({ limit: v }) }}>
            {[12,24,36,48].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!results ? (
            Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-32 bg-white border rounded animate-pulse" />)
          ) : results.length === 0 ? (
            <div className="text-sm text-gray-500">No results</div>
          ) : (
            results.map((p: any) => (
              <Link key={p._id} to={`/products/${p._id}`} className="border rounded p-3 bg-white hover:shadow">
                <div className="font-medium truncate">{p.title?.en || p.name || 'Product'}</div>
                <div className="text-xs text-gray-500 mt-1">MOQ: {p.minOrderQuantity} {p.moqUnit}</div>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  {(p.supplier?.verificationStatus === 'verified' || p.supplier?.verificationStatus === 'gold_verified') && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded font-medium bg-green-50 text-green-700 border border-green-200">Verified</span>
                  )}
                  {(p.supplier?.badges || []).includes('trade_assurance') && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-700 border border-blue-200">Assurance</span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

