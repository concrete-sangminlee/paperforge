import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('SaaS billing implementation', () => {
  it('exposes billing plan and checkout API routes', () => {
    expect(existsSync(join(process.cwd(), 'src/app/api/v1/billing/plans/route.ts'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'src/app/api/v1/billing/checkout/route.ts'))).toBe(true);
  });

  it('pricing page uses the centralized billing catalog and checkout button', () => {
    const pricing = readFileSync(join(process.cwd(), 'src/app/pricing/page.tsx'), 'utf-8');
    expect(pricing).toContain('BILLING_PLAN_LIST');
    expect(pricing).toContain('CheckoutButton');
    expect(pricing).toContain('formatPlanPrice');
  });

  it('dashboard exposes an authenticated billing page', () => {
    const billingPage = readFileSync(join(process.cwd(), 'src/app/(dashboard)/billing/page.tsx'), 'utf-8');
    const navbar = readFileSync(join(process.cwd(), 'src/components/shared/navbar.tsx'), 'utf-8');
    expect(billingPage).toContain('Plan and Billing');
    expect(billingPage).toContain('resolveBillingPlanForUser');
    expect(navbar).toContain('/billing');
  });

  it('checkout route supports hosted checkout and manual sales fallback', () => {
    const checkout = readFileSync(join(process.cwd(), 'src/app/api/v1/billing/checkout/route.ts'), 'utf-8');
    expect(checkout).toContain('BILLING_CHECKOUT');
    expect(checkout).toContain('hosted-checkout');
    expect(checkout).toContain('sales-assisted');
    expect(checkout).toContain('BILLING_CHECKOUT_PRO_MONTHLY_URL');
  });

  it('project creation is guarded by plan limits', () => {
    const projectService = readFileSync(join(process.cwd(), 'src/services/project-service.ts'), 'utf-8');
    expect(projectService).toContain('assertProjectCreationAllowed');
    expect(projectService).toContain('resolveBillingPlanForUser');
    expect(projectService).toContain('PLAN_LIMIT_REACHED');
  });

  it('documents the startup operating model and 10-sprint evolution', () => {
    const operatingModel = readFileSync(join(process.cwd(), 'docs/startup/2026-06-03-saas-operating-system.md'), 'utf-8');
    const sprintPlan = readFileSync(join(process.cwd(), 'docs/startup/2026-06-03-10-sprint-product-evolution.md'), 'utf-8');
    expect(operatingModel).toContain('SaaS Operating System');
    expect(operatingModel).toContain('Definition Of Done');
    expect(sprintPlan).toContain('Sprint 1 - Commercial Foundation');
    expect(sprintPlan).toContain('Sprint 10 - Operating Maturity');
  });
});
