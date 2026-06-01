import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// Session reused across invocations — model loads once per worker lifecycle
const session = new Supabase.ai.Session('gte-small')

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let text: string
  try {
    const body = await req.json()
    text = body.text?.trim()
    if (!text) throw new Error('missing text')
  } catch {
    return new Response('Bad request — expected { text: string }', { status: 400 })
  }

  // Truncate to ~2000 chars to stay within gte-small's 512-token limit
  const input = text.slice(0, 2000)

  const embedding = await session.run(input, {
    mean_pool: true,
    normalize: true,
  })

  return Response.json({ embedding })
})
