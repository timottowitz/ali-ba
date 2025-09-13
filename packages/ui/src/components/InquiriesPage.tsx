import { Header } from './Header'
import { InquiriesList } from './InquiriesList'

export function InquiriesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header activeTab="inquiries" onTabChange={() => {}} />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <InquiriesList />
        </div>
      </main>
    </div>
  )
}
