import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import React from 'react'

export const Route = createFileRoute('/admin/seed-demo')({
  component: SeedDemoPage,
})

function SeedDemoPage() {
  const seed = useMutation(api.seed.createScrewManufacturerDemo)
  const [status, setStatus] = React.useState<string>('')
  const [busy, setBusy] = React.useState(false)
  const onSeed = async () => {
    setBusy(true)
    setStatus('Seeding…')
    try {
      const res = await seed({})
      setStatus(`Done: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`Error: ${e?.message || String(e)}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-4">Seed Demo: Screw Manufacturer (Sonora)</h1>
      <p className="text-sm text-gray-600 mb-4">Seeds a Sonora screw manufacturer and three screw products, and builds search chunks.</p>
      <button
        onClick={onSeed}
        disabled={busy}
        className="px-4 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50"
      >
        {busy ? 'Working…' : 'Run Seeding'}
      </button>
      {status && <div className="mt-4 text-sm text-gray-800 whitespace-pre-wrap">{status}</div>}
      <div className="mt-8 text-sm text-gray-600">
        Tip: Ensure the dev server is running (npm run dev) so this page can call Convex locally.
      </div>
    </div>
  )
}

