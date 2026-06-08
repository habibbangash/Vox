import { LoginForm } from './_components/login-form'

interface Props {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams
  const safeNext = next?.startsWith('/') ? next : undefined
  return <LoginForm next={safeNext} />
}
