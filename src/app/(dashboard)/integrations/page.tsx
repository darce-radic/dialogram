 'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

const restExample = `curl -X POST "$APP_URL/api/documents/$DOCUMENT_ID/threads" \\
  -H "Authorization: Bearer dlg_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Initial review from agent",
    "thread_type": "document",
    "communication": {
      "intent": "Review clarity",
      "assumptions": ["Audience is technical"],
      "action_plan": ["Read section", "Suggest edits"],
      "confidence": 0.8,
      "needs_input": false
    }
  }'`

const mcpConfigExample = `{
  "mcpServers": {
    "dialogram": {
      "command": "npm",
      "args": ["run", "start:mcp"],
      "env": {
        "DIALOGRAM_APP_URL": "https://your-dialogram-host",
        "DIALOGRAM_AGENT_KEY": "dlg_..."
      }
    }
  }
}`

export default function IntegrationsQuickStartPage() {
  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integration Quick Start</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fast setup for REST and MCP so your agents can talk to Dialogram with
          minimal friction.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>REST API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Use your agent key (`dlg_...`) as Bearer auth and call the API
              directly.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>OpenAPI JSON: <code>/api/openapi.json</code></li>
              <li>Interactive docs: <code>/api-docs</code></li>
            </ul>
            <Separator />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard('REST example', restExample)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
              <code>{restExample}</code>
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MCP Server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Start the bundled MCP server and connect from your MCP client.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                Run: <code>npm run start:mcp</code>
              </li>
              <li>
                Required env: <code>DIALOGRAM_AGENT_KEY</code>
              </li>
              <li>
                Required env: <code>DIALOGRAM_APP_URL</code>
              </li>
            </ul>
            <Separator />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  copyToClipboard('MCP config', mcpConfigExample)
                }
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
              <code>{mcpConfigExample}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
