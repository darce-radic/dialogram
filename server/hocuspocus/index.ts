import { createHash } from "node:crypto";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Supabase admin client (service role — bypasses RLS)
// ---------------------------------------------------------------------------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// Hocuspocus WebSocket server
// ---------------------------------------------------------------------------
const port = parseInt(process.env.PORT || "1234", 10);

const server = new Server(
  {
    port,

    // -----------------------------------------------------------------------
    // Authentication — validate Supabase JWT and workspace membership
    // -----------------------------------------------------------------------
    async onAuthenticate({ token, documentName }) {
      if (!token) {
        throw new Error("No auth token provided");
      }

      // Room name format: "workspaceId:documentId"
      const [workspaceId] = documentName.split(":");
      if (!workspaceId) {
        throw new Error("Invalid room name format");
      }

      // Try agent key auth if token starts with dlg_
      if (token.startsWith("dlg_")) {
        const keyHash = createHash("sha256").update(token).digest("hex");
        const { data: agentKey } = await supabase
          .from("agent_keys")
          .select("id, workspace_id, name, role, is_active")
          .eq("key_hash", keyHash)
          .eq("is_active", true)
          .single();

        if (!agentKey) {
          throw new Error("Invalid agent key");
        }

        if (agentKey.workspace_id !== workspaceId) {
          throw new Error("Agent key does not belong to this workspace");
        }

        // Update last_used_at (fire-and-forget)
        supabase
          .from("agent_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", agentKey.id)
          .then(() => {});

        return {
          user: {
            id: agentKey.id,
            name: agentKey.name,
            role: agentKey.role,
            isAgent: true,
            agentRole: agentKey.role,
          },
        };
      }

      // Validate the JWT via Supabase auth
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw new Error("Invalid auth token");
      }

      // Verify workspace membership
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

      if (!membership) {
        throw new Error("Not a workspace member");
      }

      return {
        user: {
          id: user.id,
          name: user.user_metadata?.full_name ?? user.email ?? "Anonymous",
          role: membership.role,
        },
      };
    },

    extensions: [
      // ---------------------------------------------------------------------
      // Database persistence — load/store Yjs document state in Supabase
      // ---------------------------------------------------------------------
      new Database({
        async fetch({ documentName }) {
          const [, documentId] = documentName.split(":");
          if (!documentId) return null;

          const { data } = await supabase
            .from("documents")
            .select("content")
            .eq("id", documentId)
            .is("deleted_at", null)
            .single();

          if (!data?.content) return null;

          // content is stored as a base64-encoded Yjs update
          const yDocState = data.content as unknown as { yjs_state?: string };
          if (!yDocState.yjs_state) return null;

          return Buffer.from(yDocState.yjs_state, "base64");
        },

        async store({ documentName, state }) {
          const [, documentId] = documentName.split(":");
          if (!documentId) return;

          // Store the Yjs binary state as base64 in the content jsonb column
          await supabase
            .from("documents")
            .update({
              content: { yjs_state: Buffer.from(state).toString("base64") },
              updated_at: new Date().toISOString(),
            })
            .eq("id", documentId);
        },
      }),
    ],
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
server.listen().then(() => {
  console.log(`Hocuspocus server running on port ${port}`);
});
