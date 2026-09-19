# Implementation Plan: Student Reward System Backend

**Branch**: `001-student-reward-backend` | **Date**: 2026-09-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-student-reward-backend/spec.md` and requirements documentation in `docs/requirements/`.

---

## Summary

Build the complete, production-ready backend for the Student Reward System based on the authoritative requirements package in `docs/requirements/` and behavioral specification in `spec.md`. The backend provides role-based access control (Admin, Teacher, Student) authenticated via 10-digit national IDs, academic structure and class-subject assignment management, atomic point economy workflows (system point pool, teacher budgets, student balances), reward catalog management and redemption lifecycle (inventory-backed vs approval-required), challenge/mission verification with abuse-prevention ban mechanics, student voluntary task proposals with in-request messaging, standard competition ranking (1224) with privacy-safe top boards, dynamic 5-tier classification, daily balance history snapshots, and an immutable audit logging engine with role-filtered on-demand reporting and multi-format exports (CSV, Excel, PDF).

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 24 LTS  
**Primary Dependencies**:
- **Web Framework**: Fastify v4.x / v5.x (high performance, native JSON Schema validation, built-in Pino structured logging, lifecycle hooks)
- **Validation**: TypeBox / JSON Schema
- **Documentation**: `@fastify/swagger` and `@fastify/swagger-ui` (OpenAPI 3.0 generation)
- **Security & Auth**: `@fastify/jwt`, `argon2` / `@node-rs/argon2` (OWASP-recommended Argon2id password hashing)
- **File Uploads**: `@fastify/multipart` (streaming file/image verification attachments)
- **Export Engines**: `csv-stringify` (streaming CSV), `exceljs` (styled Excel workbooks), `pdfkit` (tabular PDF reports)

**Storage**:
- **ORM**: Prisma ORM
- **Database Engine**: SQLite (WAL mode) for local development and automated integration testing; fully compatible with PostgreSQL via connection string configuration for production

**Testing**:
- **Test Runner & Framework**: Vitest (fast, native ESM and TypeScript support)
- **Integration HTTP Client**: Supertest / Fastify `inject()`
- **Coverage Tool**: Vitest `@vitest/coverage-v8`

**Target Platform**: Cross-platform (Linux / Windows / macOS server or container runtime)  
**Project Type**: Standalone REST API Web Service  
**Performance Goals**:
- P95 latency < 50ms for point-balance reads and ranking queries
- Atomic point transaction throughput > 500 req/s with zero deadlock or double-spend
- Complete structured request lifecycle logging in < 1ms overhead per request

**Constraints**:
- Zero negative point balances permitted for teachers or students
- Strictly immutable append-only audit trail (no UPDATE or DELETE endpoints)
- Complete isolation: Students cannot access other students' proposals or non-top rankings; teachers cannot access task proposals or students outside their assigned classes
- Passwords, credentials, and secrets strictly redacted from logs and API error responses

**Scale/Scope**:
- Complete backend implementation covering all 9 User Stories, 95 Functional Requirements, and 72 Business Rules
- 17 Domain Entities, 40+ REST API endpoints, 3 Export formats, and 3 Role Permission matrices

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement / Invariant | Status | Evidence / Implementation Mechanism |
|-----------|------------------------|--------|-------------------------------------|
| **I. Requirements & Specification First** | Every change traces back to requirements; no silent behavior shifts. | **PASS** | Design explicitly maps 1-to-1 with FR-001..FR-095, BR-001..BR-072, and US-1..US-9. |
| **II. Backend-First Delivery** | Backend independently runnable and testable without frontend dependencies. | **PASS** | Standalone Fastify service with runnable integration tests via Fastify `inject()` / Supertest and standalone seed data. |
| **III. Modular Architecture & Separation of Concerns** | Clear separation between routes, business logic, persistence, and core infra. | **PASS** | Clean 4-layer architecture: `api/` (routes/schemas/guards), `services/` (transactions & state machines), `repositories/` (Prisma ORM), `core/` (errors, logging, config). |
| **IV. API & Data Contract Discipline** | Public API explicitly specified; predictable error and status semantics. | **PASS** | Full OpenAPI 3.0 contract specified in `contracts/openapi.yaml`; strictly typed request/response schemas and standardized error responses. |
| **V. Security & Input Validation** | All input untrusted; backend-enforced RBAC; zero sensitive data in logs/errors. | **PASS** | Strict TypeBox schemas on all endpoints, Argon2id password hashing, JWT role guards, and Pino credential redactors. |
| **VI. Testability & Verification** | Business-critical behavior covered by automated tests. | **PASS** | Test suite covers atomic transactions, concurrency, standard competition ranking, tier transitions, ban triggers, and export generation. |
| **VII. Error Handling & Observability** | Errors propagate with causes; structured completion logs (INFO/ERROR); correlation IDs. | **PASS** | Fastify lifecycle hooks (`onRequest`, `onResponse`, `onError`) with Pino; `X-Correlation-ID` propagated throughout; custom `ApplicationError` hierarchy with cause chaining. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-student-reward-backend/
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 research & technical decisions
├── data-model.md        # Phase 1 domain entities, schema & state machines
├── quickstart.md        # Phase 1 runnable validation scenarios & guide
├── contracts/           # Phase 1 API specifications
│   └── openapi.yaml     # OpenAPI 3.0 REST API contract
└── tasks.md             # Phase 2 implementation task list (created by /speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma              # Database schema & relations (17 entities)
│   ├── migrations/                # Database migration history
│   └── seed.ts                    # Initial administrator & baseline test seed
├── src/
│   ├── app.ts                     # Fastify application builder & plugin registration
│   ├── server.ts                  # Server entrypoint & graceful shutdown
│   ├── core/                      # Infrastructure & cross-cutting concerns
│   │   ├── config.ts              # Environment configuration & validation
│   │   ├── errors.ts              # Custom ApplicationError hierarchy & causes
│   │   ├── logger.ts              # Pino structured logger with secret redaction
│   │   └── correlation.ts         # Correlation ID middleware & lifecycle hooks
│   ├── middleware/                # Route guards & common interceptors
│   │   ├── authenticate.ts        # JWT token verification & user context injection
│   │   └── authorize.ts           # Role-based guards (Admin, Teacher, Student)
│   ├── modules/                   # Domain feature modules (routes, schemas, services)
│   │   ├── auth/                  # Authentication & provisioning (FR-001..006)
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.schemas.ts
│   │   │   └── auth.service.ts
│   │   ├── academic/              # Classes, subjects, teacher assignments (FR-007..014)
│   │   │   ├── academic.routes.ts
│   │   │   ├── academic.schemas.ts
│   │   │   └── academic.service.ts
│   │   ├── points/                # System pool, teacher budgets, student balance, tasks (FR-015..023)
│   │   │   ├── points.routes.ts
│   │   │   ├── points.schemas.ts
│   │   │   └── points.service.ts
│   │   ├── rewards/               # Reward catalog & redemption lifecycle (FR-024..034)
│   │   │   ├── rewards.routes.ts
│   │   │   ├── rewards.schemas.ts
│   │   │   └── rewards.service.ts
│   │   ├── activities/            # Challenges, missions & verification bans (FR-035..043)
│   │   │   ├── activities.routes.ts
│   │   │   ├── activities.schemas.ts
│   │   │   └── activities.service.ts
│   │   ├── proposals/             # Voluntary task proposals & messaging (FR-044..053)
│   │   │   ├── proposals.routes.ts
│   │   │   ├── proposals.schemas.ts
│   │   │   └── proposals.service.ts
│   │   ├── analytics/             # Rankings (1224), tiers, daily snapshots (FR-054..063)
│   │   │   ├── analytics.routes.ts
│   │   │   ├── analytics.schemas.ts
│   │   │   └── analytics.service.ts
│   │   ├── guidance/              # Guidance cards (FR-064..065)
│   │   │   ├── guidance.routes.ts
│   │   │   ├── guidance.schemas.ts
│   │   │   └── guidance.service.ts
│   │   └── reporting/             # Immutable audit log queries & exports (FR-066..071)
│   │       ├── reporting.routes.ts
│   │       ├── reporting.schemas.ts
│   │       ├── reporting.service.ts
│   │       └── exporters/         # CSV, Excel, PDF streaming exporters
│   │           ├── csv.exporter.ts
│   │           ├── excel.exporter.ts
│   │           └── pdf.exporter.ts
│   └── uploads/                   # Secure storage for verification file uploads
├── tests/
│   ├── unit/                      # Isolated domain & algorithm tests
│   │   ├── ranking.test.ts        # Standard competition ranking & tie-break tests
│   │   ├── tiers.test.ts          # Dynamic tier threshold evaluation tests
│   │   └── ban-calculator.test.ts # Rejection counter & ban window tests
│   ├── integration/               # Database & service integration tests
│   │   ├── auth-flow.test.ts      # Account provisioning, national ID, RBAC tests
│   │   ├── point-atomic.test.ts   # Concurrency, negative balance prevention
│   │   ├── rewards-flow.test.ts   # Approval vs instant redemption, return on decline
│   │   ├── proposals-flow.test.ts # Proposal state transitions & messaging
│   │   └── audit-immutability.test.ts # Verification of audit log persistence
│   └── contract/                  # OpenAPI contract adherence & schema tests
│       └── openapi-adherence.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Structure Decision**: Option 2 (Web application backend layout under `backend/`), cleanly isolated from any future client application. The layout groups cohesive domain features into modules (`modules/*`), separating transport (routes & schemas), domain business logic (services), and data persistence (Prisma), fully conforming to Constitution Principle III.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No constitutional violations identified. The architecture strictly adheres to all 7 constitutional principles.*

---
