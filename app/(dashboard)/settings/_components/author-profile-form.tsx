'use client'
import { useActionState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { upsertAuthorProfile, type AuthorProfile, type ContentActionState } from '@/app/actions/content'

interface AuthorProfileFormProps {
  profile: AuthorProfile | null
}

export function AuthorProfileForm({ profile }: AuthorProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ContentActionState, FormData>(
    upsertAuthorProfile,
    undefined
  )

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
        <Label htmlFor="voice_notes" className="text-xs">Voice notes</Label>
        <Textarea
          id="voice_notes"
          name="voice_notes"
          defaultValue={profile?.voice_notes ?? ''}
          placeholder={`Describe how you write:\n• First person, direct\n• Short sentences, no jargon\n• Lead with insight, not context\n• Avoid buzzwords like "leverage" or "synergy"`}
          className="min-h-28 text-sm resize-none max-w-lg"
        />
        <p className="text-xs text-muted-foreground">
          The AI uses this as a voice fingerprint when generating content for you.
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
