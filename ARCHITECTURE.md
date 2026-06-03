# PROS Sanitation Portal — Data Architecture

Neon (PostgreSQL via Prisma) is the **single source of truth** for operational data. Browser `localStorage` must not drive approvals, inventory, jobs, bin service, or HR workflows.

## Stack

| Layer | Technology |
|-------|------------|
| Database | Neon PostgreSQL |
| ORM | Prisma (`prisma/schema.prisma`) |
| Auth | Better Auth (`User`, `Session`, `Account`) — unchanged by data migrations |
| App | Next.js App Router + API routes |

## Module → Prisma models

| Module | Models | Service / API |
|--------|--------|----------------|
| **Inventory** | `InventoryItem`, `StockEditHistory` | `inventory-service.ts`, `/api/inventory/*` |
| **Equipment requests** | `EquipmentRequest` | `inventory-service.ts`, `/api/inventory/requests/*` |
| **Purchasing list** | `InventoryItem` (purchasing flags) | `inventory-service.ts`, `/api/inventory/purchasing-list`, `/api/inventory/[id]/purchasing` |
| **Vacation requests** | `VacationRequest` | `/api/hr/vacation-requests` |
| **Job letter requests** | `JobLetterRequest` | `job-letter-request-service.ts`, `/api/hr/job-letter-requests` |
| **Payslip requests** | `PayslipRequest` | `payslip-request-service.ts`, `/api/hr/payslip-requests` |
| **Payslip archive** | `Payslip` (`employee_payslips`) | `payslip-archive-service.ts`, `/api/hr/payslip-archive`, `/api/admin/payslip-archive` |
| **My Profile** | `Employee` (+ optional `User.image` via profile URL field) | `employee-profile-service.ts`, `GET/PATCH /api/employees/me` |
| **Policies** | `Policy`, `PolicyAcknowledgement` | `policy-service.ts`, `/api/policies`, `/api/admin/policies` |
| **Staff dashboard metrics** | Aggregates from jobs, HR, bin, policies, payslips | `dashboard-summary-service.ts`, `GET /api/dashboard/summary` |
| **Job management (locations)** | `ClientLocation` | `job-management-service.ts`, `/api/job-management/locations` |
| **Job assignments** | `JobAssignment` | `job-assignment-service.ts`, `/api/job-management/assignments` |
| **Cleaning jobs** | `Job`, `JobServiceLog` | `cleaning-jobs-service.ts`, `/api/jobs/*` |
| **Bin field workflow** | `BinClient`, `BinServiceSite`, `BinServiceSetup`, `BinServiceJob`, `BinServiceLog` | `bin-service/service.ts`, `field-service.ts`, `/api/bin-service/*` |
| **Admin approvals inbox** | Aggregates pending rows above | `approval-inbox-service.ts`, `/api/admin/approval-inbox` |
| **Admin hub counts** | Same aggregates + bin attention | `admin-hub-summary-service.ts`, `/api/admin/hub-summary` |
| **Employees & access** | `Employee`, `AccessHistory` | Employee admin APIs |

## Retired legacy paths

These are **removed** and must not be reintroduced for live UI:

| Artifact | Former role |
|----------|-------------|
| `admin-client-storage.ts` | Admin stock overrides (`pros-admin-stock-overrides`) |
| `admin-mock-data.ts` | Hub/approval mock counts |
| `bin-locations-storage.ts`, `bin-locations-seed.json` | Bin location local state (`pros-bin-locations-state`) |
| `jobs-mock-data.ts` | Cleaning location list |
| `employee-job-assignments.ts` | Static assignment map |
| `equipment-client-storage.ts` | Equipment requests (`pros-equipment-requests:`) |
| `platform-hr-storage.ts` | HR admin mirror (`pros-platform-hr-admin:`) |
| `platform-storage.ts` | Facade over local HR/edit history |
| `EditHistoryModal` + `pros-platform-edit-history:` | Stock/purchasing edit history in localStorage |

Purchasing and stock **edit history** now uses `StockEditHistory` via `GET /api/inventory/[id]/history` (`StockEditHistoryModal`).

## Seed-only / non-operational files

| File | Purpose |
|------|---------|
| `prisma/seed.ts` and `prisma/seed-*.ts` | Database seeding only |
| `src/lib/hr-mock-data.ts` | Static HR hub navigation and date/status display helpers |
| `src/lib/equipment-supplies-mock-data.ts` | Shared TypeScript types and display helpers (no live lists) |

## `localStorage`

No operational platform records are stored in `localStorage`. Auth session cookies use the `pros-portal` prefix via Better Auth.

## Adding new features

1. Add or extend a Prisma model and migration.
2. Implement service functions in `src/lib/*-service.ts`.
3. Expose `/api/...` routes with existing auth/session checks.
4. Client components fetch APIs; do not add new operational `localStorage` keys.
