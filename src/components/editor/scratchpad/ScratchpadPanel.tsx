"use client";

import { useEffect, useRef } from "react";
import type { ScratchpadEvent } from "@shared/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Wrench, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScratchpadPanelProps {
  events: ScratchpadEvent[];
  isConnected: boolean;
  agentNames?: Record<string, string>;
}

const eventIcons: Record<string, React.ElementType> = {
  thinking: Brain,
  tool_use: Wrench,
  progress: Loader2,
  error: AlertCircle,
};

export function ScratchpadPanel({
  events,
  isConnected,
  agentNames,
}: ScratchpadPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <aside className="w-80 border-l bg-background flex flex-col">
      <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2">
        <Brain className="h-4 w-4" />
        Agent Scratchpad
        <span
          className={cn(
            "ml-auto h-2 w-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-muted-foreground"
          )}
        />
      </div>
      <ScrollArea className="flex-1">
        {events.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No agent activity yet. Agent scratchpad events will appear here in
            real-time.
          </div>
        )}
        {events.map((event) => {
          const Icon = eventIcons[event.event_type] ?? Brain;
          const agentName =
            agentNames?.[event.agent_key_id] ?? "Agent";

          return (
            <div
              key={event.id}
              className={cn(
                "px-4 py-2 border-b text-sm",
                event.event_type === "error" && "bg-destructive/5",
                event.event_type === "thinking" && "italic text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon
                  className={cn(
                    "h-3 w-3",
                    event.event_type === "error" && "text-destructive",
                    event.event_type === "progress" && "animate-spin"
                  )}
                />
                <span className="text-xs font-medium">{agentName}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(event.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p
                className={cn(
                  event.event_type === "tool_use" &&
                    "font-mono text-xs bg-muted rounded px-2 py-1"
                )}
              >
                {event.content}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </ScrollArea>
    </aside>
  );
}
