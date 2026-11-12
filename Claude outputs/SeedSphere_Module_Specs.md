# SeedSphere: Code Analysis, Next Steps and Module-by-Module Specification

Source analysed: `seedflow-sms-fresh` (branch `main`), read-only inspection plus a typecheck and unit-test run in a scratch copy.

---

## Part A. Analysis of the Existing Code

### A1. Size and shape

| Area | Size |
|---|---|
| Backend (`server/src`) | ~25,600 lines TypeScript, 39 feature modules, ~282 route handlers under `/api/v1` |
| Frontend (`src`) | ~117,800 lines TypeScript/TSX, 16 page areas, ~150 screens, route guard by permission |
| Database | 58 migrations, ~86 tables, 1 materialized view, year-partitioned `audit_logs` and `api_request_metrics` |
| Mobile (`mobile`) | Expo 57 / React Native 0.86 skeleton: login screen, offline store, sync service (46 lines) |
| Tests | Backend: 21 unit files, 29 integration files (231 tests). Frontend: 0 unit tests. E2E: 1 Playwright spec |
| Git | 1,130 tracked files on `main`. Large uncommitted working-tree changes (about 30+ modified files shown). Two commits of history plus earlier "initial commit" entries |

### A2. Verified health checks

| Check | Result |
|---|---|
| Frontend typecheck (`tsc --noEmit`, project TypeScript 5.9.3) | **Passes** |
| Server typecheck (`tsc --noEmit`) | **Passes** |
| Server unit tests | **216 pass, 15 fail**. All 15 failures are in `allocations.service.test.ts` and need a live PostgreSQL test database (`.env.test` points at `seedflow_test`). This is an environment gap, not a code defect. |
| Server integration tests | Not run here (need PostgreSQL) |
| Frontend unit tests | None exist |
| Lint | Not run |
| Migrations / live API | Not run (no database in this environment) |

Note: the earlier description of SeedSphere as "built and working" was based on reading the code. Runtime behaviour has not been verified end to end yet.

### A3. Architecture as implemented

- Express 4 + TypeScript API, one Vercel serverless function (`serverless.ts`) plus a long-running mode (`server.ts`) with WebSocket (`ws`).
- Auth: JWT access tokens (15 min) + refresh tokens stored in the DB (`refresh_tokens`), bcrypt, `express-rate-limit`.
- `requireAuth` is applied on every router (checked file by file: no router lacks it).
- `requireRole(...)` is used in 37 of 39 module files.
- Ownership helper `assertOwnsOrganization` (Admin bypasses; others must match `organization_id`).
- Frontend: React 18 + React Router, `ProtectedRoute` with a `permission` prop, `AuthContext`, Recharts, jsPDF/html2canvas, QR code generation.
- Config: `DATABASE_URL` with automatic TLS for Supabase hosts; production refuses to start with the dev JWT secret (good).
- AI: pluggable provider (`anthropic` / `openai` / `gemini` / `openai-compatible`), rules-engine fallback without a key, Postgres full-text RAG over `ai_knowledge_docs`.

### A4. Strengths to build on

1. **Strong quality spine.** SOP → NCR → CAPA → verification, plus complaints, lot holds and compliance requirements (`quality` has 50 handlers, 12 files).
2. **Traceability foundation.** Seed-lot parentage with validation triggers, a genealogy materialized view, a hash-chained lot record, signing keys, lot authenticity certificates.
3. **Lab data model.** Submissions, results, quality flags, and germination/purity/viability tables.
4. **Governance and audit.** Workflow engine with stages and approve/reject, `audit_logs` partitioned by year, data-access logs, retention policies, anonymization of farmer data.
5. **Breadth.** Market intelligence, breeding analytics, climate-smart selection, financing, government subsidies, partner seed-bank integration, and customizable fields are already modelled.
6. **Production-safety defaults.** Partitioned logs, FK indexes, monitoring tables, JWT guard.

### A5. Problems found (ranked)

**Security and secrets (fix first)**

1. **Environment files committed to git.** `.env.local` and `server/.env.test` are tracked. `.gitignore` has `.env` but not `.env.*`, so the pattern does not cover `.env.local` / `.env.test`. Check their values, rotate anything real, and untrack them.
2. **Demo-data fallback on login.** `useBackendSession` resolves login from the demo dataset when the API is unreachable. In production this can let anyone "log in" to a demo session without the server. Disable it in production builds.
3. **Seed passwords printed to console.** `seedAuth.ts` logs `email / password` for every created user. Move seed passwords to environment variables and stop logging them.
4. **Demo accounts in frontend source** (`src/data/demoAccounts.ts`, about 20 accounts). Keep demo accounts out of production bundles.
5. **Tenant isolation is incomplete.** Only 31 of 39 module files reference `organization_id`, so 8 modules may return data across organizations. Needs a per-query audit and automated tests.
6. **Roles are hard-coded to 5.** `ROLES` in `roles.ts` is `Admin, Breeder, Producer, Inspector, Warehouse Manager`. The blueprint's 10+ roles are not implemented. Yet the frontend has its own permission model. The two must be reconciled, or the server will be the only source of truth.
7. **No MFA, no SSO.**

**Repository hygiene**

8. About 30+ uncommitted modified files on `main`. Commit a clean baseline before building anything new.
9. Root-level clutter: `_to_delete/`, `Claude outputs/` (with zip/tgz archives, duplicate `.tsx`/`.sql` copies, a `merge/` folder), `_src_snapshot.tgz`, `_repo_for_upgrade.tgz`, `.docx` documents. Move archives out of the repo and add them to `.gitignore`. Deleting needs your approval.
10. `README.md` is just `# Seedflow SMS`. The real setup guide is in `DEPLOY_SUPABASE_VERCEL.md` and `RUN_SEEDSPHERE.md`.
11. The repo name is `seedflow-sms` but the product is `SeedSphere`. Pick one name for the codebase.

**Testing and quality**

