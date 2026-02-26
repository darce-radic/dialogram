import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { authenticateAgent } from '@/lib/supabase/agent-auth'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentKey, AgentRole, WorkspaceRole } from '@shared/types'

// ---------------------------------------------------------------------------
// Shared dual-auth context for API routes.
// Resolves user session first, falls back to agent key auth.
// ---------------------------------------------------------------------------

export type AuthContext =
  | {
      type: 'user'
      userId: string
      role: WorkspaceRole
      client: SupabaseClient
      workspaceId: string
    }
  | {
      type: 'agent'
      agentKey: AgentKey
      client: SupabaseClient // admin client
      workspaceId: string
    }

export type AuthError = {
  response: NextResponse
}

/**
 * Authenticate a request for a document-scoped route.
 * Tries user session first, then agent key auth.
 *
 * @param request - The incoming request
 * @param documentId - The document being accessed
 * @param options.requiredAgentRoles - Agent roles that are allowed (default: all)
 */
export async function authenticateDocumentRoute(
  request: Request,
  documentId: string,
  options: { requiredAgentRoles?: AgentRole[] } = {}
): Promise<AuthContext | AuthError> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // User auth path
    const { data: doc } = await supabase
      .from('documents')
      .select('workspace_id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (!doc) {
      return {
        response: NextResponse.json(
          { data: null, error: 'Document not found' },
          { status: 404 }
        ),
      }
    }

    const { authorized, role } = await requireWorkspaceMembership(
      supabase,
      user.id,
      doc.workspace_id
    )
    if (!authorized || !role) {
      return {
        response: NextResponse.json(
          { data: null, error: 'Forbidden' },
          { status: 403 }
        ),
      }
    }

    return {
      type: 'user',
      userId: user.id,
      role,
      client: supabase,
      workspaceId: doc.workspace_id,
    }
  }

  // Agent auth path
  const agentAuth = await authenticateAgent(
    request.headers.get('authorization'),
    request
  )
  if (agentAuth.rateLimited) {
    return {
      response: NextResponse.json(
        { data: null, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(agentAuth.retryAfterSeconds ?? 60),
          },
        }
      ),
    }
  }
  if (!agentAuth.authenticated || !agentAuth.agentKey) {
    return {
      response: NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  const { requiredAgentRoles } = options
  if (
    requiredAgentRoles &&
    !requiredAgentRoles.includes(agentAuth.agentKey.role)
  ) {
    return {
      response: NextResponse.json(
        {
          data: null,
          error: `Forbidden: ${requiredAgentRoles.join(' or ')} role required`,
        },
        { status: 403 }
      ),
    }
  }

  const admin = createAdminClient()
  const { data: doc } = await admin
    .from('documents')
    .select('workspace_id')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single()

  if (!doc) {
    return {
      response: NextResponse.json(
        { data: null, error: 'Document not found' },
        { status: 404 }
      ),
    }
  }

  if (doc.workspace_id !== agentAuth.agentKey.workspace_id) {
    return {
      response: NextResponse.json(
        { data: null, error: 'Forbidden' },
        { status: 403 }
      ),
    }
  }

  return {
    type: 'agent',
    agentKey: agentAuth.agentKey,
    client: admin,
    workspaceId: doc.workspace_id,
  }
}

/** Type guard to check if result is an error */
export function isAuthError(
  result: AuthContext | AuthError
): result is AuthError {
  return 'response' in result
}

/** Get the author ID from either auth context type */
export function getAuthorId(auth: AuthContext): string {
  return auth.type === 'user' ? auth.userId : auth.agentKey.id
}

/** Safe JSON body parsing */
export async function parseJsonBody(
  request: Request
): Promise<Record<string, unknown> | NextResponse> {
  try {
    return await request.json()
  } catch {
    return NextResponse.json(
      { data: null, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }
}

/** Type guard for parseJsonBody */
export function isParseError(
  result: Record<string, unknown> | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}
