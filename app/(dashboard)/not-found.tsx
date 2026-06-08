import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <p className="text-5xl font-semibold tracking-tight">404</p>
      <p className="text-muted-foreground text-sm max-w-xs">
        This page doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
