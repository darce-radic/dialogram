"use client";

import { useMemo } from "react";
import { diffLines } from "diff";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BranchDiffViewProps {
  branchName: string;
  sourceContent: string;
  branchContent: string;
  status: string;
  onApprove: () => void;
  onReject: () => void;
  onBack: () => void;
}

export function BranchDiffView({
  branchName,
  sourceContent,
  branchContent,
  status,
  onApprove,
  onReject,
  onBack,
}: BranchDiffViewProps) {
  const diff = useMemo(
    () => diffLines(sourceContent, branchContent),
    [sourceContent, branchContent]
  );

  return (
    <aside className="w-96 border-l bg-background flex flex-col">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm truncate">{branchName}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="font-mono text-xs leading-5">
          {diff.map((part, i) => (
            <div
              key={i}
              className={cn(
                "px-4 py-0.5 whitespace-pre-wrap",
                part.added && "bg-green-500/10 text-green-700 dark:text-green-400",
                part.removed && "bg-red-500/10 text-red-700 dark:text-red-400",
                !part.added && !part.removed && "text-muted-foreground"
              )}
            >
              <span className="select-none mr-2">
                {part.added ? "+" : part.removed ? "-" : " "}
              </span>
              {part.value}
            </div>
          ))}
        </div>
      </ScrollArea>

      {status === "open" && (
        <div className="px-4 py-3 border-t flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="flex-1"
            onClick={onApprove}
          >
            <Check className="h-4 w-4 mr-1" />
            Merge
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onReject}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </aside>
  );
}
