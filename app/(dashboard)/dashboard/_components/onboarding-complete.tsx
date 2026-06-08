'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, X, ArrowRight } from 'lucide-react'

interface OnboardingCompleteProps {
  workspaceName: string
}

const STORAGE_KEY = 'vox_onboarding_complete_dismissed'

export function OnboardingComplete({ workspaceName }: OnboardingCompleteProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) setVisible(true)
  }, [])

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <section className="relative rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-teal-500/5 p-6 overflow-hidden">
      {/* Background sparkle decoration */}
      <div className="absolute top-3 right-12 text-2xl opacity-20 select-none" aria-hidden>✦</div>
      <div className="absolute bottom-4 right-6 text-lg opacity-15 select-none" aria-hidden>✦</div>
      <div className="absolute top-6 right-32 text-sm opacity-10 select-none" aria-hidden>✦</div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>

      <div className="space-y-4 max-w-lg">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-green-500/15 p-2 shrink-0">
            <Sparkles className="size-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-green-800 dark:text-green-300">
              {workspaceName} is ready
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              You&apos;ve connected your sources, ingested data, and created your first draft.
              Vox is now learning from your workspace.
            </p>
          </div>
        </div>

        {/* What's unlocked */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { emoji: '🔍', label: 'Signal detection',  desc: 'Automatic weekly insights' },
            { emoji: '✍️', label: 'AI draft generation', desc: 'One click per signal'      },
            { emoji: '📤', label: 'Direct publishing',  desc: 'LinkedIn & email'           },
          ].map(({ emoji, label, desc }) => (
            <div key={label} className="rounded-lg bg-background/60 border border-green-500/20 px-3 py-2.5 space-y-0.5">
              <p className="text-xs font-medium">{emoji} {label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/content"
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            Create your next draft
            <ArrowRight className="size-3.5" />
          </Link>
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  )
}
