import type { Editor } from "@tiptap/react";

export function getWordCount(editor: Editor): number {
  const text = editor.state.doc.textContent;
  return text.split(/\s+/).filter(Boolean).length;
}

export function getCharacterCount(editor: Editor): number {
  return editor.state.doc.textContent.length;
}

export function isMarkActive(editor: Editor, markName: string): boolean {
  return editor.isActive(markName);
}

export function getCurrentHeadingLevel(editor: Editor): number {
  for (let level = 1; level <= 6; level++) {
    if (editor.isActive("heading", { level })) return level;
  }
  return 0;
}
