"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Editor Error</h2>
            <p className="text-sm text-muted-foreground">
              Something went wrong while rendering the editor. Try reloading the
              page.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32 text-left">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