12. 15 backend unit tests depend on a live database. Add a Docker PostgreSQL service and a `.env.test` template (no secrets) so they run in CI.
13. Zero frontend unit tests. Only one E2E spec (`full-lifecycle.spec.ts`).
14. No CI pipeline found in the repo.
15. Lint has not been run. Run it and fix the backlog.

**Architecture and deployment**

16. Vercel limits: no WebSocket, no background timers (storage expiry), 4.5 MB request cap. The live inventory feature and expiry notifications will not work there.
17. Mixed config patterns: `server/src/config/env.ts` and direct `process.env` reads in `pool.ts` and `seed.ts`.
18. Large frontend files and monolithic `AppRoutes.tsx` (about 230+ lines of routing). Split by module.

**Coverage gaps against the blueprint**

19. Mobile app is a login screen only. Offline inspection, sync endpoints and photo capture are not built.
20. No public (unauthenticated) lot verification endpoint for farmers and consumers. The authenticity routes all require login.
21. No recall workflow that notifies affected farmers.
22. No country packs (rules are company-specific: `compliance.template.ts` seeds one company).
23. No dealer hierarchy, invoicing, or price lists.
24. No SMS/WhatsApp notification gateway found in the route list.
25. No public API keys, webhooks, or government-portal (SATHI) connector.
26. No IoT ingestion for cold-chain sensors.
27. No marketplace.
28. Trials (DUS/VCU) and germplasm accessions are not modelled.

### A6. Module status summary

| # | Module | Existing backend | Coverage |
|---|---|---|---|
| M1 | Identity, Tenancy & Admin | auth, users, organizations, refresh tokens, audit logs | Partial |
| M2 | Variety & Germplasm | crops, crop varieties, varieties, performance ratings | Partial |
| M3 | Seed Production & Certification | crop planning, field inspections, lot stages | Partial |
| M4 | Lot Management & Traceability | seed lots, allocations, genealogy, hash chain, authenticity | **Strong** |
| M5 | Seed Testing Laboratory | lab testing, germination/purity/viability | Partial |
| M6 | Processing & Packaging | packaging batches and units, label lookup | Partial |
| M7 | Quality Management | SOPs, NCRs, CAPAs, complaints, holds, compliance requirements | **Strong** |
| M8 | Compliance & Regulatory | compliance register, phytosanitary and quality certificates | Partial |
| M9 | Warehouse & Cold Chain | storage locations, assignments, condition logs, FIFO, monitoring | Partial |
| M10 | Sales, Distribution & Procurement | purchase orders, seed requests, partner orders | Partial |
| M11 | Farmer Platform | farmers, farmer education, Q&A, privacy, push notifications | Partial |
| M12 | Field Mobile App | Expo skeleton, device push tokens | **Minimal** |
| M13 | Market Intelligence & Demand | prices, demand forecasts, weather, ministry forecasts, insurance records | Partial |
| M14 | Breeding & Climate Analytics | trait measurements, hybrid predictions, climate alerts | Partial |
| M15 | Finance, Insurance & Subsidies | financing accounts, subsidy programs/claims, government reports | Partial |
| M16 | Marketplace | none | **Missing** |
| M17 | Training & Competency | farmer education only | **Missing** (staff) |
| M18 | Recall & Complaint Response | complaints, lot holds, lot impact, compliance chain | Partial |
| M19 | Analytics & Benchmarks | dashboards, performance ratings, monitoring | Partial |
| M20 | Integrations & Public API | partners sync, reconciliation, custom fields | Partial |
| X1 | AI Layer | AI center, knowledge search, forecasts, photo analysis, assistant | Partial |

---

## Part B. What To Do Next (Prioritized)

### Sprint 0: Safety and clean baseline (3–5 days)

| # | Task | Done when |
|---|---|---|
| 0.1 | Rotate any real secrets in `.env.local` and `server/.env.test`. Untrack both (`git rm --cached`). Make `.gitignore` cover `.env*` except `.env.example`. | `git ls-files` shows no env files with values |
| 0.2 | Disable the demo-login fallback and demo accounts in production builds (behind `VITE_DEMO_MODE`, default off). | Production build cannot log in without the API |
| 0.3 | Stop `seedAuth.ts` printing passwords. Read seed passwords from env. | No credentials in console output or source |
| 0.4 | Commit the current working tree as a baseline on `main`, or on a feature branch first. Move archives and `Claude outputs/` out of the repo. | `git status` clean; repo size reduced |
| 0.5 | Confirm the Vercel production env has `JWT_ACCESS_SECRET` set to a real value and `DATABASE_URL` on the transaction pooler. | `/api/v1/health` returns ok; AI Center shows the expected status |
| 0.6 | Smoke-test the live app: login, create a seed lot, allocate, run a lab test, raise an NCR. Record failures. | Written smoke-test result |

### Sprint 1: Tenant isolation and test foundation (1–2 weeks)

| # | Task | Done when |
|---|---|---|
| 1.1 | Add Docker `postgres:16` to dev setup. Add `.env.test.example`. Run `npm run db:test:migrate` and the full backend suite. | All 231 backend tests green locally |
| 1.2 | Audit the 8 modules with no `organization_id` references (see A5 item 5). Scope list and detail queries to the caller's organization, or document why they are global. | Written list; each module scoped or justified |
| 1.3 | Add an integration test per module: a Producer from Org A cannot read or change Org B's record. | Cross-tenant test suite green |
| 1.4 | Audit every mutating route for `requireRole`. Output a permission matrix (route × role). | Matrix committed to `docs/` |
| 1.5 | Add CI (GitHub Actions): typecheck, lint, backend tests with Postgres service, frontend build. | Green pipeline on every push |
| 1.6 | Run lint and fix blocking errors. | `npm run lint` passes |
| 1.7 | Fix `README.md`. Make `RUN_SEEDSPHERE.md` and `DEPLOY_SUPABASE_VERCEL.md` the single setup source. | One accurate setup path |

### Sprint 2: Client upgrade delivery (2–3 weeks; Mangal Murti)

