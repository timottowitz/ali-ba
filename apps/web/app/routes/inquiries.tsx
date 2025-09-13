import { createFileRoute } from '@tanstack/react-router'
import { InquiriesPage } from '@alibaba-clone/ui/components/InquiriesPage'

export const Route = createFileRoute('/inquiries')({
  component: InquiriesPage,
})
