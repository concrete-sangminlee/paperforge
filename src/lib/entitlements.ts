import {
  type BillingPlan,
  getNextUpgradePlan,
  resolveBillingPlanForUser,
} from '@/lib/billing-plans';

export interface EntitlementUser {
  settings?: unknown;
  storageQuotaBytes?: number | string | bigint | null;
}

export function getEntitledPlan(user: EntitlementUser): BillingPlan {
  return resolveBillingPlanForUser(user);
}

export function canAddProjectCollaborator(plan: BillingPlan, currentMemberCount: number) {
  if (plan.collaboratorLimit === null) return true;

  const existingCollaborators = Math.max(0, currentMemberCount - 1);
  return existingCollaborators < plan.collaboratorLimit;
}

export function collaboratorLimitMessage(plan: BillingPlan) {
  if (plan.collaboratorLimit === null) return null;

  const upgrade = getNextUpgradePlan(plan.id);
  const suffix = upgrade
    ? ` Upgrade to ${upgrade.name} for more collaborators.`
    : ' Contact sales to raise this limit.';

  return `${plan.name} includes ${plan.collaboratorLimit} collaborators per project.${suffix}`;
}
