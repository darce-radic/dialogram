# Dialogram — Product Requirements Document (PRD)

> **Vision**: To build the ultimate unified workspace where AI is not just a tool you prompt, but a collaborative teammate with agency, memory, and specialized skills. Agents have equal footing in the document, contributing, reviewing, and communicating seamlessly with both humans and other agents.

---

## 1. Background & Inspiration

Polylogue ([polylogue.page](https://www.polylogue.page/)) pioneered the concept of a "Bring Your Own Model" collaborative writing platform where AI agents join as real team members. Dialogram builds on this concept with a deeper agentic layer: agents with memory, tools, delegation, and federation.

The core criticism of existing tools (Notion AI, Google Docs + Gemini) is **model lock-in** — you get one vendor's AI, one context window, their limitations. Dialogram is an **open writing surface**: you bring whatever agent you want, and it becomes a real collaborator.

---

## 2. Target Audience

| Persona | Use Case |
|---|---|
| **Content Teams & Writers** | Drafting, editing, and fact-checking at scale |
| **Product Managers & Engineers** | Technical documentation, spec writing, code/schema generation |
| **Legal & Compliance Teams** | Real-time contract review and structural editing |
| **Agencies** | White-labeling specialized agents for client projects |
| **Developer Teams** | Bug triage, GitHub-integrated code review in living documents |
| **Research Organizations** | Federated knowledge hubs across trusted institutions |

---

## 3. Core Features (Baseline Parity)

These are the foundational features required before any differentiators:

| Feature | Description |
|---|---|
| **Bring Your Own Model (BYOM)** | Integrate OpenAI, Anthropic, local models (Ollama), or custom enterprise API wrappers |
| **Rich Text CRDT Editor** | Real-time collaboration via TipTap (headings, tables, code blocks, formatting, live cursors) |
| **Agent @Mentions & Comments** | Tag an agent inline or in comment threads to trigger specific workflows |
| **Persistent Agent Memory** | Agents maintain context of document/folder/workspace history, remembering voice and preferences |
| **Full API & Webhooks** | Programmatic access for developers; agents listen to `document.updated`, `comment.created` events |
| **Workspaces & Folders** | Organize documents with role-based access for humans and agents |
| **Version History** | Document snapshots with restore capability |

---

## 4. Innovative Features (Differentiators)

### A. Agent Swarms (Agent-to-Agent Delegation)
Agents can communicate with and trigger other agents without human intervention.

> **Example**: A human comments `@Drafter please expand this`. `@Drafter` writes the text and leaves a comment: `@Reviewer proceed with compliance check`. `@Reviewer` approves or edits. The human only initiated and reviewed — agents handled the pipeline.

**Key constraints**: Cycle detection guard with depth limits + circuit breaker to prevent infinite loops.

---

### B. Document Branching & Pull Requests (Git for Docs)
Agents never overwrite live text directly. Instead, they create an isolated "Branch" or "Suggestion State."

> **Example**: `@Editor rewrite this section for clarity`. Instead of mutating the live text, the agent presents a visual side-by-side diff. The human clicks **Approve & Merge** or **Reject**.

---

### C. Transparent "Thought" Scratchpads
To build trust, humans can click on an active agent's avatar to open a side-panel revealing its real-time Chain-of-Thought. You see *why* and *how* the agent is arriving at its conclusion **before** it touches the document.

---

### D. Tool-Empowered Multi-Modal Agents (RAG)
Agents are connected entities with declared tools — not just text generators.

> **Example**: `@DataBot, insert the Q3 revenue table here`. The agent executes a SQL query against your connected database and renders a live, formatted, sortable table directly in the document. Agents can also render Mermaid diagrams, architectural charts, and images.

**Tool types**: `sql_query`, `http_fetch`, `mermaid_render`, `image_generate`.

---

### E. Voice-to-Agent Dictation
Humans dictate voice notes directly into the document. A dedicated "Listener" agent transcribes, structures, and formats the spoken thought into professional documentation in real-time.

**Pipeline**: `MediaRecorder API → Whisper/Deepgram → Structured JSON → Listener Agent → TipTap doc`

---

### F. Agent Marketplace
A community hub where users can share, buy, or sell pre-configured agent prompts and webhook connections.

> **Examples**: "The Harvard Law Reviewer Agent", "The SEO Optimizer Agent", "The API Docs Generator Agent"

**Revenue model**: Platform takes 15–20% commission on paid listings.

---

### G. Interactive Bug Triage & GitHub Sync
A dedicated workflow for developer teams — bugs move from GitHub into living triage documents.

**Flow**:
1. Bug reported in GitHub → webhook fires
2. "Triage Agent" auto-creates a structured Bug Triage document (Summary, Reproduction, Affected Files, Proposed Fix)
3. Humans and agents collaborate inline using RAG-fetched code snippets
4. `@Execution Agent` runs tests in a sandbox (E2B) — stdout streams into the doc
5. Human clicks **"Create Pull Request"** → PR auto-generated to GitHub

**Sync**: Resolving the GitHub issue closes the document. Doc edits update the GitHub issue body. Two-way.

---

### H. Federated Workspaces (CKAN-Style Integration)
Inspired by CKAN's harvesting principles (Gather → Fetch → Import), multiple trusted Dialogram implementations can be federated into a decentralized knowledge network.

| Principle | Implementation |
|---|---|
| **Metadata Harvesting** | One workspace harvests shared agent behaviors, prompts, or docs from another trusted node via scheduled cron |
| **DCAT-Compatible Schema** | Standardized JSON metadata export enables cross-platform interop (not just Dialogram-to-Dialogram) |
| **Decentralized Hub** | Different organizations syndicate specific folders as a "one-stop-shop" knowledge catalog |
| **Federated Agents** | An agent in Workspace A can be temporarily granted a scoped read token to query Workspace B context |

**Trust model**: Admin-managed `federated_nodes` registry with configurable trust levels per node.

---

## 5. Technical Architecture

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Editor | TipTap (headless ProseMirror wrapper) |
| Collaboration Sync | Yjs (CRDT) + Hocuspocus (WebSocket server) |
| UI Components | shadcn/ui + Radix UI primitives |
| Styling | TailwindCSS |

### Backend Core
| Layer | Technology |
|---|---|
| API & Auth | Supabase (PostgreSQL + RLS + Auth) |
| Agent Orchestration | BullMQ queue — HMAC-signed webhook dispatch |
| Vector Memory | pgvector (per-workspace agent memory embeddings) |
| GitHub Integration | GitHub App OAuth + webhook receiver |
| Federation Harvester | BullMQ cron (Gather/Fetch/Import pipeline) |
| Code Sandbox | E2B (isolated execution for `@Execution Agent`) |

### Infrastructure
| Layer | Technology |
|---|---|
| Frontend Hosting | Vercel |
| WebSocket Server | Railway (Hocuspocus + BullMQ workers) |
| Database | Supabase PostgreSQL |
| Cache / Rate Limiting | Redis (Upstash) |

---

## 6. Monetization Strategy

| Tier | Price | Limits |
|---|---|---|
| **Free (Human)** | $0/mo | Unlimited docs & workspaces; limited version history |
| **Agent Seat** | $10–15/mo per agent key | Unlocks BYOM agent keys, webhooks, full API |
| **Compute Credits** | Usage-based | Platform-hosted premium models (no own API key needed) |
| **Marketplace Rev-Share** | 15–20% commission | Applies to paid agent listings |

---

## 7. Security & Trust Principles
- **HMAC-signed webhooks** — all agent callbacks verified server-side
- **Row Level Security (RLS)** — all DB access enforced at Supabase level per user/agent role
- **Agent RBAC** — `reader` / `commenter` / `editor` levels, enforced per document
- **Federated token expiry** — cross-workspace delegation tokens are scoped and time-limited
- **Cycle detection** — swarm depth limits and circuit breakers prevent runaway agent chains
