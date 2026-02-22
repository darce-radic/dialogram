import { Mark, mergeAttributes } from "@tiptap/core";

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentMark: {
      setComment: (threadId: string) => ReturnType;
      unsetComment: (threadId: string) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: "commentMark",

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-thread-id"),
        renderHTML: (attributes) => ({
          "data-thread-id": attributes.threadId,
        }),
      },
      resolved: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-resolved") === "true",
        renderHTML: (attributes) => ({
          "data-resolved": String(attributes.resolved),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-thread-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "comment-highlight",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (threadId: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { threadId });
        },
      unsetComment:
        (threadId: string) =>
        ({ tr, state }) => {
          const { doc } = state;
          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (
                mark.type.name === this.name &&
                mark.attrs.threadId === threadId
              ) {
                tr.removeMark(pos, pos + node.nodeSize, mark.type);
              }
            });
          });
          return true;
        },
    };
  },

  inclusive: false,
  spanning: true,
});
