"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ScratchpadEvent } from "@shared/types";

const MAX_EVENTS = 100;

interface UseScratchpadReturn {
  events: ScratchpadEvent[];
  isConnected: boolean;
  clearEvents: () => void;
}

export function useScratchpad(documentId: string): UseScratchpadReturn {
  const [events, setEvents] = useState<ScratchpadEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(
      `/api/documents/${documentId}/scratchpad/stream`
    );
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") return;

        setEvents((prev) => {
          const next = [...prev, data as ScratchpadEvent];
          return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
        });
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [documentId]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, isConnected, clearEvents };
}
