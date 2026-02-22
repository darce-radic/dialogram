"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";

interface CodeBlockMenuProps {
  editor: Editor;
}

export function CodeBlockMenu({ editor }: CodeBlockMenuProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1 text-xs"
      data-active={editor.isActive("codeBlock") || undefined}
      onClick={() => editor.chain().focus().toggleCodeBlock().run()}
    >
      <Code className="h-3.5 w-3.5" />
      Code
    </Button>
  );
}
