import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { LiveTableView } from "@/components/editor/custom-nodes/LiveTableView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    liveTable: {
      insertLiveTable: (attrs?: {
        data?: string;
        title?: string;
      }) => ReturnType;
    };
  }
}

export const LiveTableNode = Node.create({
  name: "liveTable",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      data: {
        default: JSON.stringify({ columns: [], rows: [] }),
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-table-data"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-table-data": attributes.data,
        }),
      },
      title: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-title"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-title": attributes.title,
        }),
      },
      tableId: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-table-id"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-table-id": attributes.tableId,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="live-table"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "live-table" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LiveTableView);
  },

  addCommands() {
    return {
      insertLiveTable:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              tableId: crypto.randomUUID(),
              ...attrs,
            },
          });
        },
    };
  },
});
