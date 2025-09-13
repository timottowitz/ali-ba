import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/disputes/$id')({
  component: DisputeDetailPage,
})

function DisputeDetailPage() {
  const { id } = useParams({ from: '/disputes/$id' })
  const dispute = useQuery(api.disputes.getDispute, { disputeId: id as any })

  if (!dispute) return <div className="max-w-4xl mx-auto p-6">Loading…</div>

  return (
    <div className="bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-500">Dispute</div>
          <h1 className="text-2xl font-semibold text-gray-900">{String(dispute._id)}</h1>
          <div className="mt-2 text-sm text-gray-600">Type: {dispute.type} · Status: <span className="font-medium">{dispute.status}</span></div>
          <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{dispute.description}</div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Evidence</h2>
          {dispute.evidence?.length ? (
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {dispute.evidence.map((e: any, idx: number) => (
                <li key={idx}>{e.type}: {String(e.fileId).slice(0,8)}… — {e.description}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500">No evidence attached</div>
          )}
        </div>

        {dispute.resolution && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-3">Resolution</h2>
            <div className="text-sm">Type: {dispute.resolution.type}</div>
            {dispute.resolution.amount != null && <div className="text-sm">Amount: ${'{'}dispute.resolution.amount.toFixed(2){'}'}</div>}
            <div className="text-sm mt-1 whitespace-pre-wrap">{dispute.resolution.notes}</div>
          </div>
        )}
      </div>
    </div>
  )
}

