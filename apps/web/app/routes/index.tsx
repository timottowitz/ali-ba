import { createFileRoute } from '@tanstack/react-router'
import { PublicHomePage } from '@alibaba-clone/ui/components/PublicHomePage'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  return <PublicHomePage />
}
