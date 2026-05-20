import { getRecentDocuments } from '@/app/actions/intelligence'
import { SearchInterface } from './_components/search-interface'

export default async function IntelligencePage() {
  const initial = await getRecentDocuments()

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Intelligence</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Search across every meeting, transcript, and article in your workspace.
      </p>
      <SearchInterface initial={initial} />
    </div>
  )
}
