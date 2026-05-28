'use client'
import { useState, useTransition } from 'react'
import { Eye, EyeOff, Check, Trash2, Loader2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveAnthropicKey, removeAnthropicKey } from '@/app/actions/workspace'

interface ApiKeyFormProps {
  hasKey: boolean
}

export function ApiKeyForm({ hasKey }: ApiKeyFormProps) {
  const [keyValue,  setKeyValue]  = useState('')
  const [revealed,  setRevealed]  = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [isSaving,  startSave]    = useTransition()
  const [isRemoving, startRemove] = useTransition()

  async function handleSave() {
    setError(null)
    startSave(async () => {
      const result = await saveAnthropicKey(keyValue)
      if (result.error) {
        setError(result.error)
      } else {
        setKeyValue('')
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  async function handleRemove() {
    if (!confirm('Remove the Anthropic API key? Content generation will fall back to the server-level key (if set).')) return
    setError(null)
    startRemove(async () => {
      const result = await removeAnthropicKey()
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-4">
      {hasKey && !saved ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm">
            <KeyRound className="size-4 text-green-500 shrink-0" />
            <span className="text-muted-foreground">Workspace key set</span>
            <span className="font-mono text-xs text-muted-foreground/60">sk-ant-···</span>
          </div>
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            {isRemoving
              ? <Loader2 className="size-3.5 animate-spin" />
              : <Trash2 className="size-3.5" />}
            Remove
          </button>
        </div>
      ) : saved ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-600">
          <Check className="size-4 shrink-0" />
          API key saved successfully.
        </div>
      ) : null}

      {!hasKey && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed space-y-1">
          <p className="font-medium text-foreground">What is this?</p>
          <p>
            Vox uses Anthropic&apos;s Claude AI to generate content drafts and extract insights from your sources.
            You need an API key to enable these features.
          </p>
          <p>
            Get a free key at{' '}
            <a href="https://console.anthropic.com/keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground">
              console.anthropic.com/keys
            </a>
            {' '}— typical usage costs a few dollars per month.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">{hasKey ? 'Replace key' : 'Anthropic API key'}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={revealed ? 'text' : 'password'}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && keyValue.trim() && handleSave()}
              placeholder="sk-ant-api03-…"
              className="h-9 text-sm pr-9 font-mono"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || keyValue.trim().length < 10}
            className="shrink-0"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
          </Button>
        </div>
        {error && (
          <p className="text-xs text-destructive rounded bg-destructive/10 px-2 py-1">{error}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Used for AI content generation. Stored in your workspace — never logged or shared.
          Get a key at{' '}
          <a href="https://console.anthropic.com/keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            console.anthropic.com
          </a>.
        </p>
      </div>
    </div>
  )
}
