# SeedSphere Backend — Seed Lot Management API

REST API + PostgreSQL layer for seed lot CRUD, transactional quantity
allocation, parent-child seed lot validation, audit logging, and JWT-based
auth with organization-scoped RBAC. Lives alongside the existing Vite
frontend as an independent Node service; the frontend's `VITE_API_BASE_URL`
(`http://localhost:5000/api/v1`) already points at it. The frontend's own
login is unrelated and untouched (see "Relationship to the frontend's mocked
auth" below) — this is currently a backend-only capability.

## Stack

- Express + TypeScript, run directly with `tsx` (no separate build step)
- `pg` (node-postgres) — no ORM, so every query and transaction boundary is explicit
- PostgreSQL 16 via Docker Compose for local development
- Plain-SQL migrations with a tiny custom runner (no migration framework)
- `jsonwebtoken` (access tokens) + `bcryptjs` (password hashing) + opaque, DB-persisted refresh tokens

## Setup

```bash
cd server
npm install
cp .env.example .env

# start Postgres
docker compose up -d

# apply schema
npm run migrate

# optional: a few demo seed lots (parent/child pair + a standalone lot)
npm run seed

# demo organizations + one user per role (Admin/Breeder/Producer/Inspector/Warehouse Manager)
npm run seed:auth

# run the API on http://localhost:5000
npm run dev
```

## Data model

- **organizations** — `name`, `type` (`breeder` / `producer` / `laboratory` /
  `certification_agency` / `warehouse` / `dealer`).
- **users** — `email`, `password_hash` (bcrypt), `role` (`Admin` / `Breeder` /
  `Producer` / `Inspector` / `Warehouse Manager`), `organization_id`
  (required for Breeder/Producer/Warehouse Manager; nullable for the two
  platform-level roles, Admin and Inspector).
- **refresh_tokens** — the persisted session store. Opaque random tokens;
  only a SHA-256 hash is stored, with `expires_at`, `revoked_at`, and
  `replaced_by_id` for rotation tracking.
- **seed_lots** — `lot_code`, `crop`, `variety`, `parent_lot_id` (self-FK),
  `quantity_total`, `quantity_allocated`, `unit`, `status`, `organization_id`
  (owning org — nullable only for rows created before this feature existed).
  - `chk_seed_lots_allocated_within_total`: `quantity_allocated <= quantity_total`
  - `chk_seed_lots_not_self_parent`: a lot can't be its own parent
  - `trg_validate_seed_lot_parentage` (BEFORE INSERT/UPDATE trigger):
    parent must exist, child's `crop` must match the parent's `crop`, and
    the ancestor chain is walked to reject circular parentage — enforced in
    the database itself, not just in application code.
- **seed_lot_allocations** — one row per allocation of a lot's quantity to
  a farm/order/etc., with `status` (`allocated` / `released` / `cancelled`).
- **audit_logs** — `entity_type`, `entity_id`, `action`, `performed_by`,
  `before_state` / `after_state` (JSONB), written inside the same
  transaction as the change it describes.

## Authentication & RBAC

- **Access token**: a signed JWT (`JWT_ACCESS_SECRET`, 15 min default),
  returned in the JSON body from `/auth/login` and `/auth/refresh`. Sent by
  the client as `Authorization: Bearer <token>`. Stateless — `requireAuth`
  verifies the signature/expiry and never hits the DB.
- **Refresh token**: an opaque random string set as an `httpOnly`,
  `SameSite=Lax` cookie scoped to `/api/v1/auth` (never readable by JS —
  this is the actual persisted session). `/auth/refresh` rotates it on every
  use: the old row is marked `revoked_at` + `replaced_by_id`, a new one is
  issued. Replaying an already-rotated token is rejected.
- **Roles**: `Admin`, `Breeder`, `Producer`, `Inspector`, `Warehouse Manager`
  — see `src/auth/roles.ts`. This is a separate, seed-value-chain-shaped role
  set from the frontend's existing 14 job-title demo roles; the two are not
  connected.
- **Ownership enforcement** (`src/auth/ownership.ts`): every seed lot has an
  owning `organization_id`. Breeder/Producer can only create/update/delete
  lots for their own organization — the `organizationId` field in a
  create-lot request body is ignored for anyone except Admin, who must
  specify one explicitly. Warehouse Manager and Admin can allocate/release
  across any organization's lots (distribution isn't org-scoped); Breeder/
  Producer may only allocate from their own lots.
