import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/rfq')({
  component: RfqListPage,
})

function RfqListPage() {
  const s = useSearch({ from: '/rfq' }) as any
  const navigate = useNavigate()
  const [q, setQ] = useState<string>(s?.q ?? '')
  const [categoryId, setCategoryId] = useState<string>(s?.categoryId ?? '')
  const [minQty, setMinQty] = useState<string>(s?.minQty ?? '')
  const [maxQty, setMaxQty] = useState<string>(s?.maxQty ?? '')
  const [incoterm, setIncoterm] = useState<string>(s?.incoterm ?? '')
  const [sort, setSort] = useState<'expires'|'newest'>(s?.sort ?? 'expires')
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const apply = (patch: any) => {
    navigate({ to: '/rfq', search: { q: q || undefined, categoryId: categoryId || undefined, minQty: minQty || undefined, maxQty: maxQty || undefined, incoterm: incoterm || undefined, sort, ...patch } })
  }

  useEffect(() => {
    setQ(s?.q ?? '')
    setCategoryId(s?.categoryId ?? '')
    setMinQty(s?.minQty ?? '')
    setMaxQty(s?.maxQty ?? '')
    setIncoterm(s?.incoterm ?? '')
    setSort(s?.sort ?? 'expires')
  }, [s])

  const rfqs = useQuery(api.rfqs.listOpenPaged, {
    paginationOpts: { numItems: 20, cursor },
    categoryId: categoryId || undefined,
    minQuantity: minQty ? Number(minQty) : undefined,
    maxQuantity: maxQty ? Number(maxQty) : undefined,
    incoterm: incoterm || undefined,
    sortBy: sort,
    query: q || undefined,
  } as any)

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white border rounded p-4 grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
          <input className="px-3 py-2 border rounded md:col-span-2" placeholder="Search RFQs…" value={q} onChange={e => { setQ(e.target.value); apply({ q: e.target.value || undefined }) }} />
          <input className="px-3 py-2 border rounded" placeholder="Category ID" value={categoryId} onChange={e => { setCategoryId(e.target.value); apply({ categoryId: e.target.value || undefined }) }} />
          <input className="px-3 py-2 border rounded" placeholder="Min qty" value={minQty} onChange={e => { setMinQty(e.target.value); apply({ minQty: e.target.value || undefined }) }} />
          <input className="px-3 py-2 border rounded" placeholder="Max qty" value={maxQty} onChange={e => { setMaxQty(e.target.value); apply({ maxQty: e.target.value || undefined }) }} />
          <select className="px-3 py-2 border rounded" value={incoterm} onChange={e => { setIncoterm(e.target.value); apply({ incoterm: e.target.value || undefined }) }}>
            <option value="">Incoterm</option>
            {['EXW','FOB','CIF','DDP','DAP'].map(it => <option key={it} value={it}>{it}</option>)}
          </select>
          <select className="px-3 py-2 border rounded" value={sort} onChange={e => { setSort(e.target.value as any); apply({ sort: e.target.value }) }}>
            <option value="expires">Expiring Soon</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {!rfqs ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-white border rounded animate-pulse" />)}
          </div>
        ) : rfqs.page.length === 0 ? (
          <div className="text-sm text-gray-500">No RFQs found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rfqs.page.map((r: any) => (
              <div key={r.rfq._id} className="bg-white border rounded p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{r.rfq.title}</div>
                  <div className="text-xs text-gray-500">Due {new Date(r.rfq.expiresAt).toLocaleDateString()}</div>
                </div>
                <div className="text-sm text-gray-600 mt-1">Qty {r.rfq.quantity} {r.rfq.unit} · {r.rfq.currency} · {r.rfq.incoterm}</div>
                <div className="text-xs text-gray-500">Category: {String(r.category?._id).slice(0,6)}… Quotes: {r.quotesCount}</div>
              </div>
            ))}
          </div>
        )}

        {rfqs && !rfqs.isDone && (
          <div className="text-center">
            <button onClick={() => setCursor(rfqs.continueCursor)} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">Load More</button>
          </div>
        )}
      </div>
    </div>
  )
}

