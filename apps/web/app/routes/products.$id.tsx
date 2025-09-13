import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import React from 'react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/products/$id')({
  component: ProductDetailPage,
})

function ProductDetailPage() {
  const { id } = useParams({ from: '/products/$id' })
  const data = useQuery(api.products.getProductDetail, { productId: id as any })
  const me = useQuery(api.auth.loggedInUser, {})

  const startOrder = useMutation(api.products.startOrderFromProduct)
  const requestSample = useMutation(api.products.createSampleRequest)
  const questions = useQuery(api.qa.listProductQuestions, { productId: id as any })
  const askQuestion = useMutation(api.qa.askProductQuestion)
  const similarProducts = useQuery(api.search.hybridSearchProducts, product ? {
    query: (product.title?.en || '').slice(0, 128),
    categoryId: product.categoryId as any,
    limit: 6,
  } : 'skip' as any)
  const similarSuppliers = useQuery(api.search.hybridSearchSuppliers, supplier ? {
    query: (product.title?.en || '').slice(0, 128),
    country: supplier.country as any,
    excludeId: supplier._id as any,
    limit: 6,
  } : 'skip' as any)

  const [quantity, setQuantity] = useState<number>(100)
  const [incoterm, setIncoterm] = useState<'EXW'|'FOB'|'CIF'|'DDP'|'DAP'>('FOB')
  const [shippingMethod, setShippingMethod] = useState<'air'|'sea'|'land'>('sea')
  const [currency, setCurrency] = useState<'USD'|'MXN'>( 'USD')
  const fx = 17.0 // demo FX

  if (!data) {
    return <div className="max-w-7xl mx-auto p-6">Loading…</div>
  }

  const { product, supplier } = data

  const handleStartOrder = async () => {
    if (!me?._id) {
      alert('Please sign in to start an order')
      return
    }
    try {
      const orderId = await startOrder({
        productId: product._id as any,
        buyerId: me._id as any,
        quantity,
        incoterm,
        shippingMethod,
      })
      alert(`Order created: ${orderId}`)
    } catch (e: any) {
      alert(e?.message || 'Failed to start order')
    }
  }

  const handleRequestSample = async () => {
    if (!me?._id) {
      alert('Please sign in to request a sample')
      return
    }
    try {
      const srId = await requestSample({
        productId: product._id as any,
        buyerId: me._id as any,
        quantity: 1,
        shippingAddress: {
          name: 'Sample Recipient',
          city: 'Austin', state: 'TX', country: 'USA',
          addressLine1: '123 Main St', postalCode: '73301', phone: '+1-555-0100'
        } as any,
      })
      alert(`Sample request created: ${srId}`)
    } catch (e: any) {
      alert(e?.message || 'Failed to request sample')
    }
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">{product.title?.en || 'Product'}</h1>
              <div className="text-gray-600">{product.description?.en}</div>
            </div>

            {product.imageUrls?.length ? (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {product.imageUrls.map((url: string, idx: number) => (
                    <img key={idx} src={url} className="w-full h-48 object-cover rounded" />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold mb-4">Pricing & MOQ</h2>
                <div className="text-sm text-gray-600">
                  Currency:
                  <select className="ml-2 border rounded px-2 py-1" value={currency} onChange={e => setCurrency(e.target.value as any)}>
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                  </select>
                  <span className="ml-3 text-xs text-gray-500">(fx ~{fx})</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Quantity</th>
                    <th className="py-2">Unit Price</th>
                    <th className="py-2">Currency</th>
                    <th className="py-2">Terms</th>
                  </tr>
                </thead>
                <tbody>
                  {product.pricingTiers?.map((t: any, i: number) => {
                    const price = t.currency === currency ? t.price : currency === 'USD' ? t.price / fx : t.price * fx
                    const dispCurrency = currency
                    return (
                    <tr key={i} className="border-t">
                      <td className="py-2">{t.minQuantity} - {t.maxQuantity ?? '∞'}</td>
                      <td className="py-2">${'{'}price.toFixed(2){'}'}</td>
                      <td className="py-2">{dispCurrency}</td>
                      <td className="py-2">{t.priceType}</td>
                    </tr>
                    )})}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Specs</h2>
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">{JSON.stringify(product.specifications, null, 2)}</pre>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Compliance & Documents</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium mb-1">Product Certifications</div>
                  {product.certifications?.length ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {product.certifications.map((c: any, idx: number) => (
                        <ProductDocItem key={idx} doc={c.document} label={c.type} />
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">No product certifications uploaded</div>
                  )}
                </div>
                <div>
                  <div className="font-medium mb-1">Test Reports</div>
                  {data.product.testReports?.length ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {data.product.testReports.map((tr: any, idx: number) => (
                        <ProductDocItem key={idx} doc={tr} label={tr.documentType || 'test_report'} />
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">No test reports</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Product Reviews</h2>
              {data.reviews?.length ? (
                <ul className="divide-y">
                  {data.reviews.map((r: any) => (
                    <li key={r._id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{r.title || 'Review'}</div>
                        <div className="text-sm text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-sm text-gray-600">Rating: {r.overallRating}/5</div>
                      <div className="text-sm text-gray-700 mt-1">{r.comment}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500">No product reviews yet</div>
              )}
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Q&A</h2>
              <AskQuestion productId={id as any} askQuestion={askQuestion} />
              <div className="mt-4">
                {questions?.length ? (
                  <ul className="divide-y">
                    {questions.map((q: any) => (
                      <li key={q._id} className="py-3">
                        <div className="text-sm"><span className="font-medium">Q:</span> {q.question}</div>
                        {q.answer ? (
                          <div className="text-sm text-gray-700 mt-1"><span className="font-medium">A:</span> {q.answer}</div>
                        ) : (
                          <div className="text-xs text-gray-500">Awaiting answer</div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No questions yet</div>
                )}
              </div>
            </div>

            {similarProducts && similarProducts.length > 0 && (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Similar Products</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {similarProducts.map((p: any) => {
                    const prices = (p.pricingTiers || []).map((t: any) => t.price).filter((n: number) => typeof n === 'number');
                    const minPrice = prices.length ? Math.min(...prices) : undefined;
                    const hasAssurance = (p.supplier?.badges || []).includes('trade_assurance');
                    const verified = p.supplier?.verificationStatus === 'verified' || p.supplier?.verificationStatus === 'gold_verified';
                    return (
                      <Link key={p._id} to={`/products/${p._id}`} className="border rounded p-3 hover:shadow">
                        <div className="font-medium truncate">{p.title?.en || p.name || 'Product'}</div>
                        <div className="text-xs text-gray-500 mt-1">MOQ: {p.minOrderQuantity} {p.moqUnit}</div>
                        <div className="text-sm text-orange-600 mt-1">{minPrice != null ? `$${minPrice.toFixed(2)}` : '—'}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {verified && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">Verified</span>}
                          {hasAssurance && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Assurance</span>}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {similarSuppliers && similarSuppliers.length > 0 && (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Similar Suppliers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {similarSuppliers.map((s: any) => (
                    <Link key={s._id} to={`/suppliers/${s._id}`} className="border rounded p-3 hover:shadow">
                      <div className="font-medium truncate">{s.companyName}</div>
                      <div className="text-xs text-gray-500 mt-1">{s.country} · {s.verificationStatus}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="text-sm text-gray-500 mb-1">Supplier</div>
              <div className="text-lg font-semibold">{supplier.companyName}</div>
              <div className="text-sm text-gray-600">{supplier.location} · {supplier.country}</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>Verified: <span className="font-medium">{supplier.verificationStatus}</span></div>
                <div>Response rate: <span className="font-medium">{supplier.responseRate}%</span></div>
                <div>On‑time delivery: <span className="font-medium">{supplier.onTimeDeliveryRate}%</span></div>
                <div>Rating: <span className="font-medium">{supplier.serviceRating}/5</span></div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Quantity</label>
                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value || '0'))} className="w-full px-3 py-2 border rounded" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Incoterm</label>
                  <select value={incoterm} onChange={e => setIncoterm(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                    {['EXW','FOB','CIF','DDP','DAP'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Shipping</label>
                  <select value={shippingMethod} onChange={e => setShippingMethod(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                    {['sea','air','land'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleStartOrder} className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">Start Order</button>
              <button onClick={handleRequestSample} className="w-full px-4 py-2 bg-white border rounded hover:bg-gray-50">Request Sample</button>
              <Link to={`/rfq/new`} search={{ productId: id }} className="block text-center w-full px-4 py-2 bg-white border rounded hover:bg-gray-50">Start RFQ</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductDocItem({ doc, label }: { doc: any, label: string }) {
  const url = useQuery(api.documents.getDocumentUrl, doc?._id ? { documentId: doc._id as any } : 'skip' as any)
  return (
    <li>
      <span className="font-medium">{label}:</span> {doc?.fileName || '(document)'}
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="ml-2 text-orange-600 hover:underline">Download</a>
      )}
    </li>
  )
}

function AskQuestion({ productId, askQuestion }: any) {
  const me = useQuery(api.auth.loggedInUser, {})
  const [text, setText] = React.useState('')
  return (
    <div className="text-sm">
      {!me?._id ? (
        <div className="text-gray-500">Sign in to ask a question.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="md:col-span-3 px-3 py-2 border rounded" placeholder="Ask a question about this product" value={text} onChange={e => setText(e.target.value)} />
          <button
            className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            onClick={async () => {
              try {
                if (!text.trim()) return
                await askQuestion({ productId, askerId: me._id as any, question: text } as any)
                setText('')
              } catch (e: any) {
                alert(e?.message || 'Failed to submit question')
              }
            }}
          >Submit</button>
        </div>
      )}
    </div>
  )
}
