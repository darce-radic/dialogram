"use client";

import { useEditor as useTipTapEditor, type Editor } from "@tiptap/react";
import Heading from "@tiptap/extension-heading";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import type * as Y from "yjs";
import { configuredStarterKit } from "../extensions/starter-kit";
import { configuredCodeBlock } from "../extensions/code-block-lowlight";
import { tableExtensions } from "../extensions/table-kit";
import { LiveTableNode } from "../extensions/live-table-node";
import { MermaidNode } from "../extensions/mermaid-node";

interface CollaborationOptions {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  user: { name: string; color: string };
}

interface UseEditorOptions {
  content?: string;
  onUpdate?: (props: { editor: Editor }) => void;
  editable?: boolean;
  collaboration?: CollaborationOptions;
  additionalExtensions?: Parameters<typeof useTipTapEditor>[0] extends {
    extensions?: infer E;
  }
    ? E
    : never;
}

export function useEditorInstance(options: UseEditorOptions = {}) {
  const {
    content = "",
    onUpdate,
    editable = true,
    collaboration,
    additionalExtensions = [],
  } = options;

  const collaborationExtensions = collaboration
    ? [
        Collaboration.configure({ document: collaboration.ydoc }),
        CollaborationCursor.configure({
          provider: collaboration.provider,
          user: collaboration.user,
        }),
      ]
    : [];

  const editor = useTipTapEditor({
    extensions: [
      configuredStarterKit,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      configuredCodeBlock,
      ...tableExtensions,
      LiveTableNode,
      MermaidNode,
      ...collaborationExtensions,
      ...(additionalExtensions ?? []),
    ],
    content: collaboration ? undefined : content,
    editable,
    onUpdate,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-lg mx-auto focus:outline-none min-h-[500px] px-8 py-6",
      },
    },
    immediatelyRender: false,
  });

  return editor;
}
