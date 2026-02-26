# Multi-Agent V1 Implementation Spec

Status: Proposed V1 (intentionally minimal)
Owner: Product + Engineering
Last Updated: 2026-02-26

## Goal

Enable multiple specialized agents to collaborate on one document without adding operational overhead.

Success criteria:
- 3 specialist agents can run in parallel on one document.
- All edits land as branch proposals (no direct live edits by default).
- A single coordinator can synthesize and hand off for merge.
- Humans can understand progress in one screen.

Non-goals (V1):
- No autonomous cross-workspace orchestration.
- No custom workflow builder.
- No dynamic role/permission DSL.

## Design Principles (Keep It Simple)

- One protocol: all agents use the same communication contract.
- One orchestration primitive: task run + tasks.
- One merge gate: reviewer/human approval.
- Fixed role templates instead of free-form policies.
- Strict defaults enforced by backend, not manual policing.

## V1 Agent Model

Roles (fixed templates):
- `coordinator`: can create tasks, reassign, close run, synthesize output.
- `researcher`: can comment + scratchpad.
- `writer`: can comment + propose branch changes.
- `reviewer`: can comment + approve/reject branch.
- `qa`: can comment + run validation checklist output.

Permission policy:
- Only `writer` can propose content branches.
- No agent role can directly merge; merge stays user `owner/admin`.
- All agent document writes default to `branch_proposal`.

## Data Model (DB Additions)

### 1) `agent_runs`

Purpose: top-level multi-agent execution context for one document.

Columns:
- `id uuid pk`
- `workspace_id uuid not null`
- `document_id uuid not null`
- `created_by uuid not null` (user id)
- `coordinator_agent_key_id uuid not null`
- `status text not null check (status in ('active','blocked','completed','cancelled'))`
- `objective text not null`
- `constraints jsonb not null default '{}'::jsonb`
- `max_parallel_agents int not null default 3`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:
- `(workspace_id, document_id, status)`
- `(created_at desc)`

### 2) `agent_tasks`

Purpose: single shared unit of work.

Columns:
- `id uuid pk`
- `run_id uuid not null references agent_runs(id) on delete cascade`
- `workspace_id uuid not null`
- `document_id uuid not null`
- `title text not null`
- `document_scope jsonb null` (e.g. section range, heading ids)
- `assigned_agent_key_id uuid not null`
- `task_type text not null check (task_type in ('research','write','review','qa','synthesis'))`
- `status text not null check (status in ('todo','in_progress','blocked','done'))`
- `depends_on uuid[] not null default '{}'::uuid[]`
- `acceptance_criteria jsonb not null default '[]'::jsonb`
- `output_ref jsonb null` (thread/comment/branch ids)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:
- `(run_id, status)`
- `(assigned_agent_key_id, status)`
- `(workspace_id, document_id)`

Constraints / guardrails:
- Max active tasks per run enforced by service layer: `<= max_parallel_agents`.
- Prevent conflicting `document_scope` overlap for `write` tasks in same run.

## API Additions (V1)

All under `/api/agent-runs`.

### `POST /api/agent-runs`
Create run.

Request:
- `workspace_id`
- `document_id`
- `coordinator_agent_key_id`
- `objective`
- `constraints`

Response:
- `201` run object

### `GET /api/agent-runs?workspaceId=&documentId=&status=`
List runs.

### `GET /api/agent-runs/{runId}`
Get run + tasks summary counters.

### `PATCH /api/agent-runs/{runId}`
Allowed transitions:
- `active -> blocked|completed|cancelled`
- `blocked -> active|cancelled`

### `POST /api/agent-runs/{runId}/tasks`
Create task.

Request:
- `title`
- `task_type`
- `assigned_agent_key_id`
- `document_scope`
- `depends_on`
- `acceptance_criteria`

### `PATCH /api/agent-runs/{runId}/tasks/{taskId}`
Update task status/assignment/output_ref.

Rules:
- `done` allowed only if dependencies are `done`.
- `blocked` requires reason in `output_ref.block_reason`.

### `GET /api/agent-runs/{runId}/board`
Board-optimized response for UI.

## Runtime Rules (Enforced)

- Agent comments/scratchpad must include communication contract (already implemented).
- Writer task completion must include either:
  - branch proposal reference in `output_ref.branch_id`, or
  - explicit `no_change_reason`.
- Run completion blocked when:
  - any task not `done`, or
  - unresolved `needs_input=true` artifacts remain open.

## UI V1

Single page: `Run Board` (inside document view)

Sections:
- Header: objective, run status, active agents count.
- Task columns: `todo`, `in_progress`, `blocked`, `done`.
- Merge readiness panel:
  - unresolved questions count
  - open branch proposals
  - QA checklist pass/fail

Actions:
- Create run
- Add task
- Reassign task
- Mark blocked/done
- Open linked thread/branch
- Finalize run (coordinator)

Keep out of V1 UI:
- No gantt/timeline builder.
- No nested dependency graph rendering.
- No customizable workflows.

## Automation Defaults (No Policing Overhead)

Backend defaults:
- `max_parallel_agents = 3`
- auto-timeout task in `in_progress` after N minutes of inactivity -> `blocked`
- auto-escalate blocked task to coordinator comment thread
- one active run per document by default (configurable later)

Rate limits:
- Reuse existing route-level rate limiter for run/task mutations.

## OpenAPI / MCP

OpenAPI:
- Add paths for all `/api/agent-runs*` endpoints.
- Include schemas: `AgentRun`, `AgentTask`, `RunBoard`.

MCP tools (minimal):
- `create_run`
- `list_runs`
- `create_task`
- `update_task`
- `get_run_board`

Do not add in V1:
- automatic tool-chaining or agent spawning in MCP server.

## Rollout Plan

Phase A (Backend + DB):
1. Add migrations for `agent_runs`, `agent_tasks`.
2. Implement API routes and validation.
3. Add contract tests for status transitions + dependency enforcement.

Phase B (UI):
1. Add Run Board view (document-scoped).
2. Add task CRUD interactions.
3. Add merge readiness panel.

Phase C (Integration):
1. Extend OpenAPI + docs.
2. Add MCP tools for runs/tasks.
3. Add quick-start examples.

## Minimal Test Matrix

- Create run with valid coordinator key.
- Reject run for cross-workspace coordinator.
- Create task with invalid dependency -> `400`.
- Prevent task `done` when dependency not `done`.
- Prevent run `completed` with unresolved `needs_input`.
- Ensure writer tasks reference branch proposal or explicit no-change reason.

## Operational Simplicity Checklist

Keep this true for V1:
- <= 5 agent role templates.
- <= 4 task statuses.
- exactly 1 run board surface.
- 0 manual policy tuning required for normal usage.

If any item breaks, do not add feature; simplify first.
