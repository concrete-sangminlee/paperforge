import { describe, expect, it } from 'vitest';
import { BILLING_PLANS, PLAN_IDS, resolveBillingPlanForUser } from '@/lib/billing-plans';
import {
  canAddProjectCollaborator,
  collaboratorLimitMessage,
  compilationQueuePriority,
  getEntitledPlan,
} from '@/lib/entitlements';

describe('plan entitlements', () => {
  it('resolves plan from the same billing source of truth', () => {
    expect(getEntitledPlan({ settings: { billingPlan: 'team' } }).id).toBe('team');
  });

  it('treats collaborator limits as non-owner collaborator slots', () => {
    expect(canAddProjectCollaborator(BILLING_PLANS.free, 1)).toBe(true);
    expect(canAddProjectCollaborator(BILLING_PLANS.free, 3)).toBe(false);
    expect(canAddProjectCollaborator(BILLING_PLANS.pro, 10)).toBe(true);
    expect(canAddProjectCollaborator(BILLING_PLANS.pro, 11)).toBe(false);
    expect(canAddProjectCollaborator(BILLING_PLANS.team, 500)).toBe(true);
  });

  it('produces upgrade copy for limited plans', () => {
    expect(collaboratorLimitMessage(BILLING_PLANS.free)).toContain('Upgrade to Pro');
    expect(collaboratorLimitMessage(BILLING_PLANS.team)).toBeNull();
  });

  it('maps paid plans to stronger queue priority', () => {
    expect(compilationQueuePriority(BILLING_PLANS.free)).toBeGreaterThan(compilationQueuePriority(BILLING_PLANS.pro));
    expect(compilationQueuePriority(BILLING_PLANS.pro)).toBeGreaterThan(compilationQueuePriority(BILLING_PLANS.team));
  });

  // Admin provisioning sets settings.billingPlan AND aligns storageQuotaBytes to
  // the plan. This guards the invariant that the quota it writes still resolves
  // back to the same plan via the storage fallback (so the two never disagree).
  it('plan-aligned storage quota resolves back to the same plan', () => {
    for (const planId of PLAN_IDS) {
      const plan = BILLING_PLANS[planId];
      expect(resolveBillingPlanForUser({ storageQuotaBytes: plan.storageBytes }).id).toBe(planId);
      // Explicit setting also wins regardless of quota.
      expect(
        resolveBillingPlanForUser({ settings: { billingPlan: planId }, storageQuotaBytes: 0 }).id,
      ).toBe(planId);
    }
  });
});
