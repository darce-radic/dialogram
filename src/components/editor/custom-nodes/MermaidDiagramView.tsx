"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";

export function MermaidDiagramView({ node }: ReactNodeViewProps) {
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const source = node.attrs.source as string;
  const diagramId = node.attrs.diagramId as string;

  useEffect(() => {
    if (!source) return;

    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const DOMPurify = (await import("isomorphic-dompurify")).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "strict",
        });

        const uniqueId = `mermaid-${diagramId}-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, source);
        const sanitized = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ["foreignObject"],
        });

        if (!cancelled) {
          setSvgContent(sanitized);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to render diagram"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, diagramId]);

  return (
    <NodeViewWrapper className="my-4">
      <div contentEditable={false} className="rounded-lg border bg-card p-4">
        {error ? (
          <div className="text-destructive text-sm">
            <p className="font-semibold">Diagram Error</p>
            <pre className="mt-1 text-xs">{error}</pre>
            <pre className="mt-2 rounded bg-muted p-2 text-xs">{source}</pre>
          </div>
        ) : svgContent ? (
          <div
            className="flex justify-center overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            Rendering diagram...
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
