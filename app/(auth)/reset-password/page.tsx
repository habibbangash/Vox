'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [ready,    setReady]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    // Supabase picks up #access_token from the URL hash and fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const password = form.get('password') as string
    const confirm  = form.get('confirm') as string

    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 8)  return setError('Password must be at least 8 characters')

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <div className="text-2xl font-bold tracking-tight mb-1">Vox</div>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Must be at least 8 characters</CardDescription>
      </CardHeader>

      {!ready ? (
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Verifying reset link…
          </p>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
