import { openApiSpec } from '@/lib/openapi/spec'

export default function ApiDocsPage() {
  const paths = Object.keys(openApiSpec.paths)

  return (
    <div className="mx-auto max-w-6xl p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">API Documentation</h1>
        <p className="text-sm text-muted-foreground">
          Local docs viewer (no CDN dependency). Raw OpenAPI is available at{' '}
          <code>/api/openapi.json</code>.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Available Paths</h2>
        <ul className="space-y-2 text-sm">
          {paths.map((path) => (
            <li key={path} className="rounded border bg-background px-3 py-2">
              <code>{path}</code>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">OpenAPI JSON</h2>
        <pre className="max-h-[60vh] overflow-auto rounded border bg-muted/40 p-3 text-xs">
          <code>{JSON.stringify(openApiSpec, null, 2)}</code>
        </pre>
      </div>
    </div>
  )
}
