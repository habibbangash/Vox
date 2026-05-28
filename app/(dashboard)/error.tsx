'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="text-muted-foreground text-xs max-w-xs">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="mt-2 inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
      >
        Try again
      </button>
    </div>
  )
}
