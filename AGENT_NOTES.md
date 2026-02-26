---
project_id: dlgprj_38fe09061632550a
note_type: handoff
scope: repo
updated_at: 2026-02-23
owner: @Foundation
---
# @Foundation Notes â€” 2026-02-23

## Completed

- Next.js project scaffold (App Router, TypeScript, ESLint, Tailwind v4, shadcn/ui)
- Supabase client utilities: `src/lib/supabase/{client,server,middleware,admin}.ts`
- Shared types: `shared/types.ts` with all DB row types, insert/update types, API types, Database interface
- Database migrations: 8 tables + RLS policies in `supabase/migrations/` (including `agent_keys`)
- Auth middleware: `src/middleware.ts` (session refresh + unauthenticated redirect)
- Auth pages: sign-in, sign-up, OAuth callback
- Dashboard layout with sidebar: workspace switcher, folder tree, document list
- CRUD route handlers: documents + folders (list, create, get, update, soft-delete)
- Dashboard pages: workspace home, folder view, document view (Editor wired)
- Editor integrated into workspace document page with auth user mapping and optional collaboration URL
- **Multitenancy hardening**: `requireWorkspaceMembership` helper + membership checks in all API routes and dashboard pages
- **Collaboration room scoping**: Hocuspocus rooms use `${workspaceId}:${documentId}` naming
- **Comment persistence**: API routes for threads + comments, `use-comments` hook persists to DB
- **Phase 2 prep**: `agent_keys` table migration + `AgentKey`/`AgentRole` types in `shared/types.ts`
- **Railway deployment config**: Hocuspocus WebSocket server, BullMQ webhook worker, Railway config files
- **Webhook queue**: BullMQ producer utility for Next.js API routes (`src/lib/queue/webhook-queue.ts`)
- **Webhook worker**: HMAC-SHA256 signed delivery with retry logic (`server/worker/`)
- **Supabase provisioned**: URL + anon key configured in `.env.local`

## Import Paths for Other Agents

- **Shared types**: `import type { ... } from '@shared/types'`
- **Browser Supabase client**: `import { createClient } from '@/lib/supabase/client'`
- **Server Supabase client**: `import { createClient } from '@/lib/supabase/server'`
- **Authorization helper**: `import { requireWorkspaceMembership } from '@/lib/supabase/authorization'`
- **UI components**: `import { Button } from '@/components/ui/button'` (etc.)
- **Webhook queue**: `import { enqueueWebhook } from '@/lib/queue/webhook-queue'`

## Env Vars Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_HOCUSPOCUS_URL        # optional â€” leave empty for local-only editing
REDIS_URL                         # optional â€” leave empty to skip webhook queue
WEBHOOK_SIGNING_SECRET            # required for webhook worker
DATABASE_URL                      # Supabase pooler connection string
```

## Multitenancy

- All API routes validate workspace membership via `requireWorkspaceMembership()` before data access
- Dashboard pages redirect non-members to `/`
- Folder/document pages validate `resource.workspace_id === route.workspaceId`
- Hocuspocus collaboration rooms scoped by `${workspaceId}:${documentId}`
- RLS policies provide database-level enforcement; app-layer checks are defense-in-depth
- DELETE operations on documents/folders require `owner` or `admin` role

## Comment API

- `GET /api/documents/[documentId]/threads` â€” list all threads with comments
- `POST /api/documents/[documentId]/threads` â€” create thread + initial comment
- `PATCH /api/documents/[documentId]/threads/[threadId]` â€” resolve/unresolve
- `DELETE /api/documents/[documentId]/threads/[threadId]` â€” delete thread (cascades)
- `POST /api/documents/[documentId]/threads/[threadId]/comments` â€” add reply

## Notes for Other Agents

- **@EditorCore**: TipTap editor is mounted in workspace document page. Editor component now accepts `workspaceId` prop. Comments persist to DB via fire-and-forget API calls from `use-comments` hook. Remaining: Hocuspocus server deployment, diagram/table insertion UI.
- **@AgentCore**: `agent_keys` table + RLS policies ready in migration 9. Types `AgentKey`, `AgentKeyInsert`, `AgentKeyUpdate`, `AgentRole` available in `shared/types.ts`. Next: key generation API, webhook dispatch engine.
- **All agents**: Types in `shared/types.ts` include placeholder comments for your extensions. Use `requireWorkspaceMembership()` for authorization in new routes.
- **Soft deletes**: `workspaces`, `folders`, and `documents` use `deleted_at` timestamp. RLS policies filter them out.
- **Middleware**: Next.js 16 shows a deprecation warning about middleware -> proxy. Doesn't affect functionality.

## Railway Architecture

```
Railway Project
â”œâ”€â”€ Service: web (Next.js)       â†’ railway.toml
â”œâ”€â”€ Service: hocuspocus (WS)     â†’ server/hocuspocus/railway.toml
â”œâ”€â”€ Service: worker (BullMQ)     â†’ server/worker/railway.toml
â””â”€â”€ Service: redis (managed)
```

- Scripts: `npm run dev:hocuspocus`, `npm run dev:worker`
- Server code uses `tsconfig.server.json` (ES2022, Node target)
- BullMQ bundles its own ioredis â€” do NOT add a separate ioredis dependency

## Next

- Run all 9 Supabase migration files against provisioned project
- Get `SUPABASE_SERVICE_ROLE_KEY` from Supabase dashboard and add to `.env.local`
- Create Railway project and deploy services
- @AgentCore: Build agent key generation API + webhook dispatch (Phase 2A)
