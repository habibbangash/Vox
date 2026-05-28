import { getDrafts, getSignals } from '@/app/actions/content'
import { getLinkedInConnection, getEmailConfig } from '@/app/actions/publish'
import { ContentTabs } from './_components/content-tabs'

export default async function ContentPage() {
  const [drafts, signals, linkedIn, emailCfg] = await Promise.all([
    getDrafts(),
    getSignals(),
    getLinkedInConnection(),
    getEmailConfig(),
  ])

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Content</h1>
        <p className="text-muted-foreground text-sm">
          Turn customer language into LinkedIn posts, emails, and briefs.
        </p>
      </div>
      <ContentTabs
        drafts={drafts}
        signals={signals}
        linkedInConnected={linkedIn.connected}
        emailConfigured={emailCfg.configured}
      />
    </div>
  )
}
