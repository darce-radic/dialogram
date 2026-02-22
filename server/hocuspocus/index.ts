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

      // Validate the JWT via Supabase auth
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw new Error("Invalid auth token");
      }

      // Room name format: "workspaceId:documentId"
      const [workspaceId] = documentName.split(":");
      if (!workspaceId) {
        throw new Error("Invalid room name format");
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
