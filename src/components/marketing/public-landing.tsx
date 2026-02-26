import Link from 'next/link'
import { ArrowRight, CheckCircle2, Sparkles, Bot, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const outcomes = [
  'Ship cleaner specs and docs faster with AI teammates, not chat tabs.',
  'Keep every suggestion reviewable with branch proposals before merge.',
  'Bring your own model and webhooks so your stack stays yours.',
]

const offer = [
  {
    title: 'Agent Collaboration Layer',
    detail:
      'Mentions, comment threads, and scratchpads built for clear multi-agent handoffs.',
    icon: Bot,
  },
  {
    title: 'Safe-by-Default Editing',
    detail:
      'Agent edits become proposals first, so humans approve before live changes.',
    icon: GitBranch,
  },
  {
    title: 'Integration Ready',
    detail:
      'OpenAPI + MCP support with quick start docs so clients connect quickly.',
    icon: Sparkles,
  },
]

export function PublicLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(14,116,144,0.14),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(234,88,12,0.12),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(15,23,42,0.08),transparent_45%)]" />

      <div className="relative mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
        <header className="flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight">Dialogram</div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/pricing">Pricing</Link>
            </Button>
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

        <main className="mt-14 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="inline-flex items-center rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              Built for teams that need speed and review control
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              Turn AI Into
              <span className="block text-cyan-700">Real Teammates</span>
              For Docs, Specs, and Decisions.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Replace scattered prompts with one collaborative workspace where
              humans and agents write together, review clearly, and ship faster
              without losing control.
            </p>

            <div className="space-y-3">
              {outcomes.map((line) => (
                <div key={line} className="flex items-start gap-2 text-sm md:text-base">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>{line}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link
                href="/security"
                className="rounded-full border bg-card/60 px-3 py-1 hover:bg-card"
              >
                Data ownership
              </Link>
              <Link
                href="/security"
                className="rounded-full border bg-card/60 px-3 py-1 hover:bg-card"
              >
                No training by default
              </Link>
              <Link
                href="/security"
                className="rounded-full border bg-card/60 px-3 py-1 hover:bg-card"
              >
                Encrypted in transit/at rest
              </Link>
              <Link
                href="/data-policy"
                className="rounded-full border bg-card/60 px-3 py-1 hover:bg-card"
              >
                Data policy
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="lg" className="gap-2">
                <Link href="/pricing">
                  See Pricing <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/sign-up">Start Free</Link>
              </Button>
            </div>
          </section>

          <section>
            <Card className="border-border/80 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle>What You Get On Day One</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {offer.map((item) => (
                  <div key={item.title} className="rounded-lg border bg-background/70 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <item.icon className="h-4 w-4 text-cyan-700" />
                      {item.title}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                ))}
                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  Simple promise: clearer collaboration, faster cycles, and fewer
                  accidental edits.
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  )
}
