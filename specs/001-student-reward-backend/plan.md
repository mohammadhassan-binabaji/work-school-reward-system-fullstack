# Implementation Plan: Student Reward System Backend

**Branch**: `001-student-reward-backend` | **Date**: 2026-09-24 | **Spec**: [specs/001-student-reward-backend/spec.md](spec.md)

**Input**: Feature specification from `/specs/001-student-reward-backend/spec.md` and requirements from `/docs/requirements/`

---

## Summary

Build the complete backend service for the Student Reward System as a TypeScript / NestJS Modular Monolith. The system provides role-based capabilities for School Administrators, Teachers, and Students, managing account provisioning (10-digit national ID + Argon2), academic structure assignments, point pool funding and teacher award budgets, reward catalog and redemption lifecycles, challenges/missions with abuse prevention (3-rejection ban dynamic via `ACTIVITY_BAN_DURATION_DAYS`, defaulting to 30 days), voluntary student task proposals with private messaging, standard competition ranking (1, 2, 2, 4) with 5 configurable tiers, daily midnight balance snapshots, immutable point audit logging, and multi-format report exports (CSV, XLSX, PDF).

---

## Technical Context

- **Language/Version**: TypeScript 5.x / Node.js 20+ LTS
- **Primary Dependencies**: NestJS v10+ (`@nestjs/core`, `@nestjs/common`, `@nestjs/swagger`, `@nestjs/schedule`), Prisma ORM v5+, `ioredis` (Redis stateful sessions), `argon2` (password hashing), `class-validator` / `class-transformer`, `fast-csv`, `exceljs`, `pdfmake`, `@aws-sdk/client-s3`
- **Storage**:
  - **Relational DB**: PostgreSQL 16 (Users, Profiles, Academic structures, Points, Rewards, Verification, Proposals, Tiers, and Immutable Audit Logs)
  - **In-Memory Store**: Redis 7 (Stateful sessions with TTL)
  - **Object Storage**: Local Disk (`uploads/`) for development / MinIO S3 container for staging & production
- **Environment & Configuration**:
  - `PORT` (default: 3000), `DATABASE_URL`, `REDIS_URL`, `SESSION_TTL_SECONDS` (default: 86400)
  - `ACTIVITY_BAN_DURATION_DAYS` (dynamic temporary submission ban duration on 3rd rejection, integer, default: 30)
  - `STORAGE_PROVIDER` (`local` | `minio` | `s3`)
- **Testing**: Jest (`ts-jest`), Supertest (End-to-End API contract testing), `@nestjs/testing`
- **Target Platform**: Linux container (Docker) / Node.js runtime
- **Project Type**: RESTful Web Service (Modular Monolith)
- **Performance Goals**: $< 100\text{ms}$ p95 for point transfers and transactional awards; $< 50\text{ms}$ for cached session lookups and ranking queries
- **Constraints**:
  - Enforce non-negative point balances (`CHECK (balance >= 0)`) at database layer
  - Permanent, immutable audit ledger (no update/delete permissions)
  - Correlation ID (`X-Correlation-Id`) propagated across all layers and logs
  - Strict privacy scoping (students see only top board and own rank; teachers see only assigned students; proposals isolated from teachers)
- **Scale/Scope**: Single school scope (~1,000–5,000 students, 100 teachers, ~50,000 point transactions/month)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evaluation & Evidence |
| :--- | :--- | :--- |
| **I. Requirements & Specification First** | **PASS** | Plan directly implements behavioral requirements from `spec.md` and `docs/requirements/` without modifying business intent. |
| **II. Backend-First Delivery** | **PASS** | Completely decoupled backend with end-to-end runnable validation scenarios (`quickstart.md`) and OpenAPI contracts. |
| **III. Modular Architecture & Separation of Concerns** | **PASS** | Modular Monolith layout dividing HTTP controllers, domain services, and Prisma repositories into clean domain modules. |
| **IV. API & Data Contract Discipline** | **PASS** | Explicit OpenAPI 3.0 contract in `contracts/openapi.yaml` and strict relational schema with table constraints in `data-model.md`. |
| **V. Security & Input Validation** | **PASS** | 10-digit national ID validation, Argon2id hashing, stateful Redis session guards, RBAC guards, and DTO validation pipes. |
| **VI. Testability & Verification** | **PASS** | Comprehensive unit, integration, and E2E contract test suites mapped to acceptance scenarios in `quickstart.md`. |
| **VII. Error Handling & Observability** | **PASS** | Global Exception Filter preserving semantic errors, `CorrelationMiddleware` injecting `X-Correlation-Id`, and structured JSON completion logger scrubbing sensitive fields. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-student-reward-backend/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 architectural decisions & tech evaluation
├── data-model.md        # Phase 1 data entities, Prisma schema & state machines
├── quickstart.md        # Phase 1 end-to-end runnable verification guide
├── contracts/
│   └── openapi.yaml     # Phase 1 OpenAPI 3.0 REST specification
└── checklists/
    └── requirements.md  # Requirements traceability checklist
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma              # PostgreSQL schema & relationships
│   └── migrations/                # Versioned SQL migrations
├── src/
│   ├── common/                    # Cross-cutting concerns
│   │   ├── decorators/            # @Roles(), @CurrentUser(), etc.
│   │   ├── filters/               # GlobalExceptionFilter
│   │   ├── guards/                # SessionAuthGuard, RolesGuard
│   │   ├── interceptors/          # LoggingInterceptor, CorrelationInterceptor
│   │   ├── middleware/            # CorrelationMiddleware
│   │   └── utils/                 # Ranking math, CSV/Excel/PDF export helpers
│   ├── config/                    # Environment & configuration modules
│   ├── modules/
│   │   ├── auth/                  # Authentication, Argon2, Redis session management
│   │   ├── users/                 # Admin, Teacher, Student accounts & lifecycle
│   │   ├── academic/              # Classes, Subjects, Teacher-Class assignments
│   │   ├── points/                # System pool, Task definitions, Teacher awards, Audit log
│   │   ├── rewards/               # Reward catalog, Inventory, Redemptions lifecycle
│   │   ├── activities/            # Challenges, Missions, Verification, dynamic ban (default 30 days)
│   │   ├── proposals/             # Voluntary student task proposals & message thread
│   │   ├── rankings/              # Standard competition rankings, Tiers, Daily snapshots
│   │   ├── guidance/              # Display-only guidance cards
│   │   ├── reports/               # Point flow reporting & multi-format streaming export
│   │   └── storage/               # Abstracted file storage (Local / MinIO S3)
│   ├── app.module.ts              # Root application module
│   └── main.ts                    # Bootstrap entry point (Swagger, CORS, Pipes)
├── test/
│   ├── contract/                  # OpenAPI contract conformance tests
│   ├── integration/               # Database transaction & concurrency tests
│   └── e2e/                       # Full lifecycle user scenario tests
├── docker-compose.yml             # PostgreSQL 16, Redis 7, MinIO services
├── package.json
├── tsconfig.json
└── README.md
```

**Structure Decision**: Selected a **Modular Monolith** structure under `backend/`, grouping cohesive domain features into self-contained NestJS modules with shared infrastructure and cross-cutting security/observability components under `common/`.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | Standard NestJS modular layered architecture is utilized with zero unjustified architectural overhead. | N/A |
