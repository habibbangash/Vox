'use client'
import { useState, useTransition } from 'react'
import { Eye, EyeOff, Check, Trash2, Loader2, KeyRound, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveGroqKey, removeGroqKey, testGroqKey } from '@/app/actions/workspace'

interface ApiKeyFormProps {
  hasKey: boolean
}

type KeyStatus = 'idle' | 'testing' | 'valid' | 'invalid'

export function ApiKeyForm({ hasKey }: ApiKeyFormProps) {
  const [keyValue,   setKeyValue]   = useState('')
  const [revealed,   setRevealed]   = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [keyStatus,  setKeyStatus]  = useState<KeyStatus>('idle')
  const [isSaving,   startSave]     = useTransition()
  const [isRemoving, startRemove]   = useTransition()

  async function handleSave() {
    setError(null)
    setKeyStatus('idle')
    startSave(async () => {
      const result = await saveGroqKey(keyValue)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setKeyStatus('testing')
        const validation = await testGroqKey(keyValue)
        setKeyValue('')
        setKeyStatus(validation.valid ? 'valid' : 'invalid')
        if (!validation.valid) setError(validation.error ?? 'Key saved but could not be verified')
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  async function handleRemove() {
    if (!confirm('Remove the Groq API key? Content generation will stop until a new key is added.')) return
    setError(null)
    startRemove(async () => {
      const result = await removeGroqKey()
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-4">
      {hasKey && !saved ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm">
            <KeyRound className={`size-4 shrink-0 ${keyStatus === 'valid' ? 'text-green-500' : keyStatus === 'invalid' ? 'text-destructive' : 'text-green-500'}`} />
            <span className="text-muted-foreground">Workspace key set</span>
            <span className="font-mono text-xs text-muted-foreground/60">gsk_···</span>
            {keyStatus === 'testing' && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Verifying…
              </span>
            )}
            {keyStatus === 'valid' && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check className="size-3" /> Valid
              </span>
            )}
            {keyStatus === 'invalid' && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <X className="size-3" /> Invalid key
              </span>
            )}
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
          {keyStatus === 'testing'
            ? <Loader2 className="size-4 shrink-0 animate-spin" />
            : <Check className="size-4 shrink-0" />}
          {keyStatus === 'testing' ? 'Key saved — verifying with Groq…' : 'API key saved and verified.'}
        </div>
      ) : null}

      {!hasKey && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed space-y-1">
          <p className="font-medium text-foreground">What is this?</p>
          <p>
            Vox uses Groq&apos;s free API to generate content drafts and extract insights from your sources.
            You need an API key to enable these features.
          </p>
          <p>
            Get a free key at{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground">
              console.groq.com/keys
            </a>
            {' '}— free tier, no credit card required.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">{hasKey ? 'Replace key' : 'Groq API key'}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={revealed ? 'text' : 'password'}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && keyValue.trim() && handleSave()}
              placeholder="gsk_…"
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
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            console.groq.com
          </a>.
        </p>
      </div>
    </div>
  )
}
