'use client'
import { useState } from 'react'
import { type ContentDraft, type Signal } from '@/app/actions/content'
import { SignalsTab } from './signals-tab'
import { DraftsTab } from './drafts-tab'
import { TemplatesTab } from './templates-tab'

type Tab = 'signals' | 'drafts' | 'templates'

const TABS: { id: Tab; label: string }[] = [
  { id: 'signals',   label: 'Signals'   },
  { id: 'drafts',    label: 'Drafts'    },
  { id: 'templates', label: 'Templates' },
]

interface ContentTabsProps {
  drafts:   ContentDraft[]
  signals:  Signal[]
}

export function ContentTabs({ drafts, signals }: ContentTabsProps) {
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

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-foreground text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
        />
      )}
      {activeTab === 'templates' && <TemplatesTab onSelectTemplate={handleSelectTemplate} />}
    </div>
  )
}
