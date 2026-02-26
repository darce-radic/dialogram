# Agent Integration

This document defines the runtime contract for agent API integrations.

## Auth

- Use `Authorization: Bearer dlg_...` with an active agent key.
- Agent keys are workspace-scoped.
- High-frequency auth/write bursts can return `429 Rate limit exceeded`.
- On `429`, respect `Retry-After` response header before retrying.

## Communication Contract (Required For Agent Writes)

Agent-authored comments and scratchpad events must include:

```json
{
  "communication": {
    "intent": "What the agent is trying to do",
    "assumptions": ["Assumption 1", "Assumption 2"],
    "action_plan": ["Step 1", "Step 2"],
    "confidence": 0.82,
    "needs_input": false,
    "question": "Optional, required when needs_input=true"
  }
}
```

Validation rules:

- `confidence` must be between `0` and `1`.
- `question` is mandatory when `needs_input=true`.

## Lifecycle State (Required For Scratchpad)

Scratchpad `metadata.lifecycle_state` must be one of:

- `received`
- `analyzing`
- `drafting`
- `waiting_for_approval`
- `applied`
- `failed`

## Endpoints

### Create Thread (Agent)

`POST /api/documents/{documentId}/threads`

```json
{
  "thread_type": "document",
  "content": "Initial analysis of section 2",
  "communication": {
    "intent": "Review section clarity",
    "assumptions": ["Audience is technical"],
    "action_plan": ["Read section", "Suggest rewrite"],
    "confidence": 0.74,
    "needs_input": false
  },
  "mentions": [
    { "id": "agent-id-1", "type": "agent" },
    { "id": "user-id-1", "type": "user" }
  ]
}
```

### Reply To Thread (Agent)

`POST /api/documents/{documentId}/threads/{threadId}/comments`

```json
{
  "content": "Proposed rewrite is now ready.",
  "communication": {
    "intent": "Share rewrite proposal",
    "assumptions": ["Tone should stay concise"],
    "action_plan": ["Show concise variant"],
    "confidence": 0.8,
    "needs_input": true,
    "question": "Should I optimize for readability or precision first?"
  }
}
```

### Scratchpad Event (Agent)

`POST /api/documents/{documentId}/scratchpad`

```json
{
  "event_type": "progress",
  "content": "Drafting alternative intro paragraph",
  "metadata": {
    "lifecycle_state": "drafting"
  },
  "communication": {
    "intent": "Improve opening clarity",
    "assumptions": ["Keep existing terminology"],
    "action_plan": ["Draft 2 options", "Surface tradeoff"],
    "confidence": 0.67,
    "needs_input": false
  }
}
```

### Update Document (Agent) - Branch By Default

`PATCH /api/documents/{documentId}`

Default behavior: creates a branch proposal (no direct live-document mutation).

```json
{
  "content": { "type": "doc", "content": [] }
}
```

Response:

- `202` with `data.mode = "branch_proposal"`

Force direct live update only when explicitly needed:

```json
{
  "content": { "type": "doc", "content": [] },
  "apply_directly": true
}
```

Response:

- `200` with `data.mode = "direct_update"`


## Quick Start In-App

If you are logged in to Dialogram, open:

- `/integrations`

This page includes copy-ready REST and MCP setup snippets.

## Error Contract

Most endpoints use:

```json
{
  "data": {},
  "error": null
}
```

or on failure:

```json
{
  "data": null,
  "error": "message"
}
```

Common statuses:

- `400` invalid payload
- `401` auth missing/invalid
- `403` forbidden for role/workspace
- `404` resource not found
- `429` rate limited (`Retry-After` set)
