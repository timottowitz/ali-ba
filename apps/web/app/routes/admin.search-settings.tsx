import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/admin/search-settings')({
  component: AdminSearchSettings,
})

function AdminSearchSettings() {
  const settings = useQuery(api.search.getSearchSettings, {})
  const stats = useQuery(api.search.getEmbeddingStats, {})
  const update = useMutation(api.search.updateSearchSettings)

  const [kw, setKw] = useState(2)
  const [sv, setSv] = useState(1)
  const [limit, setLimit] = useState(20)
  const [batch, setBatch] = useState(100)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setKw(settings.interleaveKeyword)
      setSv(settings.interleaveSemantic)
      setLimit(settings.defaultLimit)
      setBatch(settings.reindexBatchSize)
    }
  }, [settings])

  return (
    <div className="bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h1 className="text-2xl font-semibold">Search Settings</h1>
          <p className="text-sm text-gray-600">Tune fusion and defaults for hybrid product search.</p>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <label className="flex items-center gap-2">Keyword per cycle <input type="number" className="border rounded px-2 py-1 w-24" value={kw} onChange={e => setKw(Number(e.target.value || 0))} /></label>
            <label className="flex items-center gap-2">Semantic per cycle <input type="number" className="border rounded px-2 py-1 w-24" value={sv} onChange={e => setSv(Number(e.target.value || 0))} /></label>
            <label className="flex items-center gap-2">Default limit <input type="number" className="border rounded px-2 py-1 w-24" value={limit} onChange={e => setLimit(Number(e.target.value || 0))} /></label>
            <label className="flex items-center gap-2">Reindex batch <input type="number" className="border rounded px-2 py-1 w-24" value={batch} onChange={e => setBatch(Number(e.target.value || 0))} /></label>
          </div>
          <div className="mt-4">
            <button
              disabled={saving}
              onClick={async () => {
                try {
                  setSaving(true)
                  await update({ interleaveKeyword: kw, interleaveSemantic: sv, defaultLimit: limit, reindexBatchSize: batch } as any)
                } catch (e) {
                  alert((e as any)?.message || 'Save failed')
                } finally {
                  setSaving(false)
                }
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Embedding Stats</h2>
          {!stats ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : stats.count === 0 ? (
            <div className="text-sm text-gray-500">No embeddings yet</div>
          ) : (
            <div className="text-sm grid grid-cols-2 gap-3">
              <div>Total vectors: <span className="font-medium">{stats.count}</span></div>
              <div>Oldest: <span className="font-medium">{new Date(stats.oldest).toLocaleString()}</span></div>
              <div>Newest: <span className="font-medium">{new Date(stats.newest).toLocaleString()}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

