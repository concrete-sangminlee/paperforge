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
- Persisted activation event markers. Shipped: `src/lib/activation-events.ts`
  (pure, idempotent first-reached-wins merge under `settings.activationEvents`)
  and `src/services/activation-service.ts` (`recordActivationEvent`, fire-and-forget,
  never throws). Wired into project creation (`created_project`) and email
  verification (`verified_email`).
- Welcome email with direct links to docs and templates. Shipped:
  `welcomeEmailTemplate` is sent on first email verification (idempotent — a
  repeated verify click does not re-send), linking to the template gallery and
  getting-started docs.
- Remaining future work: a template-first create flow, and wiring the remaining
  markers (`added_content`, `invited_collaborator`, `reviewed_billing`) into
  their hooks for a complete funnel.

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
- `/pricing` Team FAQ and buyer objections. Shipped: a "Buying for a lab or department?"
  section answering billing, self-hosting, data residency/export, SSO/audit, cancellation,
  and support-SLA questions, with a CTA into the Team inquiry form.

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
- Plan-aware AI allowance. Shipped: the per-user hourly AI cap in `ai/assist` now scales with the
  user's plan (`aiRequestsPerHour`) via `aiHourlyRateLimit`.
- Storage cache backfill. Shipped: `recalculateAllUsersStorage` + admin route
  `POST /api/v1/admin/storage/recalc` recompute every account's cached usage from the files table.
- Tests for entitlement math, storage-quota math, export gating, AI tiering, and service wiring. Shipped.
- Remaining future work: user-facing upgrade banners for every blocked action, and a payment
  webhook that writes the same `settings.billingPlan` admin provisioning already writes.

## Sprint 5 - Billing Provider Integration

Promise: Pro can be purchased without manual intervention.

Role conversation:

- PO: "Start with one provider and one Pro checkout path."
- Backend: "Hosted checkout URLs are not enough; webhooks must update account plan."
- Frontend: "Checkout success and failure pages must be clear."
- Ops: "Secrets, webhook signing, and replay protection are mandatory."
- QA: "Webhook tests cover valid, invalid, replayed, and out-of-order events."

Deliverables:

- Payment provider webhook route. Shipped as `POST /api/v1/billing/webhook`: a
  provider-agnostic, Stripe-shaped endpoint that HMAC-verifies the signature
  (with a replay-window timestamp tolerance), is idempotent per provider event
  id (the audit log doubles as the processed-event ledger), and is rate-limited
  per IP. Returns 503 until `BILLING_WEBHOOK_SECRET` is configured.
- Subscription status stored via settings migration. Shipped: the webhook writes
  the same `settings.billingPlan` (+ matching `storageQuotaBytes`) that admin
  provisioning writes, through the shared `applyBillingPlanToUser` billing
  service. `checkout.session.completed` / `customer.subscription.updated`
  activate the paid plan; `customer.subscription.deleted` downgrades to Free.
- Checkout success/cancel pages. Shipped as `/billing/success` and
  `/billing/cancel`.
- Audit trail for subscription changes. Shipped as `billing.subscription_activated`,
  `billing.subscription_canceled`, and `billing.webhook_processed` audit events.
- Remaining future work: promote `settings.billingPlan` to a first-class
  subscription model (provider customer/subscription ids, current-period-end,
  status) once a single provider is committed; today the webhook is wired and
  verified end-to-end against Stripe-shaped events but no provider account is
  bundled.

## Sprint 6 - Collaboration Reliability

Promise: Paid collaboration feels safe during unstable networks.

Role conversation:

- Designer: "Connection state must be visible but not distracting."
- Frontend: "Improve offline banners, reconnect states, and collaborator presence."
- Backend: "Yjs auth and role checks need regression tests around viewer write drops."
- Ops: "Expose WebSocket connection count and disconnect reasons."

Deliverables:

