import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

interface SupplierProfileProps {
  supplier: any
}

export function SupplierProfile({ supplier }: SupplierProfileProps) {
  const [isEditing, setIsEditing] = useState(!supplier)
  const [formData, setFormData] = useState({
    companyName: supplier?.companyName || '',
    description: supplier?.description || '',
    location: supplier?.location || '',
    contactEmail: supplier?.contactEmail || '',
    contactPhone: supplier?.contactPhone || '',
    website: supplier?.website || '',
    yearEstablished: supplier?.yearEstablished || '',
    employeeCount: supplier?.employeeCount || '',
    businessType: supplier?.businessType || '',
    mainProducts: supplier?.mainProducts?.join(', ') || '',
  })

  const createSupplier = useMutation(api.suppliers.createSupplier)
  const updateSupplier = useMutation(api.suppliers.updateSupplier)
  const generateUploadUrl = useMutation(api.suppliers.generateUploadUrl)

  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const supplierData = {
        companyName: formData.companyName,
        description: formData.description,
        location: formData.location,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || undefined,
        website: formData.website || undefined,
        yearEstablished: formData.yearEstablished ? parseInt(formData.yearEstablished) : undefined,
        employeeCount: formData.employeeCount || undefined,
        businessType: formData.businessType || undefined,
        mainProducts: formData.mainProducts.split(',').map((p: string) => p.trim()).filter(Boolean),
      }

      if (supplier) {
        await updateSupplier(supplierData)
      } else {
        await createSupplier(supplierData)
      }
      
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving supplier profile:', error)
      alert('Error saving profile. Please try again.')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadUrl = await generateUploadUrl()
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      const { storageId } = await result.json()
      
      await updateSupplier({ logo: storageId })
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Error uploading logo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (!supplier && !isEditing) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">No supplier profile</div>
        <button
          onClick={() => setIsEditing(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
        >
          Create Profile
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Company Profile</h2>
        {supplier && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="City, Country"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email *
              </label>
              <input
                type="email"
                required
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year Established
              </label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.yearEstablished}
                onChange={(e) => setFormData({ ...formData, yearEstablished: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Count
              </label>
              <select
                value={formData.employeeCount}
                onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select range</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="501-1000">501-1000</option>
                <option value="1000+">1000+</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select type</option>
                <option value="Manufacturer">Manufacturer</option>
                <option value="Trading Company">Trading Company</option>
                <option value="Distributor">Distributor</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="Service Provider">Service Provider</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Products (comma-separated)
              </label>
              <input
                type="text"
                value={formData.mainProducts}
                onChange={(e) => setFormData({ ...formData, mainProducts: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Electronics, Textiles, Machinery"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            {supplier && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              {supplier ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start space-x-6 mb-6">
            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
              {supplier.logoUrl ? (
                <img
                  src={supplier.logoUrl}
                  alt={supplier.companyName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Logo
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-2xl font-bold text-gray-900">{supplier.companyName}</h3>
                {supplier.verified ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                    Verified
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                    Pending Verification
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-4">{supplier.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Location:</span> {supplier.location}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Products:</span> {supplier.totalProducts}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Rating:</span> {supplier.rating}/5.0
                </div>
                {supplier.yearEstablished && (
                  <div>
                    <span className="font-medium text-gray-700">Established:</span> {supplier.yearEstablished}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="mb-4"
            />
            {uploading && <p className="text-sm text-gray-500">Uploading logo...</p>}
          </div>
        </div>
      )}
    </div>
  )
}
