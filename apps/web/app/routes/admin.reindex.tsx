import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useState } from 'react'

export const Route = createFileRoute('/admin/reindex')({
  component: AdminReindexPage,
})

function AdminReindexPage() {
  const reindex = useMutation(api.search.reindexAllProducts)
  const reindexChunks = useMutation(api.search.reindexAllProductChunks)
  const [result, setResult] = useState<{ reindexed: number } | null>(null)
  const [running, setRunning] = useState(false)
  const [chunksResult, setChunksResult] = useState<{ reindexed: number } | null>(null)
  const [chunksRunning, setChunksRunning] = useState(false)
  const reindexSupplierChunks = useMutation(api.search.reindexAllSupplierChunks)

  return (
    <div className="bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h1 className="text-2xl font-semibold">Admin: Reindex Product Embeddings</h1>
          <p className="text-sm text-gray-600 mt-1">Runs server-side embedding upsert for all products (uses ZeroEntropy if configured, else fallback).</p>
          <div className="mt-4 space-y-3">
            <button
              disabled={running}
              onClick={async () => {
                try {
                  setRunning(true)
                  const res = await reindex({} as any)
                  setResult(res as any)
                } catch (e) {
                  alert((e as any)?.message || 'Reindex failed')
                } finally {
                  setRunning(false)
                }
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              {running ? 'Reindexing…' : 'Run Reindex'}
            </button>
            {result && (
              <div className="text-sm text-gray-700 mt-3">Reindexed products: <span className="font-medium">{result.reindexed}</span></div>
            )}

            <button
              disabled={chunksRunning}
              onClick={async () => {
                try {
                  setChunksRunning(true)
                  const res = await reindexChunks({} as any)
                  setChunksResult(res as any)
                } catch (e) {
                  alert((e as any)?.message || 'Chunk reindex failed')
                } finally {
                  setChunksRunning(false)
                }
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              {chunksRunning ? 'Rechunking…' : 'Reindex Product Chunks'}
            </button>
            {chunksResult && (
              <div className="text-sm text-gray-700">Rechunked products: <span className="font-medium">{chunksResult.reindexed}</span></div>
            )}
            <button
              disabled={chunksRunning}
              onClick={async () => {
                try {
                  setChunksRunning(true)
                  const res = await reindexSupplierChunks({} as any)
                  setChunksResult(res as any)
                } catch (e) {
                  alert((e as any)?.message || 'Supplier chunk reindex failed')
                } finally {
                  setChunksRunning(false)
                }
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
            >
              {chunksRunning ? 'Rechunking…' : 'Reindex Supplier Chunks'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
