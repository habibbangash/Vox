'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { signup, type AuthState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { GoogleButton } from '@/app/(auth)/_components/google-button'

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, undefined)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <div className="text-2xl font-bold tracking-tight mb-1">Vox</div>
        <CardTitle className="text-xl">Create an account</CardTitle>
        <CardDescription>Start turning conversations into content</CardDescription>
      </CardHeader>

      <div className="px-6 pb-2">
        <GoogleButton label="Sign up with Google" />
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>
      </div>

      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Creating account…' : 'Create account'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
