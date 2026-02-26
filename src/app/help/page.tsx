import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const sections = [
  {
    title: 'Sign In',
    description:
      'Use your account credentials or GitHub OAuth to access your workspace.',
    image: '/help/sign-in.png',
    alt: 'Dialogram sign in screen',
  },
  {
    title: 'Sign Up',
    description:
      'Create a new account with email/password or GitHub in under a minute.',
    image: '/help/sign-up.png',
    alt: 'Dialogram sign up screen',
  },
  {
    title: 'API Documentation',
    description:
      'Review endpoints and payload structures in the in-app API docs page.',
    image: '/help/api-docs.png',
    alt: 'Dialogram API docs page',
  },
  {
    title: 'OpenAPI JSON',
    description:
      'Use the OpenAPI document for SDK generation and client integrations.',
    image: '/help/openapi-json.png',
    alt: 'Dialogram OpenAPI JSON response',
  },
]

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-6xl p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Dialogram Help Center</h1>
        <p className="text-muted-foreground">
          Quick onboarding for authentication and API integration.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="default">
          <Link href="/sign-in">Go to Sign In</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/api-docs">Open API Docs</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/api/openapi.json">Open OpenAPI JSON</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
              <div className="overflow-hidden rounded-md border">
                <Image
                  src={section.image}
                  alt={section.alt}
                  width={1600}
                  height={900}
                  className="h-auto w-full"
                  priority={section.title === 'Sign In'}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

