"use client";

import type { CommentThread as CommentThreadType } from "@/shared/editor-types";
import { CommentInput } from "./CommentInput";
import { Button } from "@/components/ui/button";
import { Check, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentThreadProps {
  thread: CommentThreadType;
  isActive: boolean;
  resolved?: boolean;
  agentNames?: Record<string, string>;
  onClick: () => void;
  onReply: (content: string) => void;
  onResolve: () => void;
}

interface ParsedContract {
  intent?: string;
  assumptions: string[];
  actionPlan: string[];
  confidence?: string;
  needsInput?: string;
  question?: string;
}

function parseAgentCommunication(content: string): {
  text: string;
  contract: ParsedContract | null;
} {
  const marker = "Agent Communication Contract\n";
  const index = content.indexOf(marker);
  if (index < 0) return { text: content, contract: null };

  const text = content.slice(0, index).trimEnd();
  const block = content.slice(index + marker.length).split("\n");
  const contract: ParsedContract = {
    assumptions: [],
    actionPlan: [],
  };

  let mode: "none" | "assumptions" | "action" = "none";

  for (const raw of block) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("Intent: ")) {
      contract.intent = line.slice("Intent: ".length);
      mode = "none";
      continue;
    }
    if (line === "Assumptions:") {
      mode = "assumptions";
      continue;
    }
    if (line === "Action Plan:") {
      mode = "action";
      continue;
    }
    if (line.startsWith("Confidence: ")) {
      contract.confidence = line.slice("Confidence: ".length);
      mode = "none";
      continue;
    }
    if (line.startsWith("Needs Input: ")) {
      contract.needsInput = line.slice("Needs Input: ".length);
      mode = "none";
      continue;
    }
    if (line.startsWith("Question: ")) {
      contract.question = line.slice("Question: ".length);
      mode = "none";
      continue;
    }
    if (line.startsWith("- ")) {
      if (mode === "assumptions") contract.assumptions.push(line.slice(2));
      if (mode === "action") contract.actionPlan.push(line.slice(2));
    }
  }

  return { text, contract };
}

function parseContractFromMetadata(
  metadata: Record<string, unknown> | undefined
): ParsedContract | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.communication;
  if (!raw || typeof raw !== "object") return null;
  const contract = raw as Record<string, unknown>;
  return {
    intent:
      typeof contract.intent === "string" ? contract.intent : undefined,
    assumptions: Array.isArray(contract.assumptions)
      ? contract.assumptions.filter((v): v is string => typeof v === "string")
      : [],
    actionPlan: Array.isArray(contract.action_plan)
      ? contract.action_plan.filter((v): v is string => typeof v === "string")
      : [],
    confidence:
      typeof contract.confidence === "number"
        ? String(contract.confidence)
        : undefined,
    needsInput:
      typeof contract.needs_input === "boolean"
        ? String(contract.needs_input)
        : undefined,
    question:
      typeof contract.question === "string" ? contract.question : undefined,
  };
}

export function CommentThreadComponent({
  thread,
  isActive,
  resolved,
  agentNames,
  onClick,
  onReply,
  onResolve,
}: CommentThreadProps) {
  const getAuthorDisplay = (authorId: string) => {
    const agentName = agentNames?.[authorId];
    if (agentName) {
      return { name: agentName, isAgent: true };
    }
    return { name: authorId || "Anonymous", isAgent: false };
  };

  return (
    <div
      className={cn(
        "border-b px-4 py-3 cursor-pointer transition-colors",
        isActive && "bg-accent",
        resolved && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          {new Date(thread.createdAt).toLocaleDateString()}
        </span>
        {!resolved && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
            title="Resolve thread"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {thread.comments.map((comment) => {
          const author = getAuthorDisplay(comment.authorId);
          const parsed = parseAgentCommunication(comment.content);
          const metadataContract = parseContractFromMetadata(comment.metadata);
          const displayContract = metadataContract ?? parsed.contract;
          return (
            <div key={comment.id} className="text-sm">
              <span className="font-medium text-xs inline-flex items-center gap-1">
                {author.isAgent && <Bot className="h-3 w-3 text-primary" />}
                {author.name}
              </span>
              {parsed.text && <p className="mt-0.5 whitespace-pre-wrap">{parsed.text}</p>}
              {displayContract && (
                <div className="mt-1.5 rounded-md border bg-muted/40 px-2 py-2 text-xs space-y-1">
                  {displayContract.intent && (
                    <p>
                      <span className="font-medium">Intent:</span>{" "}
                      {displayContract.intent}
                    </p>
                  )}
                  {displayContract.assumptions.length > 0 && (
                    <p>
                      <span className="font-medium">Assumptions:</span>{" "}
                      {displayContract.assumptions.join("; ")}
                    </p>
                  )}
                  {displayContract.actionPlan.length > 0 && (
                    <p>
                      <span className="font-medium">Plan:</span>{" "}
                      {displayContract.actionPlan.join("; ")}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    Confidence: {displayContract.confidence ?? "n/a"} | Needs
                    input: {displayContract.needsInput ?? "n/a"}
                  </p>
                  {displayContract.question &&
                    displayContract.question.toLowerCase() !== "none" && (
                      <p>
                        <span className="font-medium">Question:</span>{" "}
                        {displayContract.question}
                      </p>
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isActive && !resolved && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <CommentInput onSubmit={onReply} />
        </div>
      )}
    </div>
  );
}
