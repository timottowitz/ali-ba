import { createFileRoute } from '@tanstack/react-router'
import { SuppliersPage } from '@alibaba-clone/ui/components/SuppliersPage'

export const Route = createFileRoute('/suppliers')({
  component: SuppliersPage,
})
