---
project_id: dlgprj_38fe09061632550a
note_type: status
scope: repo
updated_at: 2026-02-25
owner: @codex
---

# Project State

This file is the canonical session-boot context for humans and agents.

## Project Identity

- Project ID command: `npm run project:id -- --short`
- Project ID algorithm: `dialogram-project-id-v1`
- Current Project ID: `dlgprj_38fe09061632550a`
- Notes must include: `project_id: <value from command above>`

## Note Metadata Standard

Use this header in every project note file (`AGENT_NOTES.md`, status notes, handoff notes):

```md
---
project_id: dlgprj_................
note_type: status | handoff | decision | risk
scope: repo | service:web | service:hocuspocus | service:worker
updated_at: YYYY-MM-DD
owner: @role-or-name
---
```

## Current Stage Snapshot

- Product: collaborative workspace where humans and AI agents co-edit docs.
- Current codebase status:
  - Foundation (auth, workspaces, folders/documents CRUD, base editor shell): implemented.
  - Collaboration (TipTap + Yjs + Hocuspocus + presence): implemented.
  - Agent platform core (agent keys, webhook queue/worker, scratchpad SSE, branches, agent memory): largely implemented.
  - Advanced roadmap (GitHub triage, swarms, voice, federation, marketplace): mostly planned/not implemented.

## Source Of Truth

- Product scope: `docs/PRD.md`
- Build sequencing: `docs/BUILD_PLAN.md`
- Multi-agent coordination intent: `docs/AGENT_TEAMS.md`
- Foundation progress and deployment notes: `AGENT_NOTES.md`
- Editor-specific implementation notes: `src/components/editor/AGENT_NOTES.md`

## Implemented vs Planned Rule

- Treat only code present in `src/`, `server/`, and `supabase/migrations/` as implemented.
- Treat roadmap items in docs as planned unless there is matching code and route coverage.

## Known Constraints

- Next.js warning currently present: middleware convention is deprecated in favor of proxy.
- Agent mention UX is partially implemented; current mention suggestions are member-centric and need full agent/human unification.
- Some create flows still use direct client Supabase writes instead of API-first paths.

## Top Risks / Clarity Gaps

- Event contract drift risk between documented webhook names and emitted runtime events.
- Potential confusion between planned features and shipped features without explicit stage markers.
- Non-uniform action-state visibility for agent operations in UI.

## Next Priorities

1. Enforce a strict agent communication contract schema in comment/scratchpad APIs.
2. Default agent editing to branch proposal + human merge approval.
3. Unify mention/autocomplete and routing for both humans and agents.
4. Publish concise integration docs for webhook and agent API contracts.

## Update Policy

- Update this file whenever a milestone status changes.
- Add the computed `project_id` to all operational notes.
- Keep entries short, dated, and decision-oriented.
