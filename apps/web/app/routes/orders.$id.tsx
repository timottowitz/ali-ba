import { createFileRoute, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/orders/$id')({
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { id } = useParams({ from: '/orders/$id' })
  const order = useQuery(api.orders.getOrder, { orderId: id as any })
  const me = useQuery(api.auth.loggedInUser, {})
  const openDispute = useMutation(api.disputes.openDispute)
  const genUpload = useMutation(api.documents.generateUploadUrl)
  const quotes = useQuery(api.logistics.getLogisticsQuotesForOrder, { orderId: id as any })
  const computeQuote = useMutation(api.logistics.computeLogisticsQuote)
  const recordPayment = useMutation(api.orders.recordMilestonePayment)
  const updateStatus = useMutation(api.orders.updateOrderStatus)

  const allowed: Record<string, string[]> = {
    draft: ['pending_payment', 'cancelled'],
    pending_payment: ['paid', 'in_production', 'cancelled', 'disputed'],
    paid: ['in_production', 'disputed'],
    in_production: ['quality_check', 'cancelled', 'disputed'],
    quality_check: ['ready_to_ship', 'in_production', 'disputed'],
    ready_to_ship: ['shipped', 'disputed'],
    shipped: ['in_transit', 'disputed'],
    in_transit: ['customs_clearance', 'delivered', 'disputed'],
    customs_clearance: ['delivered', 'disputed'],
    delivered: ['completed', 'disputed'],
    disputed: ['resolved', 'refunded', 'cancelled', 'completed'],
    completed: [],
    cancelled: [],
    refunded: [],
  }

  if (!order) return <div className="max-w-5xl mx-auto p-6">Loading…</div>

  return (
    <div className="bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">Order</div>
              <h1 className="text-2xl font-semibold text-gray-900">{order.orderNumber}</h1>
              <div className="text-sm text-gray-600 mt-1">Status: <span className="font-medium">{order.status}</span></div>
            </div>
            <div className="text-right text-sm text-gray-500">
              Created {new Date(order.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>Subtotal: <span className="font-medium">{order.currency} ${'{'}order.subtotal.toFixed(2){'}'}</span></div>
            <div>Shipping: <span className="font-medium">{order.currency} ${'{'}order.shippingCost.toFixed(2){'}'}</span></div>
            <div>Tax: <span className="font-medium">{order.currency} ${'{'}order.taxAmount.toFixed(2){'}'}</span></div>
            <div>Total: <span className="font-medium">{order.currency} ${'{'}order.totalAmount.toFixed(2){'}'}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Items</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Product</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Unit</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="py-2">{String(it.productId)}</td>
                  <td className="py-2">{it.quantity}</td>
                  <td className="py-2">${'{'}it.unitPrice.toFixed(2){'}'}</td>
                  <td className="py-2">${'{'}it.totalPrice.toFixed(2){'}'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Trade Assurance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">QC Criteria</div>
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">{JSON.stringify(order.tradeAssurance?.qcCriteria, null, 2)}</pre>
            </div>
            <div>
              <div className="text-gray-600">Delivery Terms</div>
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">{JSON.stringify(order.tradeAssurance?.deliveryTerms, null, 2)}</pre>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-gray-600 mb-2">Payment Milestones</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Phase</th>
                  <th className="py-2">Pct</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Due</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {order.tradeAssurance?.paymentMilestones?.map((m: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2">{m.phase}</td>
                    <td className="py-2">{m.percentage}%</td>
                    <td className="py-2">${'{'}Number(m.amount).toFixed(2){'}'}</td>
                    <td className="py-2">{m.dueDate ? new Date(m.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="py-2">
                      {m.status}
                      {m.paidAt ? ` (at ${'${'}new Date(m.paidAt).toLocaleDateString(){'}'})` : ''}
                      {m.status !== 'paid' && (
                        <button
                          className="ml-2 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          onClick={async () => {
                            try {
                              await recordPayment({ orderId: id as any, milestoneIndex: idx, amountPaid: Number(m.amount) })
                            } catch (e: any) {
                              alert(e?.message || 'Failed to record payment')
                            }
                          }}
                        >Mark Paid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Open Dispute</h2>
          {!me?._id ? (
            <div className="text-sm text-gray-500">Sign in to file a dispute.</div>
          ) : (
            <DisputeForm orderId={id} openDispute={openDispute} genUpload={genUpload} meId={me._id} />
          )}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Status</h2>
          <div className="flex items-center gap-3 text-sm">
            <div>Current: <span className="font-medium">{order.status}</span></div>
            {allowed[order.status]?.length ? (
              <>
                <span className="text-gray-500">→</span>
                {allowed[order.status].map((s) => (
                  <button
                    key={s}
                    className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                    onClick={async () => {
                      try {
                        await updateStatus({ orderId: id as any, nextStatus: s as any })
                      } catch (e: any) {
                        alert(e?.message || 'Failed to update status')
                      }
                    }}
                  >{s}</button>
                ))}
              </>
            ) : (
              <div className="text-gray-500">No forward transitions</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Logistics Quotes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
            <button
              className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 w-fit"
              onClick={async () => {
                try {
                  await computeQuote({
                    orderId: id as any,
                    origin: { city: 'Monterrey', state: 'NL', country: 'MX', postalCode: '64000' },
                    destination: { city: 'Austin', state: 'TX', country: 'US', postalCode: '73301' },
                    cargoType: 'ltl' as any,
                    weight: 500,
                    weightUnit: 'kg' as any,
                    hsCode: '392690',
                    declaredValue: order?.subtotal ?? 10000,
                    currency: order?.currency ?? 'USD',
                  } as any)
                } catch (e: any) {
                  alert(e?.message || 'Failed to compute quote')
                }
              }}
            >Request Quote (demo)</button>
          </div>
          {!quotes ? (
            <div>Loading…</div>
          ) : quotes.length === 0 ? (
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
                {quotes.map((q: any) => (
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

function DisputeForm({ orderId, openDispute, genUpload, meId }: any) {
  const [type, setType] = React.useState<'quality_issue'|'late_delivery'|'wrong_product'|'quantity_mismatch'|'damage_in_transit'|'documentation_issue'|'payment_issue'>('quality_issue')
  const [description, setDescription] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-gray-700 mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-3 py-2 border rounded">
            {['quality_issue','late_delivery','wrong_product','quantity_mismatch','damage_in_transit','documentation_issue','payment_issue'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Evidence (optional)</label>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>
      <div>
        <label className="block text-gray-700 mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded" rows={3} />
      </div>
      <div>
        <button
          className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          onClick={async () => {
            try {
              let evidence: any[] = []
              if (file) {
                const url = await genUpload({} as any)
                const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
                const { storageId } = await res.json()
                evidence = [{ type: 'document', fileId: storageId as any, description: file.name }]
              }
              await openDispute({ orderId: orderId as any, initiatedBy: meId as any, type: type as any, description, evidence } as any)
              alert('Dispute filed')
            } catch (e: any) {
              alert(e?.message || 'Failed to file dispute')
            }
          }}
        >Submit Dispute</button>
      </div>
    </div>
  )
}
