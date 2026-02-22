import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceMembership } from "@/lib/supabase/authorization";
import { Editor } from "@/components/editor/Editor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: Props) {
  const { id: documentId } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/sign-in");

  // Fetch document to get workspace context
  const { data: document } = await supabase
    .from("documents")
    .select("workspace_id")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!document) redirect("/");

  // Verify workspace membership
  const { authorized } = await requireWorkspaceMembership(
    supabase,
    authUser.id,
    document.workspace_id
  );
  if (!authorized) redirect("/");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  const editorUser = {
    id: authUser.id,
    name: profile?.full_name ?? authUser.email ?? "Anonymous",
    email: authUser.email ?? "",
    avatarUrl: profile?.avatar_url ?? undefined,
  };

  const collaborationUrl =
    process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || undefined;

  return (
    <main className="flex h-screen">
      <Editor
        documentId={documentId}
        workspaceId={document.workspace_id}
        user={editorUser}
        collaborationUrl={collaborationUrl}
      />
    </main>
  );
}