- **Route-level role gates**: seed lot create/update/delete → Admin, Breeder,
  Producer. Allocate/release → those three plus Warehouse Manager. Reads →
  all five roles. Audit log reads → Admin, Inspector only. `/auth/register`
  → Admin only (bootstrapping the first Admin is `npm run seed:auth`, since
  an Admin-only endpoint can't create the first Admin).

### Relationship to the frontend's mocked auth

The existing Vite frontend has its own, unrelated mocked login with 14
job-title roles (`purchase_executive`, `warehouse_manager`, `rd_executive`,
etc.) gating the already-built Procurement/Warehouse/R&D/Processing pages —
that system is untouched. This JWT/RBAC layer is new backend infrastructure
for the seed lot management API specifically; nothing in the frontend calls
it yet.

## Transactional allocation

`POST /api/v1/production/seed-lots/:id/allocate` runs entirely inside one
`BEGIN…COMMIT` (see `src/db/transaction.ts`):

1. `SELECT … FOR UPDATE` locks the seed lot row.
2. The available quantity (`quantity_total - quantity_allocated`) is checked
   against the request; insufficient quantity throws before any write.
3. The allocation row is inserted, the lot's `quantity_allocated` is bumped,
   and two audit log rows are written (one for the allocation, one for the
   lot's quantity change) — all on the same client/transaction.
4. Any failure at any step (including the DB's own CHECK constraint, which
   acts as a second line of defense against races) rolls back everything,
   including the already-inserted allocation row.

`npm run verify:rollback` proves this independent of the app-level guard —
it deliberately inserts an oversized allocation and lets the DB constraint
reject it, then confirms zero rows survive.

`POST /api/v1/production/allocations/:id/release` reverses an allocation
the same way (transaction + audit log).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | — | Sets refresh cookie, returns `{ user, accessToken }` |
| POST | `/api/v1/auth/refresh` | refresh cookie | Rotates the session, returns a new access token |
| POST | `/api/v1/auth/logout` | refresh cookie | Revokes the session, clears the cookie |
| GET | `/api/v1/auth/me` | any role | Current user profile |
| POST | `/api/v1/auth/register` | Admin | Create a user (email, password, name, role, organizationId) |
| GET | `/api/v1/organizations` | any role | List organizations |
| POST | `/api/v1/organizations` | Admin | Create an organization |
| GET | `/api/v1/production/seed-lots` | any role | List (filter by `crop`, `status`, `parentLotId`) |
| GET | `/api/v1/production/seed-lots/:id` | any role | Get one |
| POST | `/api/v1/production/seed-lots` | Admin/Breeder/Producer | Create (owning org auto-resolved) |
| PUT | `/api/v1/production/seed-lots/:id` | Admin/Breeder/Producer + ownership | Update |
| DELETE | `/api/v1/production/seed-lots/:id` | Admin/Breeder/Producer + ownership | Delete (blocked if it has children or any allocation history) |
| GET | `/api/v1/production/seed-lots/:id/children` | any role | List direct child lots |
| GET | `/api/v1/production/seed-lots/:id/allocations` | any role | List allocations for a lot |
| POST | `/api/v1/production/seed-lots/:id/allocate` | Admin/Breeder/Producer/Warehouse Manager | Allocate quantity (transactional) |
| POST | `/api/v1/production/allocations/:id/release` | Admin/Breeder/Producer/Warehouse Manager | Release an allocation (transactional) |
| GET | `/api/v1/audit-logs` | Admin/Inspector | Filter by `entityType`, `entityId` |

All responses use the shape the frontend's `api.ts` already expects:
`{ success, data, message? }`.

## Example

```bash
# login — -c/-b share a cookie jar so the refresh cookie persists across calls
curl -c jar.txt -X POST localhost:5000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"producer@seedsphere.com","password":"Producer123!"}'
# => { data: { user, accessToken } }

TOKEN="<accessToken from above>"

curl -X POST localhost:5000/api/v1/production/seed-lots \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"lotCode":"SL-2026-010","crop":"Paddy","variety":"Paddy-1010","quantityTotal":2000}'

curl -X POST localhost:5000/api/v1/production/seed-lots/<id>/allocate \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"allocatedTo":"farm-1","quantity":500}'

# refresh when the access token expires (uses the cookie, not a body)
curl -b jar.txt -c jar.txt -X POST localhost:5000/api/v1/auth/refresh

curl -b jar.txt -X POST localhost:5000/api/v1/auth/logout
```

### Demo accounts (`npm run seed:auth`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@seedsphere.com | Admin123! |
| Breeder | breeder@seedsphere.com | Breeder123! |
| Producer | producer@seedsphere.com | Producer123! |
| Inspector | inspector@seedsphere.com | Inspector123! |
| Warehouse Manager | warehouse@seedsphere.com | Warehouse123! |
