# PaperForge SaaS Operating System

Date: 2026-06-03
Status: Active operating model

## Commercial Assumption

PaperForge is treated as a revenue-generating hosted SaaS with an MIT-licensed
self-hosted core. The hosted product sells convenience, reliability, storage,
compilation capacity, support, governance, and team administration.

The product must therefore be evaluated as both software and a supply operation:
users subscribe, the company provisions capacity, support responds to incidents,
marketing explains the value, and engineering protects unit economics.

## Roles

| Role | Owns | Primary decisions | Evidence expected |
|---|---|---|---|
| Product Owner | Product strategy, pricing, sprint priority | What paid users need next | Roadmap, acceptance criteria, KPI deltas |
| Planner | Scope, sequencing, dependency control | What fits in the next sprint | Sprint brief, risks, dependency map |
| Designer | Workflow, information architecture, interaction quality | How users understand and complete work | UI specs, copy, accessibility notes |
| Frontend Engineer | Pages, components, client state, UX polish | How the product feels in browser | Implemented UI, responsive checks |
| Backend Engineer | APIs, data model, limits, integration points | How revenue and usage are enforced | Routes, services, validation, tests |
| SRE/Ops | Availability, capacity, deploy safety, observability | How the SaaS runs reliably | Runbooks, alerts, dashboards |
| QA/Verifier | Regression detection, test realism | Whether the shipped behavior is true | Test results, edge-case notes |
| Marketer | Positioning, pricing narrative, funnel | Why buyers pay instead of self-hosting | Landing copy, pricing copy, campaign plan |
| Customer Success | Onboarding, support loops, retention | How customers get value quickly | Playbooks, support macros, churn notes |

## Sprint Cadence

Each sprint is one product increment with a commercial review:

1. Product Owner writes the sprint promise and KPI target.
2. Planner breaks it into ship units and names dependencies.
3. Designer defines the workflow and copy.
4. Frontend and Backend implement disjoint surfaces.
5. Ops adds deployment, configuration, observability, and support hooks.
6. QA verifies with `npx tsc --noEmit --pretty false`, `npm run lint`, and
   `npm test` when the change is broad.
7. Marketer updates public positioning only when the implemented behavior is true.
8. Customer Success adds onboarding/support notes for any changed paid workflow.

## Definition Of Done

A sprint is done only when these are true:

- Product behavior exists in code or an explicit operational artifact.
- Pricing, landing, docs, and app UI do not contradict one another.
- Paid/free limits are enforced near the backend, not only in marketing copy.
- Failure paths tell the customer what to do next.
- New commercial surfaces are covered by focused tests.
- The working tree is clean after commit and push.
- Verification is reported honestly. Typecheck and lint are not equivalent to
  full product verification.

## Current Sprint 1 Shipment

This change establishes the first commercial operating slice:

- Central plan catalog in `src/lib/billing-plans.ts`.
- Free, Pro, and Team limits shared by pricing, billing UI, and services.
- `/api/v1/billing/plans` plan catalog endpoint.
- `/api/v1/billing/checkout` checkout handoff endpoint.
- Hosted checkout is configured by environment variables.
- Sales-assisted checkout remains available when hosted checkout URLs are absent.
- Free project creation is guarded by backend plan limits.
- `/billing` dashboard page exposes current plan, storage usage, and upgrade CTAs.
- Landing, README, and pricing copy now present hosted SaaS plus self-hosted core
  as one coherent product.

## Operating Metrics

| Metric | Owner | Why it matters |
|---|---|---|
| Activation rate | Product Owner | Measures first successful project creation and compile |
| Free-to-Pro conversion | Marketer + Product Owner | Validates monetization |
| Compile queue wait p95 | SRE/Ops | Protects paid value proposition |
| Storage cost per paid account | Backend + Ops | Protects margin |
| Support first response time | Customer Success | Protects Team plan credibility |
| Failed checkout rate | Backend + Marketer | Detects revenue flow breakage |
| Churn reason distribution | Product Owner + CS | Guides roadmap priority |

## Communication Template

Every sprint review should produce this record:

```text
Sprint:
Promise:
PO:
Planner:
Designer:
Frontend:
Backend:
Ops:
QA:
Marketing:
Customer Success:
Shipped evidence:
Verification:
Open risks:
Next pickup queue:
```
