'use client'
import { useActionState, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { upsertAuthorProfile, type AuthorProfile, type ContentActionState } from '@/app/actions/content'

const EXAMPLES = [
  {
    label: 'Founder / exec',
    text:  `Direct, first-person voice. No jargon or buzzwords.\nShort sentences. Lead with the insight, then explain.\nConversational but credible — like talking to a smart peer.\nAvoid: "leverage", "synergy", "circle back", "deep dive".`,
  },
  {
    label: 'Technical / product',
    text:  `Precise and specific. Use real numbers and examples.\nExplain the "why", not just the "what".\nOkay to use technical terms if the audience knows them.\nAvoid corporate-speak and vague superlatives.`,
  },
  {
    label: 'Sales / revenue',
    text:  `Outcome-focused. Start with the problem, then the result.\nUse social proof and specific customer language.\nBold claims backed by evidence — no fluff.\nConversational CTAs. Avoid passive voice.`,
  },
]

interface AuthorProfileFormProps {
  profile: AuthorProfile | null
}

export function AuthorProfileForm({ profile }: AuthorProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ContentActionState, FormData>(
    upsertAuthorProfile,
    undefined
  )
  const [showExamples, setShowExamples] = useState(false)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="display_name" className="text-xs">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile?.display_name ?? ''}
          placeholder="e.g. Habib Ullah"
          className="h-9 text-sm max-w-sm"
          required
        />
        <p className="text-xs text-muted-foreground">
          Used as the author attribution on generated content.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role" className="text-xs">Role / title</Label>
        <Input
          id="role"
          name="role"
          defaultValue={profile?.role ?? ''}
          placeholder="e.g. Co-founder & CEO"
          className="h-9 text-sm max-w-sm"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between max-w-lg">
          <Label htmlFor="voice_notes" className="text-xs">Writing style &amp; tone</Label>
          <button
            type="button"
            onClick={() => setShowExamples((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showExamples ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {showExamples ? 'Hide examples' : 'See examples'}
          </button>
        </div>

        {showExamples && (
          <div className="grid gap-2 sm:grid-cols-3 max-w-lg mb-1">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  const el = document.getElementById('voice_notes') as HTMLTextAreaElement | null
                  if (el) el.value = ex.text
                }}
                className="rounded-lg border px-3 py-2.5 text-left space-y-1 hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <p className="text-xs font-medium">{ex.label}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{ex.text}</p>
              </button>
            ))}
          </div>
        )}

        <Textarea
          id="voice_notes"
          name="voice_notes"
          defaultValue={profile?.voice_notes ?? ''}
          placeholder={`Describe how you write:\n• First person, direct\n• Short sentences, no jargon\n• Lead with insight, not context\n• Avoid buzzwords like "leverage" or "synergy"`}
          className="min-h-28 text-sm resize-none max-w-lg"
        />
        <p className="text-xs text-muted-foreground">
          Vox uses this to match your voice when generating content. The more specific, the better.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending
            ? <Loader2 className="size-3.5 animate-spin mr-1.5" />
            : state?.success
              ? <Check className="size-3.5 mr-1.5" />
              : null}
          {state?.success ? 'Saved' : 'Save profile'}
        </Button>
        {state?.error && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  )
}
