# PaperForge 10-Sprint Product Evolution

Date: 2026-06-03
Baseline: v23.0.0 main branch

This roadmap simulates the startup team operating 10 sprints ahead from the
current PaperForge implementation. Sprint 1 is represented by the code shipped
with this change. Sprints 2-10 are the next pickup queue for the trio workflow.

## Sprint 1 - Commercial Foundation

Promise: Make PaperForge coherent as a hosted subscription SaaS without removing
the self-hosted open-source core.

Role conversation:

- PO: "The paid product must be real in app behavior, not only on the pricing page."
- Designer: "Users need a billing destination and clear upgrade language when limits block them."
- Backend: "Free limits must be enforced in `createProject`, and checkout must be configurable."
- Frontend: "Pricing, dashboard billing, and project creation errors must share one plan model."
- Marketer: "Landing and README must stop promising no subscription while showing paid plans."
- QA: "Add tests that lock the catalog, route presence, and guardrail wiring."

Shipped evidence:

- `src/lib/billing-plans.ts`
- `src/app/api/v1/billing/plans/route.ts`
- `src/app/api/v1/billing/checkout/route.ts`
- `src/app/(dashboard)/billing/page.tsx`
- `src/services/project-service.ts`
- `src/app/pricing/page.tsx`
- `src/app/page.tsx`
- `README.md`
- `tests/lib/billing-plans.test.ts`
- `tests/integration/billing-saas.test.ts`

Acceptance:

- Free, Pro, and Team plan details come from one catalog.
- Authenticated users can reach an upgrade surface in the dashboard.
- Hosted checkout can be wired by environment variable.
- Manual sales-assisted checkout remains possible before a payment provider is configured.
- Free users are blocked from creating more than 3 active owned projects.

## Sprint 2 - Activation And Onboarding

Promise: A new user should reach a compiled document in less than five minutes.

Role conversation:

- PO: "Activation means registered, project created, template selected, first compile complete."
- Designer: "Replace generic empty states with an opinionated first-run path."
- Frontend: "Add onboarding checklist to dashboard and editor."
- Backend: "Track activation milestones in user settings or a lightweight event table."
- Marketer: "Use the onboarding path as the trial value story."
- QA: "Verify first-run states for empty account, template flow, and compile fallback."

Deliverables:

- First-run checklist on `/projects`. Shipped via `ActivationChecklist`.
- Activation computation helper in `src/lib/activation.ts`.
- Activation tests in `tests/lib/activation.test.ts`.
- Remaining future work: template-first create flow, persisted activation event markers,
  and welcome email with direct links to docs and templates.

## Sprint 3 - Team Selling Surface

Promise: A lab lead can understand and request Team within one session.

Role conversation:

- PO: "Team is bought for governance, onboarding, and predictable support."
- Designer: "Add Team comparison, buyer FAQ, and procurement-friendly copy."
- Frontend: "Build a Team inquiry form with plan context."
- Backend: "Persist sales inquiries and send notification email."
- Ops: "Rate-limit inquiries and log failures."
- Customer Success: "Define response SLA and sales handoff fields."

Deliverables:

- `/api/v1/billing/sales-inquiry`. Shipped.
- Sales inquiry audit event. Shipped as `billing.sales_inquiry`.
- Email template for sales notifications. Shipped as `salesInquiryEmailTemplate`.
- Billing dashboard Team inquiry form. Shipped.
- Remaining future work: `/pricing` Team FAQ and buyer objections.

## Sprint 4 - Usage Entitlements

Promise: Plan limits consistently control expensive behavior.

Role conversation:

- Backend: "Project count is not enough; compile rate, export volume, storage, and collaborator caps must be entitlement-aware."
- Frontend: "Blocked actions need upgrade CTAs, not silent failures."
- Ops: "Entitlements protect Redis, MinIO, worker, and email cost."
- QA: "Test each expensive action at limit and over limit."

Deliverables:

- Entitlement helper for collaborators. Shipped in `src/lib/entitlements.ts`.
- Collaborator invite and share-link join enforcement. Shipped in `src/services/member-service.ts`.
- Storage-quota enforcement and accurate usage accounting. Shipped in `src/lib/storage.ts`,
  enforced at the file-service layer (save, upload, delete) so usage is attributed to the
  project owner and written through to the `storageUsedBytes` the UI reads.
- Compile priority. Shipped in `src/services/compilation-service.ts`.
- Export-format entitlement. Shipped in `src/services/entitlement-service.ts`: DOCX, ZIP, and
  SyncTeX downloads require a paid plan (PDF stays free), gated by the project owner's plan and
  surfaced as an upgrade toast in the editor toolbar instead of a failed download.
