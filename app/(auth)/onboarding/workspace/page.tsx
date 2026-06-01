'use client'
import { useActionState, useState } from 'react'
import { createWorkspace, type OnboardingState } from '@/app/actions/onboarding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function WorkspacePage() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    createWorkspace,
    undefined
  )
  const [slug, setSlug] = useState('')

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="text-2xl font-bold tracking-tight mb-1">Vox</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className="font-medium text-foreground">Step 1</span>
          <span>of 2</span>
          <div className="flex gap-1 ml-auto">
            <div className="h-1.5 w-8 rounded-full bg-foreground" />
            <div className="h-1.5 w-8 rounded-full bg-muted" />
          </div>
        </div>
        <CardTitle className="text-xl">Create your workspace</CardTitle>
        <CardDescription>This is your company&apos;s home in Vox</CardDescription>
      </CardHeader>

      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Acme Inc."
              required
              onChange={(e) => setSlug(toSlug(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              Workspace URL
              <span className="text-muted-foreground font-normal ml-1 text-xs">
                (auto-generated, editable)
              </span>
            </Label>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground px-3 py-2 border border-r-0 rounded-l-md bg-muted h-9 flex items-center">
                vox/
              </span>
              <Input
                id="slug"
                name="slug"
                className="rounded-l-none"
                value={slug}
                onChange={(e) => setSlug(toSlug(e.target.value))}
                placeholder="acme-inc"
                required
              />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Creating workspace…' : 'Continue'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
