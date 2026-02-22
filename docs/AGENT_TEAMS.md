# Dialogram — Claude Code Agent Teams

> **Goal**: Run specialized Claude Code sub-agents in parallel, each owning a vertical slice of the codebase. This dramatically reduces build time by eliminating sequential bottlenecks.

---

## Agent Roster

| Agent | Emoji | Specialty | Phase Ownership | Directory |
|---|---|---|---|---|
| `@Foundation` | 🏗️ | Next.js, Supabase, DB schema, Auth, RLS | Phase 1 (1A–1D) | `/` root + `/shared` |
| `@EditorCore` | ✏️ | TipTap, Yjs, CRDT, real-time presence, comments | Phase 1C + 1D | `/components/editor` |
| `@AgentCore` | 🤖 | Webhook engine, BullMQ, agent keys, @mention, Branching, Scratchpad, pgvector | Phase 2 (2A–2C) | `/lib/agents` + `/components/agent-ux` |
| `@DevOps` | 🐛 | GitHub App, Bug Triage, PR generation, E2B sandbox | Phase 3 (3A–3C) | `/lib/github` + `/components/bug-triage` |
| `@Features` | 🛸 | Swarms, Tool-Empowered Agents, Voice pipeline, Diagrams | Phase 4 (4A–4C) | `/lib/features` + `/components/features` |
| `@Federation` | 🌐 | Harvester pipeline, DCAT schema, Federated Agents, Marketplace | Phase 5 (5A–5C) | `/lib/federation` + `/components/marketplace` |

---

## Parallelization Map

```
Phase 1:  @Foundation ──────┬── Database schema (1B)
          @EditorCore ───────┴── Editor shell + CRDT sync (1C & 1D concurrent)

Phase 2:  @AgentCore ─────────── All of 2A, 2B, 2C (sequential within agent)
          @DevOps ─────────────── Phase 3 starts in parallel once 2A is done

Phase 3:  @DevOps ────────────── GitHub + Bug Triage
          @Features ───────────── Phase 4 starts in parallel once Phase 2 done

Phase 4:  @Features ────────┬── Swarms (4A)
                            ├── Tool Agents (4B)   ← all concurrent within agent
                            └── Voice (4C)

Phase 5:  @Federation ─────┬── Harvester + DCAT (5A → 5B)
                           └── Marketplace (5C) ← concurrent with 5A
```

---

## Agent Kickoff Prompts

Copy-paste these directly into each Claude Code session to seed focus.

---

### 🏗️ `@Foundation`
```
You are the Foundation Agent for the Dialogram project.

Your scope:
- Next.js 14 (App Router) + TypeScript scaffold with ESLint + Prettier
- Supabase project setup: email + GitHub OAuth, PostgreSQL, RLS policies skeleton
- Database tables: users, workspaces, workspace_members, documents, folders, comments, comment_threads
- Shared TypeScript types in /shared/types.ts — all other agents will import from here
- CRUD Route Handlers for documents and folders

Do NOT touch: TipTap, Yjs, webhooks, agent keys, GitHub, or federation.

Start with:
  npx create-next-app@latest . --typescript --app --eslint --tailwind --src-dir --import-alias "@/*"
```

---

### ✏️ `@EditorCore`
```
You are the EditorCore Agent for Dialogram.

Your scope (work inside /components/editor/ and /lib/editor/):
- TipTap editor with extensions: StarterKit, headings, tables, code blocks with syntax highlighting, bubble menu
- Yjs CRDT document model + Hocuspocus provider for real-time WebSocket sync
- User presence via Yjs awareness (cursor colour, display name, avatar)
- Inline comment highlights (custom TipTap mark) + threaded reply sidebar UI
- Custom TipTap nodes: LiveTable (sortable), MermaidDiagram (SVG render)

Assume @Foundation has created the Next.js shell and /shared/types.ts.
Do NOT touch auth, DB schema, webhooks, or GitHub.
```

---

### 🤖 `@AgentCore`
```
You are the AgentCore Agent for Dialogram.

Your scope (work inside /lib/agents/ and /components/agent-ux/):
- agent_keys table (hashed storage, scoped permissions: reader/commenter/editor)
- Agent roles enforced via Supabase RLS policies
- Webhook dispatch engine: BullMQ queue on Railway, HMAC-signed payloads
  Events: comment.mention, doc.updated, doc.branched
- @mention TipTap extension: fuzzy autocomplete for agents + humans in workspace
- Agent avatar system: distinct colour, bot badge, live "typing" indicator in Yjs awareness
- REST API for agents to push edits and comments programmatically (document with OpenAPI/Swagger)
- Transparent Scratchpad side-panel (SSE stream from agent to browser)
- Document Branching: Yjs snapshots, diff view (side-by-side), Approve/Reject UI
- Persistent agent memory: pgvector per workspace, embed doc chunks on save

Do NOT touch GitHub integration or federation — those belong to @DevOps and @Federation.
```

---

