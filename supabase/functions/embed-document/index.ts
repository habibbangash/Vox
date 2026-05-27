import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// gte-small: 512-token limit ≈ 1500 safe chars per chunk
const CHUNK_SIZE    = 1500
const CHUNK_OVERLAP = 200
const MIN_CHUNK_LEN = 60

// Session reused across invocations — model stays loaded in the worker
const session = new Supabase.ai.Session('gte-small')

// Split text into overlapping chunks at sentence/paragraph boundaries
function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return text.trim() ? [text.trim()] : []

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length)

    if (end < text.length) {
      // Prefer sentence boundary near the end of the window
      const sentenceEnd = text.lastIndexOf('. ', end)
      if (sentenceEnd > start + CHUNK_SIZE * 0.5) {
        end = sentenceEnd + 1
      } else {
        // Fall back to paragraph boundary
        const paraEnd = text.lastIndexOf('\n', end)
        if (paraEnd > start + CHUNK_SIZE * 0.5) end = paraEnd
      }
    }

    const chunk = text.slice(start, end).trim()
    if (chunk.length >= MIN_CHUNK_LEN) chunks.push(chunk)

    // Advance with overlap so context bridges chunk boundaries
    const next = end - CHUNK_OVERLAP
    if (next <= start) break  // guard against infinite loop on pathological input
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

  // Prepend title to the full content so every chunk carries document context
  const fullText = [doc.title, doc.content].filter(Boolean).join('\n\n')
  const chunks   = chunkText(fullText)

  if (chunks.length === 0) {
    console.warn(`[embed-document] document ${id} produced no chunks — skipping`)
    return new Response('No content to embed', { status: 200 })
  }

  // Embed each chunk sequentially (gte-small inference is fast, ~50ms each)
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

  // Delete any previous chunks (handles re-processing) then insert new ones
  await supabase.from('document_chunks').delete().eq('document_id', doc.id)

  const { error: insertError } = await supabase
    .from('document_chunks')
    .insert(rows)

  if (insertError) {
    console.error('[embed-document] chunk insert failed:', insertError.message)
    return new Response('Insert failed', { status: 500 })
  }

  // Mark processed = true → fires extract-entities trigger
  const { error: updateError } = await supabase
    .from('source_documents')
    .update({ processed: true })
    .eq('id', doc.id)

  if (updateError) {
    console.error('[embed-document] processed update failed:', updateError.message)
    return new Response('Update failed', { status: 500 })
  }

  console.log(`[embed-document] ${doc.id} → ${chunks.length} chunks`)
  return new Response(
    JSON.stringify({ ok: true, chunks: chunks.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
