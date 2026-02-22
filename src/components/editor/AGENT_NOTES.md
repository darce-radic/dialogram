# @EditorCore Notes — 2026-02-23

## Completed
- TipTap editor with all extensions: StarterKit, Heading (h1-h6), Tables (resizable), CodeBlockLowlight (syntax highlighting)
- BubbleMenu (floating toolbar on text selection)
- Full toolbar with bold/italic/strike, heading dropdown, bullet/ordered lists, blockquote, code block, table menu
- Yjs + Hocuspocus collaboration provider (dual-mode: local or collaborative)
- User presence via Yjs awareness (cursor colour, display name, avatar)
- Collaboration cursor CSS styles
- Comment system: custom TipTap Mark (CommentMark), useComments hook with Yjs shared map, full sidebar UI with threaded replies and resolve
- Custom TipTap nodes: LiveTable (sortable, agent-pushable JSON), MermaidDiagram (SVG render with dynamic import)
- Shared types in /shared/types.ts: User, DocumentMeta, CommentThread, Comment, CollaborationUser, LiveTableData
- Document page at /documents/[id]

## TipTap v3 Notes
- `BubbleMenu` React component: import from `@tiptap/react/menus` (NOT `@tiptap/react`)
- `@tiptap/extension-table` v3: no default export, use named `{ Table, TableRow, TableCell, TableHeader }` from the single package
- `@tiptap/extension-collaboration-cursor` v3.0.0 is deprecated (was meant to be 2.5.0) but works fine
- `@hocuspocus/provider` v3: no `connect` config option (auto-connects by default)

## Blocked On
- Nothing

## Notes for @Foundation
- Pre-existing TypeScript error in `src/app/(dashboard)/workspace/[workspaceId]/document/[documentId]/page.tsx:49` — `.workspaces` type mismatch on Supabase query
- Shared types added to `/src/shared/types.ts` — please review and merge

## Next
- Wire Supabase auth session into Editor props (needs @Foundation auth integration)
- Connect Hocuspocus server URL from environment variables
- API routes for agents to push LiveTable/MermaidDiagram content
