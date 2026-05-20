import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Session is reused across invocations — model is loaded once per worker lifecycle
const session = new Supabase.ai.Session('gte-small')

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
    .select('id, title, content')
    .eq('id', id)
    .single()

  if (error || !doc) {
    return new Response('Document not found', { status: 404 })
  }

  // gte-small max is 512 tokens (~2000 chars). Truncate title + content.
  const text = `${doc.title ?? ''}\n\n${doc.content ?? ''}`.slice(0, 2000)

  const embedding = await session.run(text, {
    mean_pool: true,
    normalize: true,
  })

  const { error: updateError } = await supabase
    .from('source_documents')
    .update({
      embedding: JSON.stringify(embedding),
      processed: true,
    })
    .eq('id', id)

  if (updateError) {
    console.error('[embed-document] update failed:', updateError.message)
    return new Response('Update failed', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})
