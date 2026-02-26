import Link from 'next/link'
import { ShieldCheck, Lock, KeyRound, Database, FileCheck2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const controls = [
  {
    title: 'Encryption In Transit',
    detail:
      'Traffic between clients and the platform should run over TLS/HTTPS with secure cookies and strict transport controls.',
    icon: Lock,
  },
  {
    title: 'Encryption At Rest',
    detail:
      'Database and storage encryption are applied at infrastructure level, with optional app-level encryption for sensitive secrets.',
    icon: Database,
  },
  {
    title: 'Access Control',
    detail:
      'Workspace-scoped authorization with RLS and role-based access for users and agents.',
    icon: KeyRound,
  },
  {
    title: 'Auditable Changes',
    detail:
      'Comments, branch proposals, and webhook-driven events are structured for traceability and reviewability.',
    icon: FileCheck2,
  },
]

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-5xl p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Security & Data Trust</h1>
        <p className="text-muted-foreground">
          We design Dialogram for teams that require clear ownership, secure
          collaboration, and predictable data handling.
        </p>
      </div>

      <Card className="border-cyan-700/30 bg-cyan-50/30">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-700" />
            Data Ownership Commitment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Under our current policy and terms, you retain ownership of your
            workspace content.
          </p>
          <p>
            By default, Dialogram does not use your workspace content to train
            foundation models unless you explicitly opt in.
          </p>
          <p>
            Data is processed to provide the service as described in our data
            policy and applicable agreements.
          </p>
          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/data-policy">Read Data Policy</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {controls.map((control) => (
          <Card key={control.title}>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <control.icon className="h-4 w-4 text-cyan-700" />
                {control.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {control.detail}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
