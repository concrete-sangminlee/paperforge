'use client';

import Link from 'next/link';
import { CheckIcon, FlameIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckoutButton } from '@/components/billing/checkout-button';
import { BILLING_PLAN_LIST, formatPlanPrice } from '@/lib/billing-plans';

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
          Plans for serious paper teams
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Start free, then subscribe when you need more projects, storage, collaborators,
          exports, and priority compilation.
        </p>
      </div>

      {/* Plans */}
      <div className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {BILLING_PLAN_LIST.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              'relative flex flex-col rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-lg',
              plan.recommended && 'border-orange-500 shadow-md ring-1 ring-orange-500/20',
            )}
          >
            {plan.recommended && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white hover:bg-orange-600">
                Most Popular
              </Badge>
            )}

            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-orange-600">
              {plan.audience}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">{formatPlanPrice(plan)}</span>
              <span className="text-sm text-muted-foreground">{plan.priceUnit}</span>
            </div>

            <ul className="mt-8 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>

            {plan.id === 'free' ? (
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'mt-8 w-full',
                )}
              >
                {plan.cta}
              </Link>
            ) : (
              <CheckoutButton
                planId={plan.id}
                variant={plan.recommended ? 'default' : 'outline'}
                className={cn(
                  'mt-8 w-full',
                  plan.recommended && 'bg-orange-500 hover:bg-orange-600',
                )}
              >
                {plan.cta}
              </CheckoutButton>
            )}
          </div>
        ))}
      </div>

      {/* FAQ hint */}
      <div className="border-t bg-muted/30 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          The hosted SaaS funds priority compilation, support, and production operations.
          The open-source self-hosted edition remains available under the MIT license.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Questions? <a href="mailto:support@paperforge.dev" className="underline">Contact us</a>
        </p>
      </div>
    </div>
  );
}
