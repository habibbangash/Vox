'use client'
import { useActionState } from 'react'
import { resetPassword, type AuthState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, undefined)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <div className="text-2xl font-bold tracking-tight mb-1">Vox</div>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Must be at least 8 characters</CardDescription>
      </CardHeader>

      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Updating…' : 'Update password'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
