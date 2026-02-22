import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateAgent } from '@/lib/supabase/agent-auth'

export async function POST(request: Request) {
  const agentAuth = await authenticateAgent(
    request.headers.get('authorization')
  )
  if (!agentAuth.authenticated || !agentAuth.agentKey) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { data: null, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.embedding || !Array.isArray(body.embedding)) {
    return NextResponse.json(
      { data: null, error: 'embedding array is required' },
      { status: 400 }
    )
  }

  // Validate embedding dimensions and contents
  if (
    body.embedding.length !== 1536 ||
    !body.embedding.every(
      (v: unknown) => typeof v === 'number' && Number.isFinite(v)
    )
  ) {
    return NextResponse.json(
      { data: null, error: 'embedding must be an array of 1536 finite numbers' },
      { status: 400 }
    )
  }

  const limit = Math.min(
    Math.max(1, parseInt(String(body.limit ?? 10), 10) || 10),
    200
  )
  const admin = createAdminClient()

  // Use parameterized RPC to avoid SQL injection
  const { data, error } = await admin.rpc('match_agent_memories', {
    query_embedding: JSON.stringify(body.embedding),
    match_workspace_id: agentAuth.agentKey.workspace_id,
    match_document_id: body.document_id ?? null,
    match_limit: limit,
  })

  // Fallback: if the RPC doesn't exist yet, use a simpler approach without similarity
  if (error) {
    let query = admin
      .from('agent_memories')
      .select('*')
      .eq('workspace_id', agentAuth.agentKey.workspace_id)
      .not('embedding', 'is', null)
      .limit(limit)

    if (body.document_id && typeof body.document_id === 'string') {
      query = query.eq('document_id', body.document_id)
    }

    const { data: fallbackData, error: fallbackError } = await query

    if (fallbackError) {
      return NextResponse.json(
        { data: null, error: fallbackError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: fallbackData ?? [], error: null })
  }

  return NextResponse.json({ data: data ?? [], error: null })
}