| # | Task | Done when |
|---|---|---|
| 2.1 | Confirm the client's must-have list: which of M3, M5, M6 and M12 are needed in this release. | Signed-off scope |
| 2.2 | Add a public lot verification endpoint and page (M4). Read-only, rate-limited, returns only non-sensitive fields. | QR scan shows lot status without login |
| 2.3 | Add the recall flow (M18) using the existing `lots/:id/impact` endpoint: select lot → affected allocations → affected farmers → status. | End-to-end recall demo |
| 2.4 | Complete the processing-run model (M6): cleaning, grading, treatment recipe, yield. | Packaging batches link to processing runs |
| 2.5 | Add chain of custody to lab submissions (M5). | Every sample has a custody log |
| 2.6 | Move any WebSocket or timer feature off Vercel, or mark it as unavailable on Vercel. | No silent failures in production |

### Sprint 3: Field app and farmer reach (4–6 weeks)

| # | Task | Done when |
|---|---|---|
| 3.1 | Build the offline inspection form in the mobile app (M12) with photos and GPS. | Works in airplane mode, syncs later |
| 3.2 | Add sync endpoints: batch upload with idempotency keys, conflict policy, server timestamps. | Sync tested with duplicate and conflicting uploads |
| 3.3 | Add an SMS/WhatsApp gateway adapter (M11) for recall and advisory messages. | Test message delivered to a sandbox number |
| 3.4 | Add seed-bag verification from the farmer's phone (M4 + M11). | Farmer verifies a bag by QR |

### Sprint 4: Country packs and integrations (6–8 weeks)

| # | Task | Done when |
|---|---|---|
| 4.1 | Design the country-pack schema: rules, certificate templates, testing standards, label rules, currency and units. | Schema reviewed by one domain expert |
| 4.2 | Move the company-specific compliance template into a country pack (India first). | Compliance register reads rules from the pack |
| 4.3 | Public API v1: API keys, rate limits, versioned routes, webhook subscriptions. | Partner test client connects with a key |
| 4.4 | Government connector spike (SATHI or the relevant portal): document the API, build a stub. | Written feasibility note |

### Sprint 5+: Intelligence and marketplace

- Analytics warehouse and cross-tenant benchmarks (M19).
- Real market and weather feeds to replace manual entry (M13, M14).
- IoT ingestion for cold-chain sensors (M9).
- Marketplace MVP (M16) only after M1–M8 are stable with more than one tenant.

---

## Part C. Module-by-Module Specification

Format for each module:
- **Purpose** and **users** (roles)
- **Current state**: backend endpoints, tables, frontend areas
- **Gaps**
- **Target features** (v1 = next release, v2 = later)
- **Data additions**
- **Acceptance criteria**

Role names below use the current five roles plus the planned additions, marked (planned).

---

### M1. Identity, Tenancy & Admin

**Purpose:** Who can do what, in which organization, with what audit trail.
**Users:** Platform admin, organization admin, all role users.

**Current state**
- Endpoints: `POST /auth/login`, `/register`, `/refresh`, `/logout`, `GET /auth/me`; `GET/POST/PUT/PATCH/DELETE` for `/organizations` and `/users`; `GET /users/roles`, `/users/stats`, `POST /users/:id/reset-password`; `GET /audit-logs`.
- Tables: `users`, `organizations`, `refresh_tokens`, `audit_logs` (partitioned by year), `organizations` master-data columns (046, 049).
- Roles: `Admin, Breeder, Producer, Inspector, Warehouse Manager`.

**Gaps**
- Public `POST /auth/register` should be restricted or invite-only in production. Verify before launch.
- Only 5 roles. The blueprint needs about 10 (regulatory officer, production manager, field inspector, lab technician, quality manager, warehouse manager, procurement officer, dealer, farmer).
- No MFA, no SSO, no password policy beyond hashing.
- Organization hierarchy (parent/child, dealer under distributor) missing.
- Permission model differs between frontend (`ProtectedRoute permission=...`) and backend (`requireRole`).

**Target features**
- v1: Role-permission matrix in DB (`roles`, `permissions`, `role_permissions`). Server enforces permissions; frontend reads the same list. Invite-only user creation. Password reset via email. Session list and forced logout. Organization onboarding with country and currency.
- v2: MFA (TOTP). SSO (OIDC/SAML) for large clients. Organization hierarchy. Delegated admin per country.

**Data additions**
- `roles`, `permissions`, `role_permissions`, `user_roles` (many-to-many), `organizations.parent_id`, `organizations.country_code`, `users.mfa_secret`, `invitations`.

**Acceptance criteria**
- A user without `view_x` cannot read `/x` via API or UI.
- Every login, role change, and permission change writes an audit row.
- A deactivated user's refresh tokens stop working within one request.

---

### M2. Variety & Germplasm Registry

**Purpose:** Master record for every crop variety from breeding through release.
**Users:** Breeder (planned), regulators, variety-protection offices (planned), Admin.

**Current state**
- Endpoints: `crops` (CRUD), `crop-varieties` (CRUD + submit-for-review, approve, reject), `varieties` (CRUD + draft, review, versions, deprecate, submit-for-review).
- Tables: `crops`, `crop_varieties`, `varieties`, `variety_versions`, `variety_committee_reviews`, `performance_ratings` (021).
- Breeding analytics in M14 uses variety IDs.

**Gaps**
- No DUS (distinctness, uniformity, stability) or VCU (value for cultivation and use) trial records.
- No germplasm accession numbers, no parentage on varieties (only on lots).
- No protection certificate (PPV&FR-style) record.
- Two overlapping variety models (`crop_varieties` and `varieties`): decide which is canonical.

**Target features**
- v1: Consolidate into one variety model with versions and committee review. Add trait/characteristic sheet per crop (DUS descriptors). Add accession registry with origin and storage location. Add release status per country.
- v2: Trial management (sites, seasons, replications, observations), DUS comparison report, protection certificate issuance, and a public variety catalogue.

