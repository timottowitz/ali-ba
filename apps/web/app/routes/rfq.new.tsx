import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/rfq/new')({
  component: RfqNewPage,
})

function RfqNewPage() {
  const search = useSearch({ from: '/rfq/new' }) as any
  const productId = search?.productId as string | undefined
  const invitedSupplierId = search?.invited as string | undefined

  const me = useQuery(api.auth.loggedInUser, {})
  const product = useQuery(api.products.getProductDetail, productId ? { productId: productId as any } : 'skip' as any)

  const createRFQ = useMutation(api.rfqs.createRFQ)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState<number>(1000)
  const [unit, setUnit] = useState('pieces')
  const [targetPrice, setTargetPrice] = useState<number | ''>('')
  const [currency, setCurrency] = useState<'USD'|'MXN'>('USD')
  const [incoterm, setIncoterm] = useState<'EXW'|'FOB'|'CIF'|'DDP'|'DAP'>('FOB')
  const [deliveryDate, setDeliveryDate] = useState<string>('')
  const [deliveryLocation, setDeliveryLocation] = useState<string>('Austin, TX, USA')
  const [visibility, setVisibility] = useState<'public'|'invited'>(invitedSupplierId ? 'invited' : 'public')
  const [materials, setMaterials] = useState('')
  const [colors, setColors] = useState('')
  const [tolerances, setTolerances] = useState('')
  const [certifications, setCertifications] = useState('')

  const categoryId = useMemo(() => (product as any)?.category?._id || (product as any)?.product?.categoryId, [product])

  useEffect(() => {
    if (product && (product as any).product) {
      const p: any = (product as any).product
      setTitle(`RFQ: ${p.title?.en || 'Product'}`)
      setDescription(p.description?.en || '')
      if (p.moqUnit) setUnit(p.moqUnit)
      if (p.incoterms?.length) setIncoterm(p.incoterms[0])
      if (p.specifications?.materials) setMaterials((p.specifications.materials as string[]).join(', '))
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me?._id) { alert('Please sign in'); return }
    if (!categoryId) { alert('Missing category'); return }
    if (!deliveryDate) { alert('Select a delivery date'); return }

    try {
      const rfqId = await createRFQ({
        buyerId: me._id as any,
        title,
        description,
        categoryId: categoryId as any,
        specifications: {
          materials: materials ? materials.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          tolerances: tolerances || undefined,
          colors: colors ? colors.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          certifications: certifications ? certifications.split(',').map((s) => s.trim()).filter(Boolean) : [],
          customRequirements: undefined,
        } as any,
        quantity,
        unit,
        targetPrice: targetPrice === '' ? undefined : Number(targetPrice),
        currency,
        incoterm,
        deliveryDate,
        deliveryLocation,
        visibility,
        invitedSuppliers: visibility === 'invited' && invitedSupplierId ? [invitedSupplierId as any] : undefined,
        expiryDays: 7,
      })
      alert(`RFQ created: ${rfqId}`)
    } catch (e: any) {
      alert(e?.message || 'Failed to create RFQ')
    }
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border p-6">
          <h1 className="text-2xl font-semibold mb-4">Create RFQ</h1>
          {productId && product && (
            <div className="mb-4 text-sm text-gray-600">Pre‑filled from product: {(product as any).product?.title?.en}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Quantity</label>
                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value || '0'))} className="w-full px-3 py-2 border rounded" required />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Unit</label>
                <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 border rounded" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Target Price (optional)</label>
                <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Incoterm</label>
                <select value={incoterm} onChange={e => setIncoterm(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                  {['EXW','FOB','CIF','DDP','DAP'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Delivery Date</label>
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full px-3 py-2 border rounded" required />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Delivery Location</label>
              <input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} className="w-full px-3 py-2 border rounded" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Materials (comma‑sep)</label>
                <input value={materials} onChange={e => setMaterials(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Colors (comma‑sep)</label>
                <input value={colors} onChange={e => setColors(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Tolerances</label>
                <input value={tolerances} onChange={e => setTolerances(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Certifications (comma‑sep)</label>
                <input value={certifications} onChange={e => setCertifications(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Visibility</label>
              <select value={visibility} onChange={e => setVisibility(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                <option value="public">Public (all suppliers)</option>
                <option value="invited">Invited only</option>
              </select>
              {visibility === 'invited' && invitedSupplierId && (
                <div className="text-xs text-gray-500 mt-1">Inviting supplier: {invitedSupplierId}</div>
              )}
            </div>

            <div className="pt-2">
              <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">Create RFQ</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

