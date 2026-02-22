import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Legacy shortcut route — redirects to the canonical workspace document URL.
 */
export default async function DocumentPage({ params }: Props) {
  const { id: documentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: document } = await supabase
    .from("documents")
    .select("workspace_id")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!document) redirect("/");

  redirect(`/workspace/${document.workspace_id}/document/${documentId}`);
}