**Data additions**
- `germplasm_accessions`, `variety_parentage`, `trials`, `trial_sites`, `trial_observations`, `characteristic_descriptors`, `variety_releases` (variety, country, status, date), `protection_certificates`.

**Acceptance criteria**
- Each variety has parentage, release status per country, and a versioned history.
- Committee approval is required before a variety can be used in a seed lot.
- Deprecating a variety blocks new lots but keeps old lots traceable.

---

### M3. Seed Production & Certification

**Purpose:** Plan crops, inspect fields, and certify seed generations.
**Users:** Producer, Inspector (field inspector), certification agency (planned), Admin.

**Current state**
- Endpoints: `crop-planning` (farms, plans, reserve, confirm, cancel, seed-quantity, recommendations, advisory, crop history); `field-inspections` (`POST /`, lot performance, breeder performance, environmental adaptation).
- Tables: `farms`, `crop_plans`, `lot_field_inspections`, `inventory_counts`, `seed_lots` (generation stage column, stage-progression trigger in 012 and parentage validation in 002).

**Gaps**
- No certification decision entity (approve / reject / conditional with reason).
- No seed-generation rules per crop (Breeder → Foundation → Certified → Truthful label) as data.
- No isolation-distance checks between plots.
- No field inspection checklist per crop and stage (only a generic record).
- No certification agency role.

**Target features**
- v1: Crop-specific inspection checklists with pass/fail items and photos. Certification decision with reasons, signed by inspector and approved by a supervisor. Generation rules table per crop and country. Isolation-distance rule check when a plot is registered. Plot GPS polygon.
- v2: Satellite/NDVI monitoring for plots. Certification agency login with read/decide permissions. Automatic generation of certificate after decision.

**Data additions**
- `plots` (polygon, crop, season), `inspection_checklists`, `inspection_items`, `inspection_results`, `certification_decisions`, `generation_rules`, `isolation_rules`.

**Acceptance criteria**
- A lot cannot move to "Certified" without an approved certification decision.
- A plot that violates isolation distance is flagged before planting is confirmed.
- Inspection photos carry timestamp and GPS.

---

### M4. Lot Management & Traceability

**Purpose:** Every seed lot from source to farmer, with tamper-evident records.
**Users:** All producers, warehouse, inspectors, dealers; farmers and consumers (verification, planned).

**Current state**
- Endpoints (29 in `seedLots`): CRUD, search, filter options, bulk create/update/delete/import CSV/quick actions, saved searches, allocation history, children, certificates, compliance chain, quality metrics, genealogy, genealogy refresh.
- Allocations (`allocations`): allocate and manage allocations with ownership checks and concurrency control (tested).
- Authenticity: `public-key`, lot certificates, hash chain, verify chain.
- Tables: `seed_lots`, `seed_lot_allocations`, `seed_lot_hash_chain`, `lot_authenticity_certificates`, `signing_keys`, `seed_lot_batch_actions`, materialized view for genealogy.
- Frontend: production, search, master-data areas.

**Gaps**
- Public verification (no login) is missing. The `public-key` endpoint is the only unauthenticated-style item and still sits under the auth-required stack in the router list (verify).
- No GS1 / GTIN / SSCC identifiers.
- No bag-level serial numbers linked to the lot (only packaging units).
- No recall output (see M18).

**Target features**
- v1: Public `GET /verify/:code` (rate-limited, returns status, crop, variety, certification, expiry, and a public key signature). QR code on labels pointing to the verify page. Serial number per bag. GS1 GTIN field on variety/packaging.
- v2: Blockchain-anchored hash chain (optional). Consumer-facing traceability timeline. Cross-tenant lot transfers with receipt confirmation.

**Data additions**
- `lot_serials` (serial, lot_id, packaging_unit_id, status), `verification_scans` (scan_at, country, device hash, no personal data), `gtin` on varieties and packaging.

**Acceptance criteria**
- Anyone with a bag QR can see status without logging in, and no farmer personal data is shown.
- Editing a lot after certification breaks the hash chain and is visible in verification.
- Lot genealogy shows at least 3 generations back.

---

### M5. Seed Testing Laboratory

**Purpose:** Run ISTA-aligned tests and issue certificates of analysis.
**Users:** Lab technician, lab manager (planned), accreditation body (planned), Inspector.

**Current state**
- Endpoints: `lab-testing` (certificates, lab performance, quality flags + resolve, submissions list/detail); `compliance/purity-tests`.
- Tables: `lab_test_submissions`, `lab_test_results`, `lab_quality_flags`, `germination_tests`, `purity_tests`, `viability_tests`, `quality_certificates`.
- Frontend: `lab` area with its own session hook.

**Gaps**
- No ISTA protocol versions or test-method parameters (temperature, days, replications).
- No chain of custody for samples.
- No instrument integration.
- No accreditation scope (which tests this lab is accredited for).
- No tetrazolium (TZ), seed health, moisture, vigour, or GMO screening tests.

**Target features**
- v1: Protocol library with versioned ISTA-style methods. Test types: moisture, purity, germination, TZ viability, seed health, GMO. Sample custody log (received, stored, tested, disposed). Result review by second analyst. Certificate of analysis generated from approved results. Accreditation scope table per lab.
- v2: Instrument import (CSV/API from equipment). Automated result checks against limits. Proficiency testing rounds.

**Data additions**
- `test_protocols` (code, version, parameters), `test_types`, `sample_custody_events`, `lab_accreditations` (lab, test type, valid_until), `instrument_readings`, `result_reviews`.

**Acceptance criteria**
- A certificate cannot be issued for a test type the lab is not accredited for.
- Every sample has a complete custody log from receipt to disposal.
- Changing a result after approval creates a new version, not an overwrite.

---

### M6. Processing, Treatment & Packaging

**Purpose:** Turn harvested seed into graded, treated and labelled packs.
**Users:** Processing operator, packaging team, Admin.

