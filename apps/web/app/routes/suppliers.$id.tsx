import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import React, { useState } from 'react'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/suppliers/$id')({
  component: SupplierPage,
})

function SupplierPage() {
  const { id } = useParams({ from: '/suppliers/$id' })
  const supplier = useQuery(api.suppliers.getSupplierProfile, { supplierId: id as any })
  const products = useQuery(api.products.getSupplierProducts, { supplierId: id as any, limit: 12 })
  const me = useQuery(api.auth.loggedInUser, {})
  const genUploadUrl = useMutation(api.documents.generateUploadUrl)
  const uploadDoc = useMutation(api.documents.uploadDocument)
  const addCert = useMutation(api.suppliers.addSupplierCertification)
  
  // Local state for certificate upload
  const [docType, setDocType] = useState('iso_certificate')
  const [issuedDate, setIssuedDate] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)

  if (!supplier) return <div className="max-w-7xl mx-auto p-6">Loading…</div>

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{supplier.companyName}</h1>
              <div className="text-sm text-gray-600">{supplier.location} · {supplier.country}</div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {supplier.badges?.map((b: string) => (
                  <span key={b} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">{b}</span>
                ))}
              </div>
            </div>
            <div className="space-y-2 w-48">
              <Link to={`/rfq/new`} search={{ invited: id }} className="block text-center w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">Start Bulk RFQ</Link>
              <Link to={`/inquiries`} className="block text-center w-full px-4 py-2 bg-white border rounded hover:bg-gray-50">Contact Supplier</Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>Verification: <span className="font-medium">{supplier.verificationStatus}</span></div>
            <div>Response rate: <span className="font-medium">{supplier.responseRate}%</span></div>
            <div>Avg response time: <span className="font-medium">{supplier.responseTime}h</span></div>
            <div>On‑time delivery: <span className="font-medium">{supplier.onTimeDeliveryRate}%</span></div>
            <div>Transactions: <span className="font-medium">{supplier.totalTransactions}</span></div>
            <div>Service rating: <span className="font-medium">{supplier.serviceRating}/5</span></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Certificates & Compliance</h2>
          {supplier.certifications?.length ? (
            <ul className="divide-y">
              {supplier.certifications.map((c: any, idx: number) => (
                <CertItem key={idx} cert={c} />
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500">No certifications uploaded</div>
          )}
          <div className="mt-6 border-t pt-4">
            <h3 className="font-medium mb-2">Upload certificate</h3>
            {!me?._id && <div className="text-xs text-gray-500 mb-2">Sign in to upload documents.</div>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full px-3 py-2 border rounded">
                  {['iso_certificate','quality_certification','usmca_certificate','nom_certificate','test_report','other'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Issued Date</label>
                <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full" />
              </div>
            </div>
            <div className="pt-3">
              <button
                disabled={!me?._id || !file}
                onClick={async () => {
                  if (!me?._id || !file) return
                  try {
                    const url = await genUploadUrl({} as any)
                    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
                    const { storageId } = await res.json()
                    const docId = await uploadDoc({
                      ownerType: 'supplier' as any,
                      ownerId: id as any,
                      uploadedBy: me._id as any,
                      fileId: storageId,
                      fileName: file.name,
                      fileType: file.type,
                      fileSize: file.size,
                      documentType: docType,
                      issuedDate: issuedDate ? new Date(issuedDate).getTime() : undefined,
                    } as any)
                    await addCert({
                      supplierId: id as any,
                      type: docType,
                      documentId: docId as any,
                      issuedDate: issuedDate ? new Date(issuedDate).getTime() : undefined,
                    } as any)
                    alert('Certificate uploaded')
                  } catch (e: any) {
                    alert(e?.message || 'Upload failed')
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Upload
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Reviews</h2>
          {supplier.recentReviews?.length ? (
            <ul className="divide-y">
              {supplier.recentReviews.map((r: any) => (
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
            <div className="text-sm text-gray-500">No reviews yet</div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products?.map((p: any) => (
              <Link key={p._id} to={`/products/${p._id}`} className="border rounded p-4 hover:shadow">
                <div className="font-medium">{p.title?.en || 'Product'}</div>
                <div className="text-sm text-gray-500">MOQ: {p.minOrderQuantity} {p.moqUnit}</div>
              </Link>
            ))}
            {!products?.length && <div className="text-sm text-gray-500">No products yet</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function CertItem({ cert }: { cert: any }) {
  const url = useQuery(api.documents.getDocumentUrl, cert?.document?._id ? { documentId: cert.document._id as any } : 'skip' as any)
  return (
    <li className="py-2 flex items-center justify-between text-sm">
      <div>
        <div className="font-medium">{cert.type}</div>
        {cert.document && (
          <div className="text-gray-500">
            {cert.document.fileName}
            {url && (
              <a href={url} target="_blank" rel="noreferrer" className="ml-2 text-orange-600 hover:underline">Download</a>
            )}
          </div>
        )}
      </div>
      {cert.issuedDate && <div className="text-gray-500">Issued: {new Date(cert.issuedDate).toLocaleDateString()}</div>}
    </li>
  )
}
