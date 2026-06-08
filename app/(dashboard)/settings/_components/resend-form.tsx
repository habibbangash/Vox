'use client'
import { useState, useTransition } from 'react'
import { Eye, EyeOff, Check, Trash2, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveResendConfig, removeResendConfig } from '@/app/actions/workspace'

interface ResendFormProps {
  configured: boolean
  fromName?: string
  fromEmail?: string
}

export function ResendForm({ configured, fromName, fromEmail }: ResendFormProps) {
  const [apiKey,     setApiKey]     = useState('')
  const [name,       setName]       = useState(fromName ?? '')
  const [email,      setEmail]      = useState(fromEmail ?? '')
  const [revealed,   setRevealed]   = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [isSaving,   startSave]     = useTransition()
  const [isRemoving, startRemove]   = useTransition()

  async function handleSave() {
    setError(null)
    startSave(async () => {
      const result = await saveResendConfig({ apiKey, fromName: name, fromEmail: email })
      if (result.error) {
        setError(result.error)
      } else {
        setApiKey('')
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  async function handleRemove() {
    if (!confirm('Remove Resend configuration? Email publishing will stop working.')) return
    setError(null)
    startRemove(async () => {
      const result = await removeResendConfig()
      if (result.error) setError(result.error)
    })
  }

  const canSave = apiKey.trim().length > 5 && name.trim().length > 0 && email.trim().includes('@')

  return (
    <div className="space-y-4">
      {configured && !saved ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="size-4 text-green-500 shrink-0" />
            <span className="text-muted-foreground">Configured</span>
            <span className="text-xs text-muted-foreground/60">
              {fromName ? `${fromName} <${fromEmail}>` : fromEmail}
            </span>
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
          Resend configuration saved.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">From name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">From email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hello@yourcompany.com"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{configured ? 'Replace API key' : 'Resend API key'}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={revealed ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSave && handleSave()}
              placeholder="re_…"
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
            disabled={isSaving || !canSave}
            className="shrink-0"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
          </Button>
        </div>
        {error && (
          <p className="text-xs text-destructive rounded bg-destructive/10 px-2 py-1">{error}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Used to send email drafts. Get a free API key at{' '}
          <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            resend.com
          </a>. Your sending domain must be verified in Resend first.
        </p>
      </div>
    </div>
  )
}
