import { createFileRoute } from '@tanstack/react-router'
import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInForm } from '@alibaba-clone/ui/components/SignInForm'
import { SupplierDashboard } from '@alibaba-clone/ui/components/SupplierDashboard'

export const Route = createFileRoute('/supplier/login')({
  component: SupplierLoginComponent,
})

function SupplierLoginComponent() {
  return (
    <>
      <Unauthenticated>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Supplier Login</h2>
              <p className="text-gray-600">Sign in to manage your supplier account</p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
      
      <Authenticated>
        <SupplierDashboard />
      </Authenticated>
    </>
  )
}
