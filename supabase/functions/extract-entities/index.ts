import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedEntity {
  type: 'person' | 'company' | 'topic' | 'objection' | 'buying_signal' | 'theme' | 'product' | 'competitor' | 'other'
  name: string
  snippet: string   // exact quote from the document
  context: string   // surrounding sentence
  confidence: number
}

interface ExtractedRelationship {
  from_name: string
  from_type: string
  to_name:   string
  to_type:   string
  relationship: string  // e.g. 'raised_objection', 'works_at', 'mentioned_with'
}

interface ExtractionResult {
  entities:      ExtractedEntity[]
  relationships: ExtractedRelationship[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function canonicalise(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) {
    console.warn('[extract-entities] GROQ_API_KEY not set — skipping')
    return new Response('API key not configured', { status: 200 })
  }

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

  // Fetch the document
  const { data: doc, error: docError } = await supabase
    .from('source_documents')
    .select('id, workspace_id, title, content, source_type, metadata, ingested_at')
    .eq('id', id)
    .single()

  if (docError || !doc) {
    return new Response('Document not found', { status: 404 })
  }

  // Skip contact-card-style docs — too short to extract meaningful entities
  if (!doc.content || doc.content.length < 200) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'content_too_short' }), { status: 200 })
  }

  // Skip if already extracted
  const { count } = await supabase
    .from('entity_mentions')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', id)

  if ((count ?? 0) > 0) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 })
  }

  // ─── Claude extraction ──────────────────────────────────────────────────────
  const prompt = `You are an entity extraction engine for a B2B sales intelligence platform.

Extract all meaningful entities and relationships from the following ${doc.source_type} document.

ENTITY TYPES (use exactly these):
- person       — named individuals (customers, prospects, colleagues)
- company      — organisations, accounts, clients
- topic        — recurring subjects, themes, feature requests, pain points
- objection    — explicit objections or blockers raised ("too expensive", "need security review")
- buying_signal— positive intent signals ("asked about pricing", "wants a trial", "mentioned budget")
- theme        — patterns across the conversation (not single events)
- product      — product names, tools, platforms mentioned
- competitor   — competitor products or companies
- other        — anything important that doesn't fit above

Return ONLY valid JSON in this exact shape:
{
  "entities": [
    {
      "type": "objection",
      "name": "pricing too high",
      "snippet": "their exact words from the text",
      "context": "the sentence before and after",
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "from_name": "Sarah",
      "from_type": "person",
      "to_name": "Acme Corp",
      "to_type": "company",
      "relationship": "works_at"
    }
  ]
}

Rules:
- Only extract entities explicitly present in the text — no inference
- snippet must be a verbatim quote (max 200 chars)
- confidence: 1.0 = certain, 0.7 = probable, 0.5 = uncertain
- Deduplicate: if the same entity appears multiple times, return it once (best snippet)
- Relationships only when clearly stated
- Return empty arrays if nothing meaningful found

DOCUMENT (source: ${doc.source_type}, title: ${doc.title ?? 'untitled'}):
---
${doc.content.slice(0, 12000)}
---`

  let extraction: ExtractionResult
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      'llama-3.3-70b-versatile',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[extract-entities] Groq API error:', err)
      return new Response('Groq API error', { status: 500 })
    }

    const data = await response.json()
    const raw  = data.choices?.[0]?.message?.content ?? ''

    // Strip markdown fences then try to extract the JSON object/array
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    // Find the outermost JSON object in case the model added prose around it
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[extract-entities] no JSON object in Groq response — skipping doc', id)
      return new Response(JSON.stringify({ ok: true, entities: 0 }), { status: 200 })
    }

    try {
      extraction = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.warn('[extract-entities] JSON parse failed — skipping doc', id, parseErr)
      return new Response(JSON.stringify({ ok: true, entities: 0 }), { status: 200 })
    }
  } catch (e) {
    console.error('[extract-entities] Groq fetch error:', e)
    return new Response('Groq fetch error', { status: 500 })
  }

  if (!extraction.entities?.length) {
    return new Response(JSON.stringify({ ok: true, entities: 0 }), { status: 200 })
  }

  // ─── Upsert entities ────────────────────────────────────────────────────────
  const entityIdMap = new Map<string, string>()  // canonical_key → entity uuid

  for (const e of extraction.entities) {
    const canonical = canonicalise(e.name)
    const key       = `${e.type}::${canonical}`

    const { data: upserted, error: upsertErr } = await supabase
      .from('entities')
      .upsert(
        { workspace_id: doc.workspace_id, type: e.type, name: e.name, canonical_name: canonical },
        { onConflict: 'workspace_id,type,canonical_name', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (upsertErr) {
      console.error('[extract-entities] entity upsert failed:', upsertErr.message)
      continue
    }

    entityIdMap.set(key, upserted.id)

    // Insert the mention (entity ↔ document edge)
    await supabase.from('entity_mentions').insert({
      workspace_id: doc.workspace_id,
      entity_id:    upserted.id,
      document_id:  doc.id,
      snippet:      e.snippet?.slice(0, 500) ?? null,
      context:      e.context?.slice(0, 1000) ?? null,
      confidence:   e.confidence ?? 1.0,
      mentioned_at: doc.metadata?.started_at ?? doc.ingested_at,
      metadata:     {},
    })
  }

  // ─── Upsert relationships ───────────────────────────────────────────────────
  for (const r of (extraction.relationships ?? [])) {
    const fromKey = `${r.from_type}::${canonicalise(r.from_name)}`
    const toKey   = `${r.to_type}::${canonicalise(r.to_name)}`
    const fromId  = entityIdMap.get(fromKey)
    const toId    = entityIdMap.get(toKey)

    if (!fromId || !toId) continue

    // On conflict: increment evidence_count and refresh last_seen_at
    await supabase.rpc('upsert_entity_relationship', {
      p_workspace_id:   doc.workspace_id,
      p_from_entity_id: fromId,
      p_to_entity_id:   toId,
      p_relationship:   r.relationship,
    })
  }

  console.log(`[extract-entities] ${doc.id} → ${extraction.entities.length} entities, ${extraction.relationships?.length ?? 0} relationships`)
  return new Response(
    JSON.stringify({ ok: true, entities: extraction.entities.length, relationships: extraction.relationships?.length ?? 0 }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
