import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DataPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Data Policy</h1>
        <p className="text-sm text-muted-foreground">
          This page is a product-facing summary. Keep your legal privacy policy
          and terms consistent with this language.
        </p>
        <p className="text-sm text-muted-foreground">
          This summary is informational and does not replace your legally binding
          privacy policy, terms, or data processing agreements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Core Principles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            1. <strong>You retain ownership</strong> of content you create in
            Dialogram.
          </p>
          <p>
            2. <strong>No model training on customer content</strong> unless you
            explicitly opt in.
          </p>
          <p>
            3. <strong>Service-only processing</strong>: data is processed to
            operate features you use.
          </p>
          <p>
            4. <strong>Export and deletion controls</strong> should be available
            so customers can move or remove their data.
          </p>
          <p>
            5. <strong>Security controls</strong> include encryption in transit,
            encryption at rest, and strict access control.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/security">Back to Security</Link>
        </Button>
      </div>
    </div>
  )
}