- WebSocket metrics route. Shipped: `getCollabMetrics()` in
  `websocket/src/yjs-server.ts` snapshots live documents and attached clients;
  the WS server serves a `/metrics` endpoint exposing aggregate counts only
  (documents, connections, distinct users) — never per-project ids — so it is
  safe to serve unauthenticated like `/healthz`.
- Viewer write-block verification. Shipped: executable regression tests
  (`tests/integration/collab-yjs-server.test.ts`) drive the Yjs server with a
  read-only connection and prove a viewer's sync write is dropped (server doc
  unchanged, no broadcast) while an editor's write is applied and broadcast.
  Connection lifecycle + memory cleanup on last-disconnect are covered too.
- Remaining future work: a collaboration health panel in the admin UI (the
  metrics endpoint is the data source), and reconnect/offline UX polish in the
  editor client.

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
- Compile latency metrics. Shipped: `src/lib/compile-sla.ts` (pure percentile +
  summary math) and `src/services/compilation-metrics-service.ts` aggregate the
  persisted compilation status/duration into p50/p95/p99 latency, success rate,
  and throughput over rolling 24h/7d windows, evaluated against
  `COMPILE_SLA.TARGET_P95_MS`. No schema change — reads the existing table.
- Admin worker SLA widget. Shipped: `GET /api/v1/admin/compile-sla` (admin-gated,
  read-only) feeds an SLA section on the admin workers page showing p95/p50
  latency, success rate, throughput, and target compliance.
- Remaining future work: persist queue *wait* time (enqueue→start) for a full
  wait+run SLA, per-plan latency breakdown, and a stuck-queue support runbook.

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

- Campaign attribution stored in user settings. Shipped: `src/lib/campaign.ts`
  (sanitized, first-touch parse/merge of utm_* / referrer) and
  `src/services/campaign-service.ts`, captured fire-and-forget at registration
  into `settings.attribution`.
- Pricing FAQ and objection handling. Shipped in Sprint 3.
- Trial conversion dashboard. Shipped: `src/lib/funnel.ts` (pure funnel math)
  and `src/services/funnel-service.ts` build an acquisition→activation funnel
  (registered → verified → created-project) plus paid conversion/churn from
  cheap indexable counts (emailVerified column, project-owner relation,
  subscription audit events — no JSON scan). Surfaced via
  `GET /api/v1/admin/funnel` and a Growth Funnel card on the admin dashboard.
- Remaining future work: persona landing variants, and an attribution-source
  breakdown (requires a settings-JSON scan or a denormalized column).

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

- Incident runbooks. Shipped: `docs/operations/incident-runbooks.md` (severity
  model + RB-1..RB-6 keyed to real health signals and fallbacks).
- Support macro library. Shipped: `docs/operations/support-macros.md`.
- Release checklist. Shipped: `docs/operations/release-checklist.md` (pre-flight
  through rollback, including worker/websocket builds and schema sync).
- Billing smoke test plan. Shipped: `docs/operations/billing-smoke-test.md`
  (signed-webhook activation, security/idempotency, downgrade, entitlements).
- Post-launch KPI review template. Shipped:
  `docs/operations/kpi-review-template.md`, mapped to the operating-model metrics
  and to the attribution/activation markers + audit events that source them.

## Next Pickup Queue

1. Complete Sprint 2 persisted activation event markers and welcome email.
2. ~~Add payment provider webhook~~ — Shipped (`POST /api/v1/billing/webhook`,
   `applyBillingPlanToUser`, success/cancel pages, subscription audit events).
3. Choose a single provider, bundle its SDK/keys, and wire the hosted-checkout
   `success_url`/`cancel_url` to `/billing/success` and `/billing/cancel`.
4. Move plan state from `settings.billingPlan` inference to a first-class
   subscription model (customer/subscription ids, period end, status) — the
   webhook handler is the natural write point.
5. Sprint 7: compile latency metrics + admin SLA widget (priority queueing is
   already plan-aware; the gap is measurement/observability).
