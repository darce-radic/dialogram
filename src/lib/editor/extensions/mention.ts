import Mention from "@tiptap/extension-mention";

export const MentionExtension = Mention.configure({
  HTMLAttributes: {
    class: "mention",
  },
  renderText({ node }) {
    return `@${node.attrs.label ?? node.attrs.id}`;
  },
});
