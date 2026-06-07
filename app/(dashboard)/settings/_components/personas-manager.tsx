'use client'
import { useState, useTransition } from 'react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createPersona, deletePersona, type Persona, type PersonaActionState } from '@/app/actions/personas'
import { Trash2, Plus, Users } from 'lucide-react'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

interface Props {
  initialPersonas: Persona[]
}

export function PersonasManager({ initialPersonas }: Props) {
  const [personas, setPersonas] = useState<Persona[]>(initialPersonas)
  const [showForm, setShowForm]   = useState(false)
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [deleting, startDelete]   = useTransition()

  const [state, action, pending] = useActionState<PersonaActionState, FormData>(
    async (_, formData) => {
      formData.set('color', selectedColor)
      const result = await createPersona(_, formData)
      if (result?.success) {
        // Optimistic: re-fetch would require server round-trip; just reload
        window.location.reload()
      }
      return result
    },
    undefined
  )

  async function handleDelete(personaId: string) {
    startDelete(async () => {
      await deletePersona(personaId)
      setPersonas((prev) => prev.filter((p) => p.id !== personaId))
    })
  }

  return (
    <div className="space-y-4">
      {personas.length === 0 && !showForm && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <Users className="size-4 shrink-0" />
          <span>No personas yet. Add one to generate content tailored to specific audience segments.</span>
        </div>
      )}

      {personas.length > 0 && (
        <div className="space-y-2">
          {personas.map((p) => (
            <div key={p.id} className="flex items-start justify-between rounded-lg border p-3 gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 size-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                  )}
                  {p.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.keywords.map((kw) => (
                        <span key={kw} className="inline-flex rounded-full bg-muted px-1.5 py-0 text-xs text-muted-foreground font-medium">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(p.id)}
                disabled={deleting}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form action={action} className="space-y-3 rounded-lg border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="persona-name" className="text-xs">Persona name *</Label>
            <Input id="persona-name" name="name" placeholder="e.g. Broadcast Engineers" required className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="persona-desc" className="text-xs">Description</Label>
            <Textarea
              id="persona-desc"
              name="description"
              placeholder="e.g. Senior engineers at TV broadcast companies who care about reliability and latency"
              className="text-sm resize-none min-h-[60px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="persona-keywords" className="text-xs">
              Keywords <span className="text-muted-foreground">(comma-separated job titles, roles, or industries)</span>
            </Label>
            <Input
              id="persona-keywords"
              name="keywords"
              placeholder="e.g. broadcast engineer, production engineer, live video"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Colour</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className="size-5 rounded-full ring-offset-background transition-shadow"
                  style={{
                    backgroundColor: c,
                    boxShadow: selectedColor === c ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Save persona'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="size-3.5" />
          Add persona
        </Button>
      )}
    </div>
  )
}
