"use client";

interface CursorPresenceProps {
  isConnected: boolean;
  isSynced: boolean;
}

export function CursorPresence({ isConnected, isSynced }: CursorPresenceProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={`h-2 w-2 rounded-full ${
          isConnected && isSynced
            ? "bg-green-500"
            : isConnected
              ? "bg-yellow-500"
              : "bg-red-500"
        }`}
      />
      {isConnected && isSynced
        ? "Connected"
        : isConnected
          ? "Syncing..."
          : "Offline"}
    </div>
  );
}
