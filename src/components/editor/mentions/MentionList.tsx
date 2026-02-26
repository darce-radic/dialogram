"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";

export interface MentionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  type?: "human" | "agent";
  subtitle?: string;
}

interface MentionListProps {
  items: MentionUser[];
  command: (item: {
    id: string;
    label: string;
    type: "human" | "agent";
  }) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [rawIndex, setRawIndex] = useState(0);

    // Derive visible index — clamp to item bounds
    const selectedIndex =
      items.length === 0 ? 0 : Math.min(rawIndex, items.length - 1);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) {
          command({
            id: item.id,
            label: item.name,
            type: item.type ?? "human",
          });
        }
      },
      [items, command]
    );

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
          if (event.key === "ArrowUp") {
            setRawIndex((prev) =>
              prev <= 0 ? items.length - 1 : prev - 1
            );
            return true;
          }
          if (event.key === "ArrowDown") {
            setRawIndex((prev) =>
              prev >= items.length - 1 ? 0 : prev + 1
            );
            return true;
          }
          if (event.key === "Enter") {
            selectItem(selectedIndex);
            return true;
          }
          return false;
        },
      }),
      [items, selectItem, selectedIndex]
    );

    if (items.length === 0) {
      return (
        <div className="rounded-md border bg-popover p-2 text-sm text-muted-foreground shadow-md">
          No results
        </div>
      );
    }

    return (
      <div className="rounded-md border bg-popover shadow-md overflow-hidden">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
            onClick={() => selectItem(index)}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {item.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate flex items-center gap-1.5">
                {item.name}
                {item.type === "agent" && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    Agent
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {item.subtitle ?? item.email}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";
