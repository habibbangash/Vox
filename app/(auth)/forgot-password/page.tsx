'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword, type AuthState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(forgotPassword, undefined)

  const sent = state !== undefined && !state?.error

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <div className="text-2xl font-bold tracking-tight mb-1">Vox</div>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>

      {sent ? (
        <CardContent className="space-y-4">
          <p className="text-sm text-green-600">
            Check your inbox — a reset link is on its way.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn&apos;t get it? Check your spam folder or{' '}
            <button
              onClick={() => window.location.reload()}
              className="underline underline-offset-4"
            >
              try again
            </button>
            .
          </p>
        </CardContent>
      ) : (
        <form action={action}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Sending…' : 'Send reset link'}
            </Button>
          </CardFooter>
        </form>
      )}

      <CardFooter>
        <p className="text-sm text-muted-foreground text-center w-full">
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
