import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@alibaba-clone/ui/components/FavoritesPage'

export const Route = createFileRoute('/favorites')({
  component: FavoritesPage,
})
