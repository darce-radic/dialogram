import { z } from 'zod'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const appUrl = (process.env.DIALOGRAM_APP_URL || '').replace(/\/+$/, '')

const agentKey = process.env.DIALOGRAM_AGENT_KEY

if (!agentKey) {
  console.error('DIALOGRAM_AGENT_KEY is required for MCP server')
  process.exit(1)
}

if (!appUrl) {
  console.error('DIALOGRAM_APP_URL is required for MCP server')
  process.exit(1)
}

const server = new Server(
  {
    name: 'dialogram-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

const communicationSchema = z.object({
  intent: z.string().min(1),
  assumptions: z.array(z.string()).default([]),
  action_plan: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
  needs_input: z.boolean(),
  question: z.string().optional(),
})

const mentionTargetSchema = z.object({
  id: z.string(),
  type: z.enum(['user', 'agent']),
})

const lifecycleStateSchema = z.enum([
  'received',
  'analyzing',
  'drafting',
  'waiting_for_approval',
  'applied',
  'failed',
])

async function apiFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${appUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentKey}`,
      ...(init.headers ?? {}),
    },
  })

  const text = await response.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_documents',
        description: 'List documents for a workspace (agent key must match workspace).',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string' },
            folderId: { type: 'string' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'list_threads',
        description: 'List comment threads for a document.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'get_document',
        description: 'Fetch a document by ID',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'update_document',
        description:
          'Update document content/title. Agent updates create branch proposal by default unless applyDirectly=true.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'object' },
            folderId: { type: ['string', 'null'] },
            position: { type: 'number' },
            applyDirectly: { type: 'boolean' },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'create_thread',
        description: 'Create a thread with structured communication contract.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            content: { type: 'string' },
            threadType: { type: 'string', enum: ['inline', 'document'] },
            communication: { type: 'object' },
            mentions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['user', 'agent'] },
                },
                required: ['id', 'type'],
              },
            },
          },
          required: ['documentId', 'content', 'communication'],
        },
      },
      {
        name: 'reply_thread',
        description: 'Reply to a thread with communication contract.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            threadId: { type: 'string' },
            content: { type: 'string' },
            communication: { type: 'object' },
            mentions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['user', 'agent'] },
                },
                required: ['id', 'type'],
              },
            },
          },
          required: ['documentId', 'threadId', 'content', 'communication'],
        },
      },
      {
        name: 'push_scratchpad',
        description: 'Write a lifecycle-stamped scratchpad event.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            content: { type: 'string' },
            eventType: {
              type: 'string',
              enum: ['thinking', 'tool_use', 'progress', 'error'],
            },
            lifecycleState: {
              type: 'string',
              enum: [
                'received',
                'analyzing',
                'drafting',
                'waiting_for_approval',
                'applied',
                'failed',
              ],
            },
            communication: { type: 'object' },
            metadata: { type: 'object' },
          },
          required: [
            'documentId',
            'content',
            'lifecycleState',
            'communication',
          ],
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const input = (args ?? {}) as Record<string, unknown>

  if (name === 'list_documents') {
    const parsed = z
      .object({
        workspaceId: z.string(),
        folderId: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
      .safeParse(input)
    if (!parsed.success) {
      return { content: [{ type: 'text', text: 'Invalid input for list_documents' }] }
    }

    const qs = new URLSearchParams()
    if (parsed.data.folderId) qs.set('folderId', parsed.data.folderId)
    if (parsed.data.limit !== undefined) qs.set('limit', String(parsed.data.limit))
    if (parsed.data.offset !== undefined) qs.set('offset', String(parsed.data.offset))

    const query = qs.toString()
    const res = await apiFetch(
      `/api/workspaces/${parsed.data.workspaceId}/documents${query ? `?${query}` : ''}`
    )
    return {
      content: [{ type: 'text', text: JSON.stringify(res.json, null, 2) }],
      isError: !res.ok,
    }
  }

  if (name === 'list_threads') {
    const parsed = z
      .object({
        documentId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
      .safeParse(input)
    if (!parsed.success) {
      return { content: [{ type: 'text', text: 'Invalid input for list_threads' }] }
    }

    const qs = new URLSearchParams()
    if (parsed.data.limit !== undefined) qs.set('limit', String(parsed.data.limit))
    if (parsed.data.offset !== undefined) qs.set('offset', String(parsed.data.offset))

    const query = qs.toString()
    const res = await apiFetch(
      `/api/documents/${parsed.data.documentId}/threads${query ? `?${query}` : ''}`
    )
    return {
      content: [{ type: 'text', text: JSON.stringify(res.json, null, 2) }],
      isError: !res.ok,
    }
  }

  if (name === 'get_document') {
    const parsed = z.object({ documentId: z.string() }).safeParse(input)
    if (!parsed.success) {
      return { content: [{ type: 'text', text: 'Invalid input for get_document' }] }
    }
    const res = await apiFetch(`/api/documents/${parsed.data.documentId}`)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(res.json, null, 2),
        },
      ],
      isError: !res.ok,
    }
  }

  if (name === 'update_document') {
    const parsed = z
      .object({
        documentId: z.string(),
        title: z.string().optional(),
        content: z.record(z.string(), z.unknown()).optional(),
        folderId: z.string().nullable().optional(),
        position: z.number().optional(),
        applyDirectly: z.boolean().optional(),
      })
      .safeParse(input)
    if (!parsed.success) {
      return { content: [{ type: 'text', text: 'Invalid input for update_document' }] }
    }

    const res = await apiFetch(`/api/documents/${parsed.data.documentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: parsed.data.title,
        content: parsed.data.content,
        folder_id: parsed.data.folderId,
        position: parsed.data.position,
        apply_directly: parsed.data.applyDirectly,
      }),
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(res.json, null, 2) }],
      isError: !res.ok,
    }
  }

  if (name === 'create_thread') {
    const parsed = z
      .object({
        documentId: z.string(),
        content: z.string().min(1),
        threadType: z.enum(['inline', 'document']).optional(),
        communication: communicationSchema,
        mentions: z.array(mentionTargetSchema).optional(),
      })
      .safeParse(input)
    if (!parsed.success) {
      return { content: [{ type: 'text', text: 'Invalid input for create_thread' }] }
    }

    const res = await apiFetch(`/api/documents/${parsed.data.documentId}/threads`, {
      method: 'POST',
      body: JSON.stringify({
        thread_type: parsed.data.threadType,
        content: parsed.data.content,
        communication: parsed.data.communication,
        mentions: parsed.data.mentions ?? [],
      }),
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(res.json, null, 2) }],
      isError: !res.ok,
    }
  }

  if (name === 'reply_thread') {
    const parsed = z
      .object({
        documentId: z.string(),
        threadId: z.string(),
        content: z.string().min(1),
        communication: communicationSchema,
        mentions: z.array(mentionTargetSchema).optional(),
      })
      .safeParse(input)
    if (!parsed.success) {
      return { content: [{ type: 'text', text: 'Invalid input for reply_thread' }] }
    }

    const res = await apiFetch(
      `/api/documents/${parsed.data.documentId}/threads/${parsed.data.threadId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({
          content: parsed.data.content,
          communication: parsed.data.communication,
          mentions: parsed.data.mentions ?? [],
        }),
      }
    )

    return {
      content: [{ type: 'text', text: JSON.stringify(res.json, null, 2) }],
      isError: !res.ok,
    }
  }

  if (name === 'push_scratchpad') {
    const parsed = z
      .object({
        documentId: z.string(),
        content: z.string().min(1),
        eventType: z
          .enum(['thinking', 'tool_use', 'progress', 'error'])
          .optional(),
        lifecycleState: lifecycleStateSchema,
        communication: communicationSchema,
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .safeParse(input)
    if (!parsed.success) {
      return { content: [{ type: 'text', text: 'Invalid input for push_scratchpad' }] }
    }

    const res = await apiFetch(
      `/api/documents/${parsed.data.documentId}/scratchpad`,
      {
        method: 'POST',
        body: JSON.stringify({
          event_type: parsed.data.eventType ?? 'thinking',
          content: parsed.data.content,
          metadata: {
            ...(parsed.data.metadata ?? {}),
            lifecycle_state: parsed.data.lifecycleState,
          },
          communication: parsed.data.communication,
        }),
      }
    )

    return {
      content: [{ type: 'text', text: JSON.stringify(res.json, null, 2) }],
      isError: !res.ok,
    }
  }

  return {
    isError: true,
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
  }
})

async function run() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Dialogram MCP server running on stdio')
}

run().catch((error) => {
  console.error('Failed to start MCP server', error)
  process.exit(1)
})