**Current state**
- Endpoints: `packaging` (batches, batch detail, units, unit label).
- Tables: `packaging_batches`, `packaging_units`, `harvest_yields` (013).
- Frontend: `processing` and `production` areas.

**Gaps**
- No processing run (cleaning, grading, treatment, yield per run).
- No seed treatment recipes (chemicals and doses) per crop.
- No net-weight verification.
- No label rules per country.
- Packaging units are not linked to processing runs.

**Target features**
- v1: Processing run with input lot, output grades, weights, and losses. Treatment recipe library (product, dose, safety notes). Net-weight check at packing with tolerance. Label template per country (language, units, mandatory fields). Tag-to-lot linking.
- v2: Equipment integration (scale, labeler). Line-level yield dashboards.

**Data additions**
- `processing_runs`, `processing_outputs`, `treatment_recipes`, `treatment_applications`, `label_templates`, `weight_checks`.

**Acceptance criteria**
- Output weight plus losses equals input weight within a set tolerance, or the run is blocked.
- A label cannot be printed without all mandatory fields for the destination country.
- Treatment products used in a lot appear on its certificate.

---

### M7. Quality Management System

**Purpose:** Control nonconformance, corrective action, complaints, and document quality.
**Users:** Quality manager, auditors, all staff raising issues, Admin.

**Current state** (strongest module)
- Endpoints (50 in `quality`): SOP list/detail, draft updates, pending acknowledgements; NCR list/detail/create/update/cancel; CAPA list/detail/create/start/implement/verify/cancel; complaints list/detail/create/investigate/resolve/close; lot holds create/release; compliance requirements, assessments, evidence, raise NCR, dashboard, CSV report; lot impact.
- Tables: `quality_counters`, `sop_documents`, `sop_versions`, `sop_acknowledgements`, `quality_complaints`, `non_conformances`, `capas`, `quality_lot_holds`, `compliance_requirements`, `compliance_evidence`.

**Gaps**
- Document control: approval workflow for SOP versions and effective dates.
- Internal audit scheduling and findings (linked to NCR/CAPA).
- Management review records.
- Risk register (FMEA-style) linked to CAPA.
- ISO 9001 / 17025 document templates.

**Target features**
- v1: SOP approval chain with effective date and training assignment (links to M17). Audit schedule and findings → NCR. Effectiveness verification metrics on CAPA (defined target and measured value). Quality KPIs (rejection rate, complaint resolution time).
- v2: Management review pack auto-generated. Risk register. Supplier quality scorecards (with M10).

**Data additions**
- `audits`, `audit_findings`, `management_reviews`, `risks`, `capa_effectiveness_metrics`, `sop_approvals`.

**Acceptance criteria**
- A CAPA cannot close without an effectiveness check.
- A lot under hold cannot be allocated or dispatched.
- Every SOP change requires acknowledgement from the affected roles before the effective date.

---

### M8. Compliance & Regulatory

**Purpose:** Meet national and export rules, issue certificates, and prove it to regulators.
**Users:** Regulatory officer (planned), compliance officer, export team, Admin.

**Current state**
- Endpoints: `compliance/certificates/:id`, `compliance/purity-tests`; quality compliance endpoints (requirements, assessments, evidence, dashboard, CSV report, template seeding for one company).
- Tables: `compliance_requirements`, `compliance_evidence`, `phytosanitary_certificates`, `quality_certificates`.

**Gaps**
- No country packs. Compliance requirements come from a company template (`compliance.template.ts`).
- No OECD Seed Scheme or ISTA certificate formats.
- No export document generation.
- No regulator read-only role or portal.
- Deadline and renewal reminders missing.

**Target features**
- v1: Country pack format (JSON/YAML, versioned): requirements, required tests, certificate template, label rules, fees. India pack first. Regulator read-only role with time-limited access. Renewal reminders (email/SMS).
- v2: OECD and ISTA certificate templates. Export document bundle (phytosanitary, quality, origin). Other country packs, starting with the largest seed-export markets.

**Data additions**
- `country_packs`, `country_pack_versions`, `regulators` (org type), `regulator_grants`, `certificate_templates`, `compliance_deadlines`.

**Acceptance criteria**
- Changing a country pack version does not alter certificates already issued.
- A regulator sees only the lots and evidence they were granted, and every view is logged.
- Certificate output matches the approved template byte for byte in a regression test.

---

### M9. Warehouse, Inventory & Cold Chain

**Purpose:** Store, move and monitor seed stock safely.
**Users:** Warehouse manager, warehouse staff, Admin.

**Current state**
- Endpoints (14 in `storage`): locations (list, detail, active batches, condition logs), movement history, costs, expiration status (all, critical), FIFO.
- Monitoring (`monitoring`): API metrics, errors, anomalies, data consistency. (This is system monitoring, not sensor monitoring.)
- Tables: `storage_locations`, `storage_assignments`, `storage_condition_logs`, `inventory_counts`.

**Gaps**
- No IoT sensor ingestion (temperature, humidity).
- No cold-chain alert rules.
- No goods receipt or dispatch documents.
- No bin-level location (warehouse → zone → rack → bin).

**Target features**
- v1: Bin-level locations. Goods receipt and dispatch with quantities and lot checks. FEFO enforced on dispatch. Manual condition logs with alert thresholds. Expiry alerts (uses the existing watcher, moved to a scheduled job).
- v2: Sensor ingestion (MQTT or HTTP webhook from loggers). Real-time alerts. Cold-room capacity planning.

**Data additions**
- `storage_bins`, `goods_receipts`, `goods_receipt_lines`, `dispatches`, `dispatch_lines`, `sensor_devices`, `sensor_readings`, `alert_rules`.

**Acceptance criteria**
- A dispatch of expired stock is blocked.
- A temperature excursion above the threshold creates an alert and an NCR draft.
- Stock counts reconcile with movements (no unexplained difference).

---

### M10. Sales, Distribution & Procurement

**Purpose:** Get seed from producers to dealers and farmers, with orders and money.
**Users:** Procurement officer, distributor, dealer, Producer, Admin.

