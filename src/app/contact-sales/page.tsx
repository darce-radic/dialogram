import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ContactSalesPage() {
  return (
    <div className="mx-auto max-w-3xl p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Contact Sales</h1>
        <p className="text-muted-foreground">
          Tell us about your team size, security requirements, and rollout
          timeline. We will help you choose the right plan and implementation
          path.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enterprise Inquiry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Email: <a className="underline" href="mailto:sales@dialogram.app">sales@dialogram.app</a></p>
          <p>Include:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Number of users and expected agent seats</li>
            <li>Compliance/security requirements</li>
            <li>Integration requirements (MCP, webhooks, SSO)</li>
          </ul>
          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/pricing">Back to Pricing</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

