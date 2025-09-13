import { createFileRoute } from '@tanstack/react-router'
import { ProductsPage } from '@alibaba-clone/ui/components/ProductsPage'

export const Route = createFileRoute('/products')({
  component: ProductsPage,
})
