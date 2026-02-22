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

  if (!body.content) {
    return NextResponse.json(
      { data: null, error: 'content is required' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const insertData: Record<string, unknown> = {
    agent_key_id: agentAuth.agentKey.id,
    workspace_id: agentAuth.agentKey.workspace_id,
    content: body.content,
    metadata: body.metadata ?? {},
  }

  if (body.document_id) {
    insertData.document_id = body.document_id
  }

  if (body.embedding && Array.isArray(body.embedding)) {
    insertData.embedding = JSON.stringify(body.embedding)
  }

  const { data, error } = await admin
    .from('agent_memories')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}

export async function GET(request: Request) {
  const agentAuth = await authenticateAgent(
    request.headers.get('authorization')
  )
  if (!agentAuth.authenticated || !agentAuth.agentKey) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('document_id')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)

  const admin = createAdminClient()

  let query = admin
    .from('agent_memories')
    .select('*')
    .eq('workspace_id', agentAuth.agentKey.workspace_id)
    .eq('agent_key_id', agentAuth.agentKey.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (documentId) {
    query = query.eq('document_id', documentId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: data ?? [], error: null })
}
