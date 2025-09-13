import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/rfq/$id')({
  component: RfqDetailPage,
})

function RfqDetailPage() {
  const { id } = useParams({ from: '/rfq/$id' })
  const navigate = useNavigate()
  const details = useQuery(api.rfqs.getRFQDetails, { rfqId: id as any })
  const me = useQuery(api.auth.loggedInUser, {})
  const [sortBy, setSortBy] = useState<'price_low'|'price_high'|'lead_time'|'response_time'|undefined>('price_low')
  const quotes = useQuery(api.rfqs.getRFQQuotes, sortBy ? { rfqId: id as any, sortBy } : { rfqId: id as any })
  const accept = useMutation(api.rfqs.acceptQuote)
  const lq = useQuery(api.logistics.getLogisticsQuotesForRfq, { rfqId: id as any })
  const computeLq = useMutation(api.logistics.computeLogisticsQuote)
  const [selected, setSelected] = useState<string[]>([])
  const [compare, setCompare] = useState<any | null>(null)
  const doCompare = async () => {
    try {
      if (selected.length < 2 || selected.length > 4) { alert('Select 2-4 quotes'); return }
      const rfqDetails = details
      const qty = rfqDetails?.rfq?.quantity || 100
      const res = await (api as any).rfqs.compareQuotes({ quoteIds: selected as any, rfqQuantity: qty })
      setCompare(res)
    } catch (e: any) {
      alert(e?.message || 'Compare failed')
    }
  }

  if (!details) return <div className="max-w-6xl mx-auto p-6">Loading…</div>

  const { rfq, buyer, category } = details

  return (
    <div className="bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">RFQ</div>
              <h1 className="text-2xl font-semibold text-gray-900">{rfq.title}</h1>
              <div className="text-sm text-gray-600 mt-1">{category?.name?.en} · Qty {rfq.quantity} {rfq.unit} · {rfq.currency} · {rfq.incoterm}</div>
            </div>
            <div className="text-sm text-gray-500">
              Due by {new Date(rfq.expiresAt).toLocaleDateString()}
            </div>
          </div>
          <div className="mt-4 text-gray-700 whitespace-pre-wrap">{rfq.description}</div>
          <div className="mt-4">
            <h3 className="font-medium">Specs</h3>
            <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">{JSON.stringify(rfq.specifications, null, 2)}</pre>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Quotes</h2>
            <div className="text-sm">
              <label className="mr-2 text-gray-600">Sort:</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-2 py-1 border rounded">
                <option value="price_low">Lowest Price</option>
                <option value="price_high">Highest Price</option>
                <option value="lead_time">Lead Time</option>
                <option value="response_time">Response Time</option>
              </select>
            </div>
          </div>

          {!quotes ? (
            <div>Loading quotes…</div>
          ) : quotes.quotes.length === 0 ? (
            <div className="text-sm text-gray-500">No quotes yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotes.quotes.map((q: any) => (
                <div key={q.quoteId} className="border rounded p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700 flex items-center gap-2">
                      <input type="checkbox" checked={selected.includes(q.quoteId)} onChange={(e) => {
                        setSelected(prev => e.target.checked ? [...prev, q.quoteId] : prev.filter(id => id !== q.quoteId))
                      }} /> Select
                    </label>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{q.supplier?.name || 'Supplier'}</div>
                    <div className="text-sm text-gray-500">{q.terms.leadTime} days</div>
                  </div>
                  <div className="text-sm text-gray-600">{q.supplier?.country} · {q.supplier?.verificationStatus}</div>
                  <div className="mt-3 text-orange-600 font-semibold">${'{'}q.pricing.totalPrice.toFixed(2){'}'} total</div>
                  <div className="text-sm text-gray-600">Unit: ${'{'}q.pricing.unitPrice.toFixed(2){'}'}</div>
                  <div className="mt-3 text-sm">
                    <div>Incoterm: <span className="font-medium">{q.terms.incoterm}</span></div>
                    <div>Payment: <span className="font-medium">{q.terms.paymentTerms}</span></div>
                    <div>Validity: <span className="font-medium">{q.terms.validityPeriod} days</span></div>
                  </div>
                  <div className="pt-3">
                    <button
                      disabled={!me?._id}
                      onClick={async () => {
                        if (!me?._id) { alert('Sign in required'); return }
                        try {
                          const orderId = await accept({ quoteId: q.quoteId as any, buyerId: me._id as any })
                          navigate({ to: `/orders/${orderId}` })
                        } catch (e: any) {
                          alert(e?.message || 'Failed to accept quote')
                        }
                      }}
                      className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                    >
                      Accept Quote
                    </button>
                  </div>
                </div>
              ))}
              <div className="md:col-span-2">
                <button onClick={doCompare} className="px-3 py-2 bg-white border rounded hover:bg-gray-50 text-sm">Compare Selected</button>
              </div>
            </div>
          )}
        </div>

        {compare && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-3">Comparison</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Supplier</th>
                    <th className="py-2">Unit Price</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Lead Time</th>
                    <th className="py-2">Incoterm</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.quotes.map((c: any) => (
                    <tr key={c.quoteId} className="border-t">
                      <td className="py-2">{c.supplier?.name || 'Supplier'}</td>
                      <td className="py-2">${'{'}c.pricing.unitPrice.toFixed(2){'}'}</td>
                      <td className="py-2">${'{'}c.pricing.totalPrice.toFixed(2){'}'}</td>
                      <td className="py-2">{c.terms.leadTime} d</td>
                      <td className="py-2">{c.terms.incoterm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Logistics Quotes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
            <button
              className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 w-fit"
              onClick={async () => {
                try {
                  await computeLq({
                    rfqId: id as any,
                    origin: { city: 'Monterrey', state: 'NL', country: 'MX', postalCode: '64000' },
                    destination: { city: 'Austin', state: 'TX', country: 'US', postalCode: '73301' },
                    cargoType: 'ltl' as any,
                    weight: 500,
                    weightUnit: 'kg' as any,
                    hsCode: '392690',
                    declaredValue: 10000,
                    currency: 'USD',
                  } as any)
                } catch (e: any) {
                  alert(e?.message || 'Failed to compute quote')
                }
              }}
            >Request Quote (demo)</button>
          </div>
          {!lq ? (
            <div>Loading…</div>
          ) : lq.length === 0 ? (
            <div className="text-sm text-gray-500">No quotes yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Carrier</th>
                  <th className="py-2">Service</th>
                  <th className="py-2">Transit</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Landed Total</th>
                </tr>
              </thead>
              <tbody>
                {lq.map((q: any) => (
                  q.carriers.map((c: any, idx: number) => (
                    <tr key={q._id + '_' + idx} className="border-t">
                      <td className="py-2">{c.name}</td>
                      <td className="py-2">{c.service}</td>
                      <td className="py-2">{c.transitTime} d</td>
                      <td className="py-2">{q.currency || 'USD'} ${'{'}c.price.toFixed(2){'}'}</td>
                      <td className="py-2">{q.currency || 'USD'} ${'{'}q.landedCost?.total?.toFixed(2) ?? '—'{'}'}</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
