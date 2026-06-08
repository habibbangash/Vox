import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CHUNK_SIZE    = 1500
const CHUNK_OVERLAP = 200
const MIN_CHUNK_LEN = 60

const session = new Supabase.ai.Session('gte-small')

// Strip HTML tags, decode common entities, collapse whitespace
function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|tr|h[1-6]|ul|ol|table|thead|tbody)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return text.trim() ? [text.trim()] : []

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length)

    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf('. ', end)
      if (sentenceEnd > start + CHUNK_SIZE * 0.5) {
        end = sentenceEnd + 1
      } else {
        const paraEnd = text.lastIndexOf('\n', end)
        if (paraEnd > start + CHUNK_SIZE * 0.5) end = paraEnd
      }
    }

    const chunk = text.slice(start, end).trim()
    if (chunk.length >= MIN_CHUNK_LEN) chunks.push(chunk)

    const next = end - CHUNK_OVERLAP
    if (next <= start) break
    start = next
  }

  return chunks
}

Deno.serve(async (req: Request) => {
  let id: string
  try {
    const body = await req.json()
    id = body.id
    if (!id) throw new Error('missing id')
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  const { data: doc, error } = await supabase
    .from('source_documents')
    .select('id, workspace_id, title, content')
    .eq('id', id)
    .single()

  if (error || !doc) {
    return new Response('Document not found', { status: 404 })
  }

  const cleanContent = stripHtml(doc.content ?? '')
  const cleanTitle   = stripHtml(doc.title   ?? '')
  const fullText     = [cleanTitle, cleanContent].filter(Boolean).join('\n\n')
  const chunks       = chunkText(fullText)

  if (chunks.length === 0) {
    console.warn(`[embed-document] ${id} produced no chunks after cleaning — skipping`)
    await supabase.from('source_documents').update({ processed: true }).eq('id', doc.id)
    return new Response('No content to embed', { status: 200 })
  }

  const rows: {
    document_id:  string
    workspace_id: string
    chunk_index:  number
    content:      string
    token_count:  number
    embedding:    string
  }[] = []

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await session.run(chunks[i], { mean_pool: true, normalize: true })
    rows.push({
      document_id:  doc.id,
      workspace_id: doc.workspace_id,
      chunk_index:  i,
      content:      chunks[i],
      token_count:  Math.ceil(chunks[i].length / 4),
      embedding:    JSON.stringify(embedding),
    })
  }

  await supabase.from('document_chunks').delete().eq('document_id', doc.id)

  const { error: insertError } = await supabase
    .from('document_chunks')
    .insert(rows)

  if (insertError) {
    console.error('[embed-document] chunk insert failed:', insertError.message)
    return new Response('Insert failed', { status: 500 })
  }

  const { error: updateError } = await supabase
    .from('source_documents')
    .update({ processed: true })
    .eq('id', doc.id)

  if (updateError) {
    console.error('[embed-document] processed update failed:', updateError.message)
    return new Response('Update failed', { status: 500 })
  }

  console.log(`[embed-document] ${doc.id} → ${chunks.length} chunks (html stripped)`)
  return new Response(
    JSON.stringify({ ok: true, chunks: chunks.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
