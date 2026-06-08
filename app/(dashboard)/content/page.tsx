import { getDrafts, getSignals } from '@/app/actions/content'
import { getPersonas } from '@/app/actions/personas'
import { ContentTabs } from './_components/content-tabs'

export default async function ContentPage() {
  const [drafts, signals, personas] = await Promise.all([
    getDrafts(),
    getSignals(),
    getPersonas(),
  ])

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight mb-1 font-heading">Content</h1>
        <p className="text-muted-foreground text-sm">
          Turn customer language into LinkedIn posts, emails, and briefs.
        </p>
      </div>
      <ContentTabs
        drafts={drafts}
        signals={signals}
        personas={personas}
      />
    </div>
  )
}