**Current state**
- Endpoints: `demand-planning` (forecast, purchase orders, status); `seed-requests` (list, detail, distribution lists, my allocations, deliver, fulfill); `partners` (links, orders, catalogue, quality comparison, sync, ratings).
- Tables: `purchase_orders`, `seed_requests`, `partner_links`, `partner_orders`, `partner_performance_ratings`, `partner_inventory_sync_log`.
- Frontend: `procurement` and `partner` areas.

**Gaps**
- No dealer → distributor → retailer hierarchy.
- No invoicing, payments, or credit terms (financing is separate).
- No price lists per region or season.
- No returns or credit notes.
- Partner orders do not reserve stock atomically (check).

**Target features**
- v1: Price lists by region and season. Invoices from delivered orders. Dealer hierarchy and territories. Returns with quality reason, linked to NCR. Stock reservation on order confirmation.
- v2: Payment gateway. Dealer self-service portal. Automated reorder by dealer stock levels.

**Data additions**
- `price_lists`, `price_list_items`, `invoices`, `invoice_lines`, `payments`, `returns`, `territories`, `dealer_relationships`.

**Acceptance criteria**
- Two concurrent orders cannot both reserve the last bag (tested).
- An invoice total equals the sum of delivered lines at the agreed price.
- A return creates an NCR automatically when the reason is quality-related.

---

### M11. Farmer Platform

**Purpose:** Connect farmers to the right seed, advice, and verification.
**Users:** Farmer, FPO / cooperative (planned), extension worker (planned), Admin.

**Current state**
- Endpoints: `farmers` (CRUD); `farmer-education` (cultivation guides, disease guides, success stories, video tutorials, Q&A, advisory bundle); `privacy/farmers/:id/export` and `anonymize`; `push-notifications` register/unregister.
- Tables: `farmers`, `cultivation_guides`, `disease_guides`, `success_stories`, `video_tutorials`, `qa_questions`, `qa_answers`, `device_push_tokens`.

**Gaps**
- No SMS or WhatsApp gateway.
- No farmer groups or FPO membership.
- No farmer purchase history view (links to seed requests exist but are not surfaced).
- No national ID handling per country (must be consent-based and minimal).
- No voice or regional-language UI beyond the existing app.

**Target features**
- v1: Farmer groups (FPO). Purchase history. SMS notifications (advisories, recall, order status) through a gateway adapter. Seed-bag verification by QR from the farmer's phone (see M4). Complaint submission by SMS keyword.
- v2: Voice advisories and IVR. WhatsApp bot. Credit eligibility (M15). Extension worker dashboard for their farmers.

**Data additions**
- `farmer_groups`, `farmer_group_members`, `notification_messages` (channel, status, template), `consents` (farmer, purpose, granted_at, revoked_at), `farmer_identifiers` (country-specific, encrypted).

**Acceptance criteria**
- Anonymized farmers cannot be re-identified through remaining records (tested).
- Every SMS is logged with delivery status.
- Farmer data export returns everything held about them within one request.

---

### M12. Field Operations Mobile App

**Purpose:** Field inspectors and lab / warehouse staff work offline and sync later.
**Users:** Field inspector, lab technician, warehouse staff.

**Current state**
- Mobile: Expo 57 app with login screen, offline store (`src/db/offlineStore.ts`), sync service (46 lines, skeleton), push notifications setup, location and image picker dependencies.
- Server: `device_push_tokens` table and push-notifications endpoints. Field inspection POST exists but no batch sync endpoint.

**Gaps**
- No inspection form, no photo capture flow, no GPS plot capture.
- No sync protocol (idempotency, conflict handling, retry).
- No barcode / QR scanning for lot or bag.
- No role-based navigation.

**Target features**
- v1: Inspection workflow (checklist, photos with GPS and timestamp, signature). Offline queue with retry. QR scan for lot lookup. Background sync on connectivity.
- v2: Lab sample entry and warehouse receipt on mobile. Field map with plot polygons. Voice notes.

**Data additions**
- `sync_batches` (client_id, device_id, received_at, status), `sync_items` (client_uuid unique, entity, payload hash). Client-generated UUIDs on every record.

**Acceptance criteria**
- Inspection completed in airplane mode syncs exactly once after reconnect, even if the upload is repeated.
- Conflicting edits from two devices produce a visible conflict, not silent overwrite.
- App works on a low-end Android device with 2G-level throughput (tested).

---

### M13. Market Intelligence & Demand Planning

**Purpose:** Forecast demand and prices so producers grow the right seed.
**Users:** Business leader, planner, breeder (release decisions), Admin.

**Current state**
- Endpoints: `market-intelligence` (prices GET/POST, demand forecasts list/latest/detail, ministry forecasts, weather outlooks, insurance records, breeding priority); `demand-planning/forecast`.
- Tables: `market_price_observations`, `ministry_demand_forecasts`, `weather_outlooks`, `crop_insurance_records`, `variety_demand_forecasts`.

**Gaps**
- Prices and weather are entered manually (no external feed).
- No forecast accuracy tracking.
- No regional drill-down with a source reference per number.

**Target features**
- v1: Import from one public price source and one weather source (per country). Forecast accuracy tracking (forecast vs actual). Each forecast number shows its source and date.
- v2: Competitor variety tracking. Supply-gap map by district. Planting recommendation per season.

**Data additions**
- `data_sources` (name, url, licence, refresh), `forecast_actuals`, `forecast_accuracy`.

**Acceptance criteria**
- Every published forecast number has a source and timestamp.
- Forecast accuracy is reported for each crop and region after each season.

---

### M14. Breeding & Climate Analytics

**Purpose:** Pick the right variety for the right environment and predict hybrid performance.
**Users:** Breeder, agronomist, researcher.

