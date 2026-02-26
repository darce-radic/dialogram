export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Dialogram API',
    version: '0.2.0',
    description:
      'API for collaborative documents where users and agents create comments, branches, scratchpad events, and agent memory.',
  },
  servers: [
    {
      url: '/api',
      description: 'Relative API base (same host)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT or dlg_ agent key',
      },
    },
    schemas: {
      ErrorEnvelope: {
        type: 'object',
        properties: {
          data: { type: ['object', 'null'] },
          error: { type: ['string', 'null'] },
        },
      },
      CommunicationContract: {
        type: 'object',
        required: [
          'intent',
          'assumptions',
          'action_plan',
          'confidence',
          'needs_input',
        ],
        properties: {
          intent: { type: 'string' },
          assumptions: { type: 'array', items: { type: 'string' } },
          action_plan: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          needs_input: { type: 'boolean' },
          question: { type: 'string' },
        },
      },
      MentionTarget: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['user', 'agent'] },
        },
      },
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          workspace_id: { type: 'string', format: 'uuid' },
          folder_id: { type: ['string', 'null'], format: 'uuid' },
          title: { type: 'string' },
          content: { type: ['object', 'null'] },
          position: { type: 'number' },
          created_by: { type: 'string', format: 'uuid' },
          last_edited_by: { type: ['string', 'null'], format: 'uuid' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          deleted_at: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      CommentThread: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          document_id: { type: 'string', format: 'uuid' },
          thread_type: { type: 'string', enum: ['inline', 'document'] },
          inline_ref: { type: ['object', 'null'] },
          resolved: { type: 'boolean' },
          created_by: { type: 'string', format: 'uuid' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          thread_id: { type: 'string', format: 'uuid' },
          document_id: { type: 'string', format: 'uuid' },
          author_id: { type: 'string', format: 'uuid' },
          body: { type: 'string' },
          metadata: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      DocumentBranch: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          source_document_id: { type: 'string', format: 'uuid' },
          branch_document_id: { type: 'string', format: 'uuid' },
          branch_name: { type: 'string' },
          status: { type: 'string', enum: ['open', 'merged', 'rejected'] },
          created_by: { type: 'string', format: 'uuid' },
          created_by_type: { type: 'string', enum: ['user', 'agent'] },
          merged_by: { type: ['string', 'null'], format: 'uuid' },
          merged_at: { type: ['string', 'null'], format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      ScratchpadEvent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          document_id: { type: 'string', format: 'uuid' },
          agent_key_id: { type: 'string', format: 'uuid' },
          event_type: {
            type: 'string',
            enum: ['thinking', 'tool_use', 'progress', 'error'],
          },
          content: { type: 'string' },
          metadata: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      AgentMemory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          agent_key_id: { type: 'string', format: 'uuid' },
          workspace_id: { type: 'string', format: 'uuid' },
          document_id: { type: ['string', 'null'], format: 'uuid' },
          content: { type: 'string' },
          metadata: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/openapi.json': {
      get: {
        summary: 'Get OpenAPI specification',
        responses: {
          '200': { description: 'OpenAPI JSON' },
        },
      },
    },
    '/workspaces': {
      post: {
        summary: 'Create workspace',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Workspace created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/workspaces/{workspaceId}/documents': {
      get: {
        summary: 'List workspace documents',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'workspaceId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Documents listed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/workspaces/{workspaceId}/members': {
      get: {
        summary: 'List workspace members',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'workspaceId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Members listed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/documents': {
      get: {
        summary: 'List documents by workspace',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Documents listed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        summary: 'Create document',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Document created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/documents/{documentId}': {
      get: {
        summary: 'Get document',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Document fetched' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        operationId: 'updateDocument',
        summary: 'Update document (agents propose branches by default)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'object' },
                  folder_id: { type: ['string', 'null'] },
                  position: { type: 'number' },
                  apply_directly: { type: 'boolean' },
                },
              },
              examples: {
                branchProposalDefault: {
                  value: {
                    title: 'Revised spec',
                    content: { type: 'doc', content: [] },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Direct update. Response data.mode = "direct_update".',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        mode: { type: 'string', enum: ['direct_update'] },
                        document: { $ref: '#/components/schemas/Document' },
                      },
                    },
                    error: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
          '202': {
            description:
              'Branch proposal created. Response data.mode = "branch_proposal".',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        mode: { type: 'string', enum: ['branch_proposal'] },
                        branch: { $ref: '#/components/schemas/DocumentBranch' },
                        document: { $ref: '#/components/schemas/Document' },
                      },
                    },
                    error: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
      delete: {
        summary: 'Soft-delete document',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Document deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/documents/{documentId}/threads': {
      get: {
        summary: 'List comment threads',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Threads listed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        operationId: 'createThread',
        summary: 'Create comment thread',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  thread_type: { type: 'string', enum: ['inline', 'document'] },
                  inline_ref: {
                    type: 'object',
                    properties: {
                      from: { type: 'number' },
                      to: { type: 'number' },
                    },
                  },
                  content: { type: 'string' },
                  communication: {
                    $ref: '#/components/schemas/CommunicationContract',
                  },
                  mentions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/MentionTarget' },
                  },
                },
              },
              examples: {
                agentThread: {
                  value: {
                    thread_type: 'document',
                    content: 'Initial review from agent',
                    communication: {
                      intent: 'Review clarity',
                      assumptions: ['Audience is technical'],
                      action_plan: ['Read section', 'Suggest edits'],
                      confidence: 0.82,
                      needs_input: false,
                    },
                    mentions: [{ id: 'user-id-1', type: 'user' }],
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Thread created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      allOf: [
                        { $ref: '#/components/schemas/CommentThread' },
                        {
                          type: 'object',
                          properties: {
                            comments: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Comment' },
                            },
                          },
                        },
                      ],
                    },
                    error: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/documents/{documentId}/threads/{threadId}': {
      patch: {
        summary: 'Update thread (resolve/unresolve)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'documentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'threadId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Thread updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
      delete: {
        summary: 'Delete thread',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'documentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'threadId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Thread deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/documents/{documentId}/threads/{threadId}/comments': {
      post: {
        operationId: 'replyThread',
        summary: 'Reply in thread',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string' },
          },
          {
            in: 'path',
            name: 'threadId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string' },
                  communication: {
                    $ref: '#/components/schemas/CommunicationContract',
                  },
                  mentions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/MentionTarget' },
                  },
                },
              },
              examples: {
                agentReply: {
                  value: {
                    content: 'Proposed rewrite is ready for review.',
                    communication: {
                      intent: 'Share rewrite proposal',
                      assumptions: ['Keep tone concise'],
                      action_plan: ['Present one variant'],
                      confidence: 0.73,
                      needs_input: true,
                      question: 'Approve this wording?',
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Comment created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Comment' },
                    error: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/documents/{documentId}/scratchpad': {
      post: {
        operationId: 'pushScratchpadEvent',
        summary: 'Create scratchpad event (agent-auth only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content', 'communication', 'metadata'],
                properties: {
                  event_type: {
                    type: 'string',
                    enum: ['thinking', 'tool_use', 'progress', 'error'],
                  },
                  content: { type: 'string' },
                  communication: {
                    $ref: '#/components/schemas/CommunicationContract',
                  },
                  metadata: {
                    type: 'object',
                    properties: {
                      lifecycle_state: {
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
                    },
                    required: ['lifecycle_state'],
                  },
                },
              },
              examples: {
                progressEvent: {
                  value: {
                    event_type: 'progress',
                    content: 'Drafting options for section 2',
                    metadata: { lifecycle_state: 'drafting' },
                    communication: {
                      intent: 'Improve section clarity',
                      assumptions: ['Audience is technical'],
                      action_plan: ['Draft two variants', 'Ask for pick'],
                      confidence: 0.66,
                      needs_input: false,
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Scratchpad event created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/ScratchpadEvent' },
                    error: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/documents/{documentId}/scratchpad/stream': {
      get: {
        summary: 'Stream scratchpad events (SSE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'SSE stream' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/documents/{documentId}/branches': {
      get: {
        summary: 'List document branches',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'documentId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Branches listed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        summary: 'Create document branch',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'documentId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '201': { description: 'Branch created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/documents/{documentId}/branches/{branchId}': {
      get: {
        summary: 'Get branch with source/branch documents',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'documentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'branchId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Branch fetched' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        summary: 'Merge or reject branch',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'documentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'branchId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Branch updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/folders': {
      get: {
        summary: 'List folders by workspace',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Folders listed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        summary: 'Create folder',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Folder created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/folders/{folderId}': {
      get: {
        summary: 'Get folder',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'folderId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Folder fetched' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        summary: 'Update folder',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'folderId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Folder updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
      delete: {
        summary: 'Soft-delete folder',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'folderId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Folder deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/agent-keys': {
      get: {
        summary: 'List agent keys for workspace',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Agent keys listed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        summary: 'Create agent key',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Agent key created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/agent-keys/names': {
      get: {
        summary: 'List active agent names and IDs for mentions',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Agent names listed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/agent-keys/{keyId}': {
      patch: {
        summary: 'Update agent key',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'keyId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Agent key updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
          '429': { description: 'Rate limited' },
        },
      },
      delete: {
        summary: 'Delete agent key',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'keyId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Agent key deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/agent-memory': {
      get: {
        summary: 'List agent memories',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Memories listed' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limited' },
        },
      },
      post: {
        summary: 'Create agent memory',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Memory created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/agent-memory/search': {
      post: {
        summary: 'Vector search agent memories',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Memory search results' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/agent-memory/{memoryId}': {
      delete: {
        summary: 'Delete agent memory',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'memoryId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Memory deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/agent-runs': {
      get: {
        summary: 'List agent runs',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Runs listed' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        summary: 'Create agent run',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Run created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '409': { description: 'Active run already exists' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/agent-runs/{runId}': {
      get: {
        summary: 'Get run details and summary',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Run fetched' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Run not found' },
        },
      },
      patch: {
        summary: 'Update run status or settings',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Run updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Run not found' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/agent-runs/{runId}/board': {
      get: {
        summary: 'Get run board view',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Board fetched' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Run not found' },
        },
      },
    },
    '/agent-runs/{runId}/tasks': {
      post: {
        summary: 'Create run task',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Task created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Run not found' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/agent-runs/{runId}/tasks/{taskId}': {
      patch: {
        summary: 'Update run task',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Task updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Run/task not found' },
          '429': { description: 'Rate limited' },
        },
      },
    },
  },
} as const