- Tests for entitlement math, storage-quota math, export gating, and service wiring. Shipped.
- Remaining future work: AI entitlements, user-facing upgrade banners for every blocked action,
  and a one-time backfill so existing accounts' cached storage usage is exact before their next
  file write (today it converges on the next write).

## Sprint 5 - Billing Provider Integration

Promise: Pro can be purchased without manual intervention.

Role conversation:

- PO: "Start with one provider and one Pro checkout path."
- Backend: "Hosted checkout URLs are not enough; webhooks must update account plan."
- Frontend: "Checkout success and failure pages must be clear."
- Ops: "Secrets, webhook signing, and replay protection are mandatory."
- QA: "Webhook tests cover valid, invalid, replayed, and out-of-order events."

Deliverables:

- Payment provider webhook route.
- Subscription status stored in DB or settings migration.
- Checkout success/cancel pages.
- Audit trail for subscription changes.

## Sprint 6 - Collaboration Reliability

Promise: Paid collaboration feels safe during unstable networks.

Role conversation:

- Designer: "Connection state must be visible but not distracting."
- Frontend: "Improve offline banners, reconnect states, and collaborator presence."
- Backend: "Yjs auth and role checks need regression tests around viewer write drops."
- Ops: "Expose WebSocket connection count and disconnect reasons."

Deliverables:

- Collaboration health panel.
- WebSocket metrics route or admin widget.
- Viewer write-block verification.
- Reconnect and offline UX polish.

## Sprint 7 - Compilation SLA

Promise: Paid users can trust compilation latency.

Role conversation:

- PO: "Priority compile is the paid value, so measure it."
- Backend: "Queue priority must be plan-aware."
- Worker: "Expose wait time, run time, timeout, and retry metadata."
- Ops: "Alert when priority p95 violates target."
- Marketer: "Only publish SLA copy after metrics exist."

Deliverables:

- Plan-aware queue priority. Shipped in `src/services/compilation-service.ts`.
- Queue priority mapping. Shipped in `src/lib/entitlements.ts`.
- Compile latency metrics.
- Admin worker SLA widget.
- Support runbook for stuck queues.

## Sprint 8 - Institutional Admin

Promise: Team buyers can administer people and compliance needs.

Role conversation:

- PO: "Team needs buyer trust: users, audit, SSO path, and templates."
- Designer: "Admin screens must be dense and operational, not decorative."
- Backend: "Add organization model or Team workspace model."
- Frontend: "Add member management, role review, and template controls."
- QA: "Test role transitions, audit entries, and forbidden access."

Deliverables:

- Team workspace/organization model.
- Workspace member management.
- Workspace audit view.
- Template library scoped to workspace.
- Admin plan provisioning. Shipped via `PATCH /api/v1/admin/users/[id]` (`plan`) and the
  admin users plan selector — the sales-assisted path that actually assigns
  `settings.billingPlan`, making the entitlement layer reachable before a payment
  provider exists.

## Sprint 9 - Growth Funnel

Promise: Marketing can run acquisition experiments without engineering rewrites.

Role conversation:

- Marketer: "We need segmented landing pages for researchers, labs, and self-hosters."
- Designer: "Keep the first viewport product-focused and credible."
- Frontend: "Create reusable proof, comparison, and CTA sections."
- Backend: "Capture campaign source on registration."
- QA: "Verify SEO, metadata, and pricing consistency."

Deliverables:

- Persona landing variants.
- Campaign attribution stored in user settings.
- Pricing FAQ and objection handling.
- Trial conversion dashboard.

## Sprint 10 - Operating Maturity

Promise: The company can operate PaperForge as a real SaaS with support, incidents,
and release discipline.

Role conversation:

- PO: "We need a release train, not random improvements."
- Ops: "Runbooks, alerts, backups, and incident states must be documented and testable."
- Backend: "Health checks must include dependencies and commercial risk signals."
- Customer Success: "Support macros and escalation paths reduce response variance."
- QA: "Final verification includes npm test plus smoke checks for billing and projects."

Deliverables:

- Incident runbooks.
- Support macro library.
- Release checklist.
- Billing smoke test plan.
- Post-launch KPI review template.

## Next Pickup Queue

1. Complete Sprint 2 persisted activation event markers and welcome email.
2. Add Sprint 3 pricing-page Team FAQ and buyer objection copy.
3. Extend entitlements beyond project count and collaborators (storage usage, export formats).
4. Add payment provider webhook after the provider is chosen — it can write the same
   `settings.billingPlan` that admin provisioning already writes.
5. Move plan state from `settings.billingPlan` inference to a first-class subscription model when webhook work begins.
