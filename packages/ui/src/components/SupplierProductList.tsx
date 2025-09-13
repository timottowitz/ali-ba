import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { ProductForm } from './ProductForm'

interface SupplierProductListProps {
  products: any[]
}

export function SupplierProductList({ products }: SupplierProductListProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const deleteProduct = useMutation(api.products.deleteProduct)

  const handleDelete = async (productId: any) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct({ id: productId })
    }
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingProduct(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Products</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
        >
          Add Product
        </button>
      </div>

      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleCloseForm}
        />
      )}

      {products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">No products yet</div>
          <p className="text-gray-500">Add your first product to start selling</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-t-lg overflow-hidden">
                {product.imageUrls?.[0] ? (
                  <img
                    src={product.imageUrls[0]}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold text-orange-600">
                    ${product.price.min.toFixed(2)} - ${product.price.max.toFixed(2)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
