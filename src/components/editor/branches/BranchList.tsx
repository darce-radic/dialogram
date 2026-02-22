"use client";

import type { DocumentBranch } from "@shared/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface BranchListProps {
  branches: DocumentBranch[];
  onSelectBranch: (branch: DocumentBranch) => void;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  merged: "bg-green-500/10 text-green-700 dark:text-green-400",
  rejected: "bg-muted text-muted-foreground",
};

export function BranchList({ branches, onSelectBranch }: BranchListProps) {
  return (
    <aside className="w-80 border-l bg-background flex flex-col">
      <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        Branches ({branches.filter((b) => b.status === "open").length} open)
      </div>
      <ScrollArea className="flex-1">
        {branches.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No branches yet. Create a branch to propose changes to this
            document.
          </div>
        )}
        {branches.map((branch) => (
          <button
            key={branch.id}
            className="w-full border-b px-4 py-3 text-left transition-colors hover:bg-accent"
            onClick={() => onSelectBranch(branch)}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {branch.branch_name}
              </span>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  statusColors[branch.status] ?? statusColors.open
                )}
              >
                {branch.status}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {branch.created_by_type === "agent" ? "Agent" : "User"} &middot;{" "}
              {new Date(branch.created_at).toLocaleDateString()}
            </div>
          </button>
        ))}
      </ScrollArea>
    </aside>
  );
}