### 🐛 `@DevOps`
```
You are the DevOps Agent for Dialogram.

Your scope (work inside /lib/github/ and /components/bug-triage/):
- GitHub App OAuth flow, github_integrations table (store installation tokens per workspace)
- Webhook receiver: listen for issues.opened, issues.labeled, pull_request events
  Verify X-Hub-Signature-256 on all incoming payloads
- Triage Agent trigger: on new GitHub issue → queue job → auto-create Bug Triage document
- Bug Triage document template (TipTap extension):
  Sections: Summary | Steps to Reproduce | Affected Files | Proposed Fix | Test Results
- Code block RAG: use GitHub API to fetch relevant file snippets, embed in doc with diff-aware rendering
- PR generation: "Create Pull Request" button in doc → GitHub API creates branch + PR prefilled from doc content
- @Execution Agent integration: E2B sandbox for isolated code execution, stream stdout into doc
- Two-way sync: resolving GitHub issue closes doc; doc edits write back to GitHub issue body

Do NOT touch agent key management, federation, or marketplace.
```

---

### 🛸 `@Features`
```
You are the Features Agent for Dialogram.

Your scope (work inside /lib/features/ and /components/features/):

Agent Swarms (Phase 4A):
- Agent-to-Agent delegation protocol: an agent can @mention another agent in its webhook payload
- Swarm audit log UI: timeline sidebar showing chain of agent actions, collapsible per-agent
- Cycle detection guard: depth limit (max 5 hops) + circuit breaker, enforced server-side

Tool-Empowered Agents (Phase 4B):
- Data connector framework: agents declare tools[] with JSON Schema (sql_query, http_fetch, mermaid_render)
- Live table renderer custom TipTap node: agent pushes structured JSON → rendered as sortable table
- Diagram renderer: agent pushes Mermaid markdown → rendered as SVG (Mermaid.js TipTap extension)

Voice-to-Agent (Phase 4C):
- Voice recording UI: in-editor mic button with waveform feedback (MediaRecorder API)
- Transcription pipeline: send audio to Whisper API (OpenAI) or Deepgram → structured JSON
- Listener Agent type: takes transcription JSON, formats into structured TipTap document sections via LLM call

Do NOT touch auth, DB schema, GitHub integration, or federation.
```

---

### 🌐 `@Federation`
```
You are the Federation Agent for Dialogram.

Your scope (work inside /lib/federation/ and /components/marketplace/):

Federation Protocol (Phase 5A & 5B):
- federated_nodes table: node URL, trust level (trusted/public), sync frequency, last_harvested_at
- Admin UI for managing federation nodes
- Harvester pipeline (BullMQ cron):
    Gather → call remote node's /.well-known/dialogram/manifest endpoint to list resources
    Fetch  → retrieve metadata for each resource (documents, agent prompts, folders)
    Import → create local shadow copies with source attribution
- DCAT-compatible metadata schema: JSON export at /.well-known/dialogram/manifest for own workspace
- Cross-workspace agent delegation: temporary read tokens (JWT, scoped to specific docs, 24h expiry)
- Federation explorer UI: browse harvested docs/agents from peer nodes ("one-stop-shop" catalog)

Agent Marketplace (Phase 5C):
- marketplace_listings table: name, description, category, prompt_template, webhook_template, price, author_id, install_count, rating
- One-click install: listing → auto-provision agent_key + webhook in user's workspace
- Stripe integration for paid listings (15-20% platform commission via Stripe Connect)
- Marketplace frontend: search, filter by category, sort by rating/installs, listing detail page

Do NOT touch auth, editor, GitHub integration, or swarms.
```

---

## Coordination Rules

### Directory Ownership
Each agent has a strict directory boundary to prevent merge conflicts:

```
/                        ← @Foundation (root, shared config)
/shared/types.ts         ← @Foundation writes; all agents read
/components/editor/      ← @EditorCore
/lib/editor/             ← @EditorCore
/components/agent-ux/    ← @AgentCore
/lib/agents/             ← @AgentCore
/components/bug-triage/  ← @DevOps
/lib/github/             ← @DevOps
/components/features/    ← @Features
/lib/features/           ← @Features
/components/marketplace/ ← @Federation
/lib/federation/         ← @Federation
```

### Branch Strategy
- Each agent works on its own feature branch: `feat/foundation`, `feat/editor-core`, etc.
- Agents open PRs to `main` when a phase group is complete.
- **`@Foundation` acts as the daily integrator** — merges all branches and resolves conflicts.

### Shared Contract Updates
- If any agent needs to add to `/shared/types.ts`, they must:
  1. Comment the proposed type in their PR description
  2. The `@Foundation` agent applies it to `/shared/types.ts` and merges first
  3. Other agents rebase onto `main` before continuing

### Communication Protocol
Agents leave structured notes in `AGENT_NOTES.md` in their directory:
```markdown
# @AgentCore Notes — 2026-02-23
## Completed
- agent_keys table + API key generation
## Blocked On
- Needs /shared/types.ts to export `WorkspaceMember` type (@Foundation)
## Next
- BullMQ webhook queue setup
```
