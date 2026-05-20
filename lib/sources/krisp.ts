import { randomBytes } from 'crypto'

export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex')
}

export interface KrispWebhookPayload {
  meeting_id?: string
  id?: string
  title?: string
  meeting_title?: string
  transcript?: string
  content?: string
  host?: string
  organizer?: string
  started_at?: string
  ended_at?: string
  participants?: string[]
  [key: string]: unknown
}

export function extractDocumentFields(body: KrispWebhookPayload) {
  const external_id = (body.meeting_id ?? body.id ?? randomBytes(8).toString('hex')) as string
  const title = (body.title ?? body.meeting_title ?? 'Untitled Meeting') as string
  const content = (body.transcript ?? body.content ?? '') as string
  const author_name = (body.host ?? body.organizer ?? null) as string | null
  return { external_id, title, content, author_name }
}
