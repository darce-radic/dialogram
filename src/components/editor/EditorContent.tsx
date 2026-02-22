"use client";

import {
  EditorContent as TipTapEditorContent,
  type Editor,
} from "@tiptap/react";

interface EditorContentProps {
  editor: Editor | null;
}

export function EditorContentArea({ editor }: EditorContentProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <TipTapEditorContent editor={editor} />
    </div>
  );
}