**Current state**
- Endpoints (14 in `breedingAnalytics`): cycle timelines, germplasm rankings, hybrid predictions, lineage summary, program ROI, trait measurements by lot, trait inheritance, traits POST.
- `climateSmartSelection` (8 endpoints): adaptation outcomes, alerts (+ acknowledge), farm rotation suggestions, predictions, recommendations.
- Tables: `lot_trait_measurements`, `hybrid_cross_predictions`, `climate_predictions`, `climate_risk_alerts`, `adaptation_outcomes`.

**Gaps**
- No trial design (replications, sites).
- No GxE (genotype × environment) analysis.
- No weather or soil feed connected to climate predictions.
- Predictions are not validated against outcomes.

**Target features**
- v1: Trial layer shared with M2. GxE stability output (for example AMMI-style summary). Climate feed per region. Predictions stored with model version and compared to actuals.
- v2: Genomic-selection hooks (marker data import). Climate scenario comparison (planting window shifts).

**Data additions**
- `environments` (site, season, weather summary), `trait_observations` (linked to trial), `model_versions`, `prediction_outcomes`.

**Acceptance criteria**
- Each prediction stores the model version and inputs, and is reproducible.
- Climate alerts are acknowledged with a reason, and the reason is stored.

---

### M15. Finance, Insurance & Subsidies

**Purpose:** Finance seed businesses and farmers against stored lots, and track government subsidies.
**Users:** Finance officer, lender (planned), insurer (planned), government program officer, Producer, Admin.

**Current state**
- Endpoints: `financing` (accounts, approve, reject, disburse, repay, default, trigger repayment, accrued interest, financing costs per lot, insurance context); `government-programs` (programs, activate/deactivate, claims, pay, reports, lot registrations).
- Tables: `financing_accounts`, `lot_government_registrations`, `subsidy_programs`, `subsidy_claims`, `government_reports`, `crop_insurance_records` (shared with M13).

**Gaps**
- No lender or insurer role or portal.
- No bank or payment integration.
- Insurance is context only, not linked to claims.
- Collateral valuation for lots is not explicit.

**Target features**
- v1: Lot-backed collateral valuation (certified lots at a set haircut). Lender role with read access to their applicants. Subsidy eligibility rules per program. Claim status and payment reconciliation.
- v2: Payment gateway. Crop insurance claims linked to field inspection and weather data. Credit scoring for producers.

**Data additions**
- `collateral_valuations`, `lenders`, `insurers`, `insurance_policies`, `insurance_claims`, `subsidy_eligibility_rules`, `payment_transactions`.

**Acceptance criteria**
- A lot under a quality hold cannot be used as collateral.
- Every disbursement and repayment reconciles to a payment record.
- Subsidy claims cannot be paid twice (idempotency tested).

---

### M16. Marketplace (new)

**Purpose:** Verified B2B and B2C seed listings with certificates attached.
**Users:** Seed companies, small producers, buyers, dealers.

**Current state:** Not built. Partner orders (M10) are the closest existing feature.

**Gaps:** Everything: listings, RFQs, verification of sellers, ratings, dispute handling.

**Target features**
- v1 (only after M1–M8 are stable with more than one tenant): Seller verification (KYC, certificate check). Listings linked to certified lots. RFQ and quote flow. Ratings only from completed orders.
- v2: Escrow or payment partner. Dispute workflow. Search by variety trait.

**Data additions**
- `listings`, `listing_lots`, `rfqs`, `quotes`, `ratings`, `disputes`, `seller_verifications`.

**Acceptance criteria**
- A listing cannot show a lot that is not certified or is on hold.
- Ratings can only be left after an order is completed.

---

### M17. Training & Competency

**Purpose:** Make sure staff and farmers are trained for the SOPs and skills they need.
**Users:** Quality manager, supervisor, inspector, lab technician, farmer (via education), Admin.

**Current state:** Farmer education only (guides, videos, Q&A). No staff training.

**Gaps:** Staff courses, competency matrix by role, training records, certificates, SOP-linked training.

**Target features**
- v1: Course catalogue linked to SOPs. Competency matrix per role. Assignments created automatically when an SOP changes. Certificate issued on passing. Refresher reminders.
- v2: Assessments with question banks. External training provider integration.

**Data additions**
- `courses`, `course_sop_links`, `competencies`, `role_competency_requirements`, `user_competencies`, `training_assignments`, `assessments`, `assessment_attempts`.

**Acceptance criteria**
- A user cannot perform an SOP-controlled task without a current competency for it (enforced in M3, M5, M6).
- An SOP version change creates training assignments for affected roles.

---

### M18. Recall & Complaint Response

**Purpose:** Find every affected bag, farmer and buyer within hours, and show regulators proof.
**Users:** Quality manager, regulator (planned), dealer, Admin.

**Current state**
- Complaints: create, investigate, resolve, close (M7).
- Lot holds: create and release (M7).
- Lot impact: `GET /quality/lots/:lotId/impact`.
- Traceability: genealogy and children endpoints (M4), compliance chain.

**Gaps**
- No recall event entity.
- No notification to affected farmers or dealers.
- No regulator report.
- No recall effectiveness check (how many bags recovered).

**Target features**
- v1: Recall event (scope: lot, batch, or variety; reason; severity). Auto-computed affected list: lots → allocations → dealers → farmers → serials. Notification via SMS and email (M11). Recovery tracking per serial. Regulator report (PDF/CSV).
- v2: Mock recall drill mode. Automated recall timing report.

**Data additions**
- `recall_events`, `recall_affected_items`, `recall_notifications`, `recall_recoveries`.

**Acceptance criteria**
- A recall for one lot lists every farmer and dealer who received it, with no manual step.
- The recall report can be generated within 2 hours for a lot with 10,000 serials (performance test).

---

### M19. Analytics, Dashboards & Benchmarks

**Purpose:** Show KPIs to executives and, later, anonymized benchmarks across tenants.
**Users:** Executive, manager, regulator (planned), Admin.

**Current state**
- Endpoints: `analytics/dashboard`; `performance-ratings`, variety effectiveness; `monitoring` (API performance, errors, user activity, anomalies); `data-governance` (reconciliation, orphan lots, violations, corrections).
- Tables: `api_request_metrics` and `error_logs` (partitioned), `performance_ratings`.
- Frontend: `dashboard` and `admin` areas.

