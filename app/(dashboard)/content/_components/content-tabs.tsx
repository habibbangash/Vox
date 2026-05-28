'use client'
import { useState } from 'react'
import { type ContentDraft, type Signal } from '@/app/actions/content'
import { SignalsTab } from './signals-tab'
import { DraftsTab } from './drafts-tab'
import { TemplatesTab } from './templates-tab'
import { PublishedTab } from './published-tab'
import { CalendarTab } from './calendar-tab'

type Tab = 'signals' | 'drafts' | 'templates' | 'published' | 'calendar'

const TABS: { id: Tab; label: string }[] = [
  { id: 'signals',   label: 'Signals'   },
  { id: 'drafts',    label: 'Drafts'    },
  { id: 'templates', label: 'Templates' },
  { id: 'published', label: 'Published' },
  { id: 'calendar',  label: 'Calendar'  },
]

interface ContentTabsProps {
  drafts:             ContentDraft[]
  signals:            Signal[]
  linkedInConnected?: boolean
  emailConfigured?:   boolean
}

export function ContentTabs({ drafts, signals, linkedInConnected = false, emailConfigured = false }: ContentTabsProps) {
  const [activeTab,          setActiveTab]          = useState<Tab>('drafts')
  const [pendingFormat,      setPendingFormat]      = useState<string | null>(null)
  const [highlightDraftId,   setHighlightDraftId]   = useState<string | null>(null)

  function handleSelectTemplate(format: string) {
    setPendingFormat(format)
    setActiveTab('drafts')
  }

  function clearPendingFormat() {
    setPendingFormat(null)
  }

  const publishedCount = drafts.filter((d) => d.status === 'published').length
  const tabCounts: Partial<Record<Tab, number>> = {
    signals:   signals.length,
    drafts:    drafts.length,
    published: publishedCount,
  }

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => {
          const count = tabCounts[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-foreground text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                  activeTab === tab.id ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab panels */}
      {activeTab === 'signals'   && (
        <SignalsTab
          signals={signals}
          onDraftCreated={(draftId) => { setHighlightDraftId(draftId); setActiveTab('drafts') }}
        />
      )}
      {activeTab === 'drafts'    && (
        <DraftsTab
          drafts={drafts}
          pendingFormat={pendingFormat}
          onPendingFormatConsumed={clearPendingFormat}
          highlightDraftId={highlightDraftId}
          linkedInConnected={linkedInConnected}
          emailConfigured={emailConfigured}
        />
      )}
      {activeTab === 'templates' && <TemplatesTab onSelectTemplate={handleSelectTemplate} />}
      {activeTab === 'published' && <PublishedTab drafts={drafts} />}
      {activeTab === 'calendar'  && <CalendarTab  drafts={drafts} />}
    </div>
  )
}
