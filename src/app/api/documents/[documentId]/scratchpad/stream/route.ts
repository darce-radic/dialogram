import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { subscribeScratchpad } from '@/lib/queue/redis-pubsub'

interface RouteContext {
  params: Promise<{ documentId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { documentId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('workspace_id')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single()

  if (!doc) {
    return new Response(JSON.stringify({ error: 'Document not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { authorized } = await requireWorkspaceMembership(
    supabase,
    user.id,
    doc.workspace_id
  )
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Send backfill — last 20 events from DB
      try {
        const admin = createAdminClient()
        const { data: recentEvents } = await admin
          .from('scratchpad_events')
          .select('*')
          .eq('document_id', documentId)
          .order('created_at', { ascending: false })
          .limit(20)

        if (recentEvents) {
          // Send oldest first
          for (const event of recentEvents.reverse()) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
          }
        }
      } catch {
        // Backfill failure is non-fatal
      }

      // Subscribe via shared Redis pub/sub connection (not per-SSE-client)
      let unsubscribe: (() => void) | null = null
      try {
        unsubscribe = await subscribeScratchpad(
          documentId,
          (message: string) => {
            try {
              controller.enqueue(
                encoder.encode(`data: ${message}\n\n`)
              )
            } catch {
              // Stream closed
            }
          }
        )
      } catch {
        // Redis unavailable — SSE still works with backfill only
      }

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30000)

      // Cleanup when client disconnects
      _request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        if (unsubscribe) unsubscribe()
      })

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      )
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
