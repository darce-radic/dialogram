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

  const body = await request.json()

  if (!body.embedding || !Array.isArray(body.embedding)) {
    return NextResponse.json(
      { data: null, error: 'embedding array is required' },
      { status: 400 }
    )
  }

  const limit = body.limit ?? 10
  const admin = createAdminClient()

  // Use pgvector cosine similarity search via raw SQL
  const embeddingStr = `[${body.embedding.join(',')}]`

  let sql = `
    SELECT *, 1 - (embedding <=> '${embeddingStr}'::vector) AS similarity
    FROM public.agent_memories
    WHERE workspace_id = '${agentAuth.agentKey.workspace_id}'
      AND embedding IS NOT NULL
  `

  if (body.document_id) {
    sql += ` AND document_id = '${body.document_id}'`
  }

  sql += ` ORDER BY embedding <=> '${embeddingStr}'::vector LIMIT ${limit}`

  const { data, error } = await admin.rpc('exec_sql', { query: sql })

  // Fallback: if the RPC doesn't exist, use a simpler approach
  if (error) {
    // Try direct query without similarity score
    let query = admin
      .from('agent_memories')
      .select('*')
      .eq('workspace_id', agentAuth.agentKey.workspace_id)
      .not('embedding', 'is', null)
      .limit(limit)

    if (body.document_id) {
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
