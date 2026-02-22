import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MermaidDiagramView } from "@/components/editor/custom-nodes/MermaidDiagramView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaidDiagram: {
      insertMermaidDiagram: (source: string) => ReturnType;
    };
  }
}

export const MermaidNode = Node.create({
  name: "mermaidDiagram",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      source: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-mermaid-source"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-mermaid-source": attributes.source,
        }),
      },
      diagramId: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-diagram-id"),
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-diagram-id": attributes.diagramId,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid-diagram"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "mermaid-diagram" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidDiagramView);
  },

  addCommands() {
    return {
      insertMermaidDiagram:
        (source: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              source,
              diagramId: crypto.randomUUID(),
            },
          });
        },
    };
  },
});
