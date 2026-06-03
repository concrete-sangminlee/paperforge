import { describe, expect, it } from 'vitest';
import { BILLING_PLANS } from '@/lib/billing-plans';
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
});
