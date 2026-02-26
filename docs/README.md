# Dialogram — Documentation

> A collaborative workspace where AI agents join as real team members — reading documents, leaving comments, and editing alongside humans.

## Planning Documents

| Document | Description |
|---|---|
| [PRD — Product Requirements](./PRD.md) | Vision, features, architecture, and monetization |
| [Build Plan — Prioritized Tasks](./BUILD_PLAN.md) | Phase-by-phase task breakdown with parallel groups |
| [Agent Teams — Claude Code](./AGENT_TEAMS.md) | Agent roster, kickoff prompts, and coordination rules |
| [Multi-Agent V1 Spec](./MULTI_AGENT_V1.md) | Minimal architecture and rollout plan for multi-agent collaboration |
## Quick Reference

```
Phase 1  → Auth + Real-time CRDT Editor         🔴 P0 (start here)
Phase 2  → BYOM Agent Keys + @Mention + Webhooks 🔴 P0
Phase 3  → GitHub Bug Triage                     🟠 P1 (parallel with Phase 4)
Phase 4  → Swarms + Tools + Voice                🟠 P1 (parallel with Phase 3)
Phase 5  → Federation + Marketplace              🟡 P2
```

## Integration Docs

- [Agent Integration](./AGENT_INTEGRATION.md)

## Current Runtime Contracts (2026-02-26)

- Document update API: agent updates propose branches by default; direct updates are explicit.
- Mention targets support both humans and agents (`mentioned_target_type`).
- Agent comments/scratchpad now require structured communication contract fields.
- See `docs/AGENT_INTEGRATION.md` for payload examples.

- [MCP Server](./MCP.md)
- [OpenAPI (JSON)](/api/openapi.json)
- [API Docs UI](/api-docs)

- [Help Guide](./HELP.md)

- [Data Policy Template](./DATA_POLICY.md)

