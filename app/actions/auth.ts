'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string } | undefined

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  const next = formData.get('next') as string | null
  redirect(next?.startsWith('/') ? next : '/dashboard')
}

export async function signup(state: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: { emailRedirectTo: undefined },
  })

  if (error) return { error: error.message }

  redirect('/onboarding/workspace')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function forgotPassword(state: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) return { error: error.message }
  return { error: undefined }
}

export async function resetPassword(state: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password !== confirm) return { error: 'Passwords do not match' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }
  redirect('/dashboard')
}
