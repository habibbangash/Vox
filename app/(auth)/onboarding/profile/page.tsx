'use client'
import { useActionState } from 'react'
import { saveCompanyProfile, type OnboardingState } from '@/app/actions/onboarding'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProfilePage() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    saveCompanyProfile,
    undefined
  )

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1">
        <div className="text-2xl font-bold tracking-tight mb-1">Vox</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className="font-medium text-foreground">Step 2</span>
          <span>of 2</span>
          <div className="flex gap-1 ml-auto">
            <div className="h-1.5 w-8 rounded-full bg-foreground" />
            <div className="h-1.5 w-8 rounded-full bg-foreground" />
          </div>
        </div>
        <CardTitle className="text-xl">Tell Vox about your company</CardTitle>
        <CardDescription>
          This becomes the AI&apos;s context for tagging content and generating output.
          The more specific, the better.
        </CardDescription>
      </CardHeader>

      <form action={action}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="system_prompt">
              Company overview
            </Label>
            <p className="text-xs text-muted-foreground">
              What does your company do? What problem do you solve?
            </p>
            <Textarea
              id="system_prompt"
              name="system_prompt"
              placeholder="We build broadcast production software for live TV teams. Our product helps producers manage scripts, rundowns, and on-air graphics in real time..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icp_description">
              Who you sell to
            </Label>
            <p className="text-xs text-muted-foreground">
              Role, company size, industry, key pain points. The more specific, the better your content will be.
            </p>
            <Textarea
              id="icp_description"
              name="icp_description"
              placeholder="Head of Production or VP Engineering at broadcast networks and sports channels with 50–500 employees. Frustrated by fragmented tools and manual handoffs..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_personas">
              Job titles of your buyers
            </Label>
            <p className="text-xs text-muted-foreground">
              Enter one job title per line — these are the people Vox writes content for.
            </p>
            <Textarea
              id="target_personas"
              name="target_personas"
              placeholder={"Head of Production\nVP Engineering\nBroadcast Producer\nCTO at media companies"}
              rows={4}
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Saving…' : 'Finish setup'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