**Gaps**
- No analytics warehouse.
- No cross-tenant benchmarks (needs a consent model).
- No scheduled reports.
- No export to BI tools.

**Target features**
- v1: KPI set defined once (rejection rate, germination pass rate, complaint resolution days, on-time delivery). Scheduled PDF/CSV email reports. Read replica or nightly warehouse snapshot.
- v2: Anonymized benchmarks with a minimum group size (k-anonymity rule). BI export (Power BI / Metabase). Tenant-level and country-level views.

**Data additions**
- `kpi_definitions`, `kpi_snapshots` (tenant, period, value), `report_schedules`, `benchmark_consents`.

**Acceptance criteria**
- A benchmark is never shown for a group smaller than the agreed minimum size.
- KPI values in the dashboard match the snapshot table for the same period.

---

### M20. Integrations & Public API

**Purpose:** Let partners, ERPs, labs and governments connect to SeedSphere safely.
**Users:** Integration engineer, partner systems, government portals (planned).

**Current state**
- Internal API only. `partners` (links, sync, orders, catalogue); `reconciliation` (`POST /master-data/reconcile`); `custom-fields`.
- No public API keys, webhooks, or third-party OAuth.

**Gaps**
- Public API keys and scopes.
- Webhooks with signatures and retries.
- Import/export bulk endpoints for ERP (Tally, SAP).
- Government connector (SATHI or other).
- API versioning policy and developer docs.

**Target features**
- v1: API keys with scopes and rate limits. Webhooks (lot certified, order shipped, test result issued) with HMAC signatures and retry queue. OpenAPI spec published. CSV bulk import and export for lots and orders.
- v2: OAuth client credentials. ERP connectors (Tally first, then SAP). Government connector after feasibility study (Sprint 4.4).

**Data additions**
- `api_clients`, `api_keys` (hashed, scoped), `webhook_subscriptions`, `webhook_deliveries`, `integration_logs`.

**Acceptance criteria**
- A revoked API key stops working within 1 minute.
- Webhook deliveries are retried with backoff and visible in the log.
- OpenAPI spec matches the live routes (contract test).

---

### X1. AI Layer (cross-cutting)

**Purpose:** Advise and explain, never silently decide. Scores are auditable code; AI writes narratives, analyses photos, and answers questions.

**Current state**
- AI Center endpoints (`/ai/*`): status, knowledge search and reindex, lab risk, forecasts, insights (all and per module), photo analysis.
- Assistant (`/assistant/*`): status and ask (intent detection, context service, database queries, provider calls).
- Knowledge base: `ai_knowledge_docs` (articles plus SOPs, compliance, NCRs, CAPAs, complaints), Postgres full-text search.
- Providers: Anthropic (default model in code is `claude-sonnet-4-20250514`), OpenAI, Gemini, OpenAI-compatible. Rules engine fallback.

**Gaps**
- Assistant answers depend on intent detection; no evaluation set to measure accuracy.
- No guardrails for tenant data in prompts (must check that context queries are tenant-scoped; see A5 item 5).
- No model usage or cost tracking per tenant.
- Photo analysis has no human-review step recorded.

**Target features**
- v1: Evaluation set (50–100 real questions with expected answers) run on every release. Tenant-scoped retrieval tests. Usage and cost log per tenant. Photo analysis result stored with reviewer decision.
- v2: Anomaly detection on lab and warehouse data. Document extraction (certificates, invoices). Fine-tuned or retrieval-augmented domain models per crop.

**Data additions**
- `ai_usage_log` (tenant, model, tokens, cost, purpose), `ai_evaluations` (question, expected, actual, score, release), `photo_reviews` (analysis_id, reviewer, decision).

**Acceptance criteria**
- No AI answer contains another tenant's data (tested with cross-tenant prompts).
- Every AI-generated narrative shows its data source and timestamp.
- Assistant accuracy on the evaluation set does not drop between releases.

---

## Part D. Cross-Cutting Engineering Standards

| Area | Standard |
|---|---|
| Tenancy | Every table has `organization_id` (or `tenant_id`). Enforce with Postgres row-level security (RLS) as well as in code. |
| Permissions | One permission list in the database, read by server and frontend. |
| Audit | Every create, update, delete and status change writes an audit row with actor, time, before/after. |
| IDs | UUIDs everywhere, client-generated for offline records. |
| Migrations | One migration per change, never edit applied migrations, forward-only. |
| API | Versioned (`/api/v1`), consistent error envelope, pagination on every list, OpenAPI generated from code. |
| Background jobs | Move timers (expiry watcher, reminders, forecasts) to a scheduled job runner, not a web process. |
| Files | Photos, certificates and PDFs in object storage with signed URLs. Not in the database. |
| Observability | Structured logs, request IDs, error tracking, uptime alerts. |
| Security | Secrets only in environment managers. Dependency audit in CI. Penetration test before the first external tenant. |
| Privacy | Consent records for farmers. Data retention per entity type (existing `data_retention_policies`). Export and erase workflow. |
| Testing | Unit (service logic), integration (DB + API, including cross-tenant tests), E2E (critical flows: lot → allocation → certificate → verify). |
| Localization | UI strings in resource files, units and dates from country pack, SMS templates per language. |

---

## Part E. Decisions Needed From You

1. **Client scope for the upgrade (Sprint 2):** Which of M3, M5, M6 and M12 must ship now?
2. **Role model:** Keep the five roles and add the rest later, or implement the full 10-role matrix now?
3. **Tenancy model:** One shared database with row-level security (recommended for Supabase), or one database per client?
4. **Demo data in production:** Confirm it should be removed from the production build.
5. **Repo cleanup:** OK to move the root archives out of the repo and rotate any secrets found in `.env.local` and `server/.env.test`?
6. **Mobile first or web first:** Should the offline field app be built before the farmer SMS features?
