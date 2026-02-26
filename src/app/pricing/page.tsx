import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { pricingPlans } from '@/config/pricing'

export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(14,116,144,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(234,88,12,0.1),transparent_35%)]" />
      <div className="relative mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Dialogram
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/security">Security</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/help">Help</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Start free</Link>
            </Button>
          </div>
        </header>

        <main className="mt-12 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-semibold md:text-5xl">
              Simple Pricing, Built for Fast Adoption
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Start free, prove value quickly, then scale agents and
              integrations as your team grows.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? 'border-cyan-700/50 shadow-lg shadow-cyan-900/10'
                    : ''
                }
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    <Badge variant={plan.highlighted ? 'default' : 'secondary'}>
                      {plan.badge}
                    </Badge>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-semibold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
