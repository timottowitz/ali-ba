import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/admin/verify')({
  component: AdminVerifyPage,
})

function AdminVerifyPage() {
  const pending = useQuery(api.documents.listPendingDocuments, {})
  const verifyDoc = useMutation(api.documents.verifyDocument)
  const setSupplierStatus = useMutation(api.suppliers.setSupplierVerificationStatus)

  if (!pending) return <div className="max-w-5xl mx-auto p-6">Loading…</div>

  return (
    <div className="bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h1 className="text-2xl font-semibold">Admin: Verify Documents</h1>
          <div className="text-sm text-gray-600">Pending documents: {pending.length}</div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Owner</th>
                <th className="py-2">Type</th>
                <th className="py-2">File</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((d: any) => (
                <tr key={d._id} className="border-t">
                  <td className="py-2">{d.ownerType}:{String(d.ownerId).slice(0,6)}</td>
                  <td className="py-2">{d.documentType}</td>
                  <td className="py-2">{d.fileName} ({Math.round(d.fileSize/1024)} KB)</td>
                  <td className="py-2 space-x-2">
                    <button
                      onClick={() => verifyDoc({ documentId: d._id as any, verifierUserId: d.uploadedBy as any, status: 'verified' as any })}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >Verify</button>
                    <button
                      onClick={() => verifyDoc({ documentId: d._id as any, verifierUserId: d.uploadedBy as any, status: 'rejected' as any })}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >Reject</button>
                    {d.ownerType === 'supplier' && (
                      <button
                        onClick={() => setSupplierStatus({ supplierId: d.ownerId as any, status: 'verified' as any })}
                        className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                      >Mark Supplier Verified</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

