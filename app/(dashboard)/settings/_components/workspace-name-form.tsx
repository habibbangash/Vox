'use client'
import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { updateWorkspaceName } from '@/app/actions/workspace'

interface WorkspaceNameFormProps {
  currentName: string
  isOwner: boolean
}

export function WorkspaceNameForm({ currentName, isOwner }: WorkspaceNameFormProps) {
  const [name, setName] = useState(currentName)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (name.trim() === currentName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await updateWorkspaceName(name)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-3 max-w-sm">
      <div className="space-y-1.5">
        <Label className="text-xs">Workspace name</Label>
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false) }}
          disabled={!isOwner || isPending}
          maxLength={60}
          className="h-9 text-sm"
        />
        {!isOwner && (
          <p className="text-xs text-muted-foreground">Only the workspace owner can change the name.</p>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {isOwner && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={isPending || name.trim() === currentName.trim()}
        >
          {saved
            ? <><Check className="size-3.5 mr-1.5 text-green-500" /> Saved</>
            : isPending ? 'Saving…' : 'Save name'}
        </Button>
      )}
    </div>
  )
}
