import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

interface CreateProviderOptions {
  documentId: string;
  workspaceId: string;
  serverUrl: string;
  token?: string;
  ydoc: Y.Doc;
}

export function createCollaborationProvider(
  options: CreateProviderOptions
): HocuspocusProvider {
  const { documentId, workspaceId, serverUrl, token, ydoc } = options;

  return new HocuspocusProvider({
    url: serverUrl,
    name: `${workspaceId}:${documentId}`,
    document: ydoc,
    token: token ?? "",
  });
}
