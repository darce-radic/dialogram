export interface PricingPlan {
  name: string
  price: string
  period: string
  badge: string
  cta: string
  href: string
  highlighted?: boolean
  features: string[]
}

export const pricingPlans: PricingPlan[] = [
  {
    name: 'Starter',
    price: '$0',
    period: '/month',
    badge: 'For individuals',
    cta: 'Start Free',
    href: '/sign-up',
    features: [
      'Up to 3 active workspaces',
      'Basic collaboration and comments',
      'Limited history and integrations',
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    badge: 'Most Popular',
    cta: 'Start Pro Trial',
    href: '/sign-up',
    highlighted: true,
    features: [
      'Unlimited workspaces and documents',
      'Agent keys, webhooks, and scratchpads',
      'Branch proposals and advanced reviews',
      'OpenAPI and MCP integration support',
    ],
  },
  {
    name: 'Team',
    price: '$149',
    period: '/month',
    badge: 'For orgs',
    cta: 'Contact Sales',
    href: '/contact-sales',
    features: [
      'Everything in Pro',
      'Priority support and onboarding',
      'Custom security and policy controls',
      'Usage and admin controls for larger teams',
    ],
  },
]
