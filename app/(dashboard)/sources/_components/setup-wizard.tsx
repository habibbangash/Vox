'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, ArrowLeftIcon, PlusIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { connectKrisp, connectRSS, type SourceActionState } from '@/app/actions/sources'

const SOURCES = [
  {
    id: 'krisp',
    label: 'Krisp',
    icon: '🎙',
    time: '5 min',
    desc: 'Meeting transcripts via webhook',
    auth: 'webhook' as const,
  },
  {
    id: 'rss',
    label: 'RSS Feed',
    icon: '📰',
    time: '2 min',
    desc: 'Blogs, news and podcast feeds',
    auth: 'form' as const,
  },
  {
    id: 'slack',
    label: 'Slack',
    icon: '#',
    time: '10 min',
    desc: 'Channel conversations',
    auth: 'oauth' as const,
    path: '/api/oauth/slack',
  },
  {
    id: 'gmail',
    label: 'Gmail',
    icon: '✉',
    time: '10 min',
    desc: 'Email threads and newsletters',
    auth: 'oauth' as const,
    path: '/api/oauth/google',
  },
  {
    id: 'hubspot',
    label: 'HubSpot',
    icon: '🟠',
    time: '10 min',
    desc: 'CRM contacts, deals and notes',
    auth: 'oauth' as const,
    path: '/api/oauth/hubspot',
  },
  {
    id: 'granola',
    label: 'Granola',
    icon: '📋',
    time: '10 min',
    desc: 'AI-powered meeting notes',
    auth: 'oauth' as const,
    path: '/api/oauth/granola',
  },
  {
    id: 'notion',
    label: 'Notion',
    icon: '📄',
    time: '10 min',
    desc: 'Wikis and knowledge bases',
    auth: 'oauth' as const,
    path: '/api/oauth/notion',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '💼',
    time: '10 min',
    desc: 'Publishing channel',
    auth: 'oauth' as const,
    path: '/api/oauth/linkedin',
  },
]

type Source = typeof SOURCES[number]
type Step = 'pick' | 'connect' | 'confirm'

const CONFIRM_NEXT: Record<string, string> = {
  krisp:    'Your webhook URL is shown on the Krisp card below — paste it into Krisp → Settings → Integrations.',
  rss:      'Your feed will be ingested within the next sync cycle. Signals will appear shortly.',
  slack:    'Select which channels to monitor on the Slack card below, then run a sync.',
  gmail:    'Adjust your Gmail search query on the card below, then run a sync.',
  hubspot:  'Your CRM contacts, deals and notes will be synced on the HubSpot card below.',
  granola:  'Your meeting notes will be pulled in automatically. Run a sync on the Granola card.',
  notion:   'Your Notion pages will be ingested. Run a sync on the Notion card below.',
  linkedin: 'LinkedIn is connected as a publishing channel. Use it in the Content editor to publish.',
}

interface SetupWizardProps {
  justConnected?: string | null
  connectedSources: string[]
}

export function SetupWizard({ justConnected, connectedSources }: SetupWizardProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('pick')
  const [selected, setSelected] = useState<Source | null>(null)
  const [rssUrl, setRssUrl] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Auto-open at confirm step after OAuth round-trip
  useEffect(() => {
    if (justConnected) {
      const source = SOURCES.find(s => s.id === justConnected) ?? null
      setSelected(source)
      setStep('confirm')
      setOpen(true)
    }
  }, [justConnected])

  function openFresh() {
    setStep('pick')
    setSelected(null)
    setError(null)
    setRssUrl('')
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    if (justConnected) {
      // Strip the ?source=connected param from the URL
      router.replace('/sources')
    }
  }

  function handlePick(source: Source) {
    setSelected(source)
    setError(null)
    setStep('connect')
  }

  function handleBack() {
    setStep('pick')
    setError(null)
  }

  function handleOAuth(path: string) {
    window.location.href = path
  }

  function handleConnectKrisp() {
    setError(null)
    startTransition(async () => {
      const result = await connectKrisp({} as SourceActionState)
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
        setStep('confirm')
      }
    })
  }

  function handleConnectRSS() {
    if (!rssUrl.trim()) { setError('Enter a feed URL'); return }
    setError(null)
    const formData = new FormData()
    formData.set('url', rssUrl.trim())
    startTransition(async () => {
      const result = await connectRSS({} as SourceActionState, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
        setStep('confirm')
      }
    })
  }

  const stepIndex = { pick: 0, connect: 1, confirm: 2 }[step]

  return (
    <>
      <Button size="sm" onClick={openFresh}>
        <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
        Add source
      </Button>

      <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) handleClose() }}>
        <DialogContent className="sm:max-w-md">
          {/* Progress bar */}
          <div className="flex gap-1 mb-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                  i <= stepIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <DialogHeader>
            <DialogTitle>
              {step === 'pick' && 'Add a source'}
              {step === 'connect' && `Connect ${selected?.label}`}
              {step === 'confirm' && `${selected?.label} connected`}
            </DialogTitle>
          </DialogHeader>

          {/* ── STEP 1: PICK ── */}
          {step === 'pick' && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              {SOURCES.map(source => {
                const isConnected = connectedSources.includes(source.id)
                return (
                  <button
                    key={source.id}
                    onClick={() => handlePick(source)}
                    className="group relative flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base leading-none">{source.icon}</span>
                      {isConnected && (
                        <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                          ✓
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium leading-tight">{source.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{source.desc}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70">⏱ {source.time}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── STEP 2: CONNECT ── */}
          {step === 'connect' && selected && (
            <div className="space-y-4 mt-1">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{selected.icon}</span>
                  <span className="text-sm font-medium">{selected.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{selected.desc}</p>
              </div>

              {selected.auth === 'oauth' && 'path' in selected && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll be redirected to {selected.label} to authorise access. We only request read permissions (or publish permissions for LinkedIn).
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => handleOAuth((selected as { path: string }).path)}
                  >
                    Connect via {selected.label}
                  </Button>
                </div>
              )}

              {selected.auth === 'webhook' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Vox generates a unique webhook URL. Paste it into Krisp → Settings → Integrations. Transcripts will flow in automatically after each meeting.
                  </p>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button
                    className="w-full"
                    onClick={handleConnectKrisp}
                    disabled={isPending}
                  >
                    {isPending ? 'Generating…' : 'Generate webhook URL'}
                  </Button>
                </div>
              )}

              {selected.auth === 'form' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Paste the URL of any RSS or Atom feed — a blog, podcast, newsletter or news source.
                  </p>
                  <Input
                    placeholder="https://example.com/feed.xml"
                    value={rssUrl}
                    onChange={e => setRssUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleConnectRSS() }}
                    className="text-xs"
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button
                    className="w-full"
                    onClick={handleConnectRSS}
                    disabled={isPending || !rssUrl.trim()}
                  >
                    {isPending ? 'Validating feed…' : 'Add feed'}
                  </Button>
                </div>
              )}

              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon className="h-3 w-3" />
                Back
              </button>
            </div>
          )}

          {/* ── STEP 3: CONFIRM ── */}
          {step === 'confirm' && selected && (
            <div className="space-y-4 mt-1">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{selected.label} is connected</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                    {CONFIRM_NEXT[selected.id] ?? 'Your source is ready. Data will be ingested soon.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setStep('pick'); setSelected(null); setError(null); setRssUrl('') }}
                >
                  Add another
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleClose}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
