'use client';

import Link from 'next/link';
import { CheckIcon, FlameIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for individual researchers',
    features: [
      '1 GB storage',
      '3 projects',
      'Real-time collaboration (2 users)',
      'PDF preview & export',
      'LaTeX autocomplete',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/register',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$8',
    period: '/month',
    description: 'For serious academics and teams',
    features: [
      '10 GB storage',
      'Unlimited projects',
      'Real-time collaboration (10 users)',
      'PDF, DOCX & ZIP export',
      'Git integration',
      'Version history',
      'Priority compilation',
      'Email support',
    ],
    cta: 'Start Pro Trial',
    href: '/register?plan=pro',
    popular: true,
  },
  {
    name: 'Team',
    price: '$15',
    period: '/user/month',
    description: 'For research labs and departments',
    features: [
      '100 GB shared storage',
      'Unlimited projects & users',
      'Real-time collaboration (unlimited)',
      'All export formats',
      'Git integration + SSO',
      'Admin dashboard',
      'Audit log',
      'Priority support + SLA',
      'Custom templates',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@paperforge.dev',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <FlameIcon className="size-6 text-orange-500" />
          <span className="text-lg font-bold">PaperForge</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link href="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <Badge variant="secondary" className="mb-4">Pricing</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Start free. Upgrade when you need more storage, collaborators, or priority compilation.
        </p>
      </div>

      {/* Plans */}
      <div className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              'relative flex flex-col rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-lg',
              plan.popular && 'border-orange-500 shadow-md ring-1 ring-orange-500/20',
            )}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white hover:bg-orange-600">
                Most Popular
              </Badge>
            )}

            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>

            <ul className="mt-8 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link href={plan.href} className="mt-8">
              <Button
                className={cn(
                  'w-full',
                  plan.popular && 'bg-orange-500 hover:bg-orange-600',
                )}
                variant={plan.popular ? 'default' : 'outline'}
              >
                {plan.cta}
              </Button>
            </Link>
          </div>
        ))}
      </div>

      {/* FAQ hint */}
      <div className="border-t bg-muted/30 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          All plans include LaTeX autocomplete, inline linting, and real-time collaboration.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Questions? <a href="mailto:support@paperforge.dev" className="underline">Contact us</a>
        </p>
      </div>
    </div>
  );
}
