# Research & Architectural Decisions: Student Reward System Backend

**Feature Branch**: `001-student-reward-backend`
**Date**: 2026-09-24
**Status**: Approved & Resolved

---

## 1. Application Framework & Architecture Style

- **Decision**: TypeScript (Node.js 20+ LTS) with NestJS organized as a **Modular Monolith** with strict layer separation (Controllers/HTTP Adapters $\rightarrow$ Application/Domain Services $\rightarrow$ Prisma Repositories/Data Access).
- **Rationale**:
  - NestJS provides out-of-the-box dependency injection, lifecycle hooks, modular boundaries, validation pipes (`class-validator`), and native OpenAPI (`@nestjs/swagger`) support.
  - TypeScript provides end-to-end compile-time type safety.
  - A Modular Monolith satisfies Constitution Principle III (clear separation of concerns, explicit module boundaries) without the operational overhead and distributed transaction complexity of microservices.
- **Alternatives Considered**:
  - *FastAPI (Python)*: High productivity, but developer preferred TypeScript/NestJS.
  - *Express.js (standalone)*: Lacks structured architectural conventions and built-in DI.
  - *Microservices*: Rejected due to unnecessary distributed transaction complexity for point economy consistency.

---

## 2. Database Technology & Data Access (ORM)

- **Decision**: **PostgreSQL 16** with **Prisma ORM**.
- **Rationale**:
  - PostgreSQL delivers ACID transactions, strict relational integrity constraints, foreign key cascades, and check constraints (`CHECK (current_balance >= 0)`).
  - Prisma generates type-safe database client models from `schema.prisma`, handles declarative database migrations via `prisma migrate`, and provides interactive transactions (`prisma.$transaction(async (tx) => { ... })`) to execute atomic point transfers and balance updates.
- **Alternatives Considered**:
  - *Sequelize*: Rejected due to decorator boilerplate, manual type synchronization, and more complex transaction management.
  - *TypeORM*: Has higher maintenance burden and known query builder edge cases compared to Prisma.
  - *MongoDB / Document DB*: Lacks relational foreign key guarantees and complicates multi-entity financial-style point transactions.

---

## 3. Authentication & Session Management

- **Decision**: **Stateful Sessions with Redis Store** + **Argon2id** Password Hashing.
- **Rationale**:
  - Users authenticate using a 10-digit national ID and password.
  - Passwords are encrypted using Argon2id (`argon2` package), offering industry-leading resistance against GPU cracking and side-channel attacks.
  - Stateful session IDs are stored in Redis (`ioredis` with TTL) and exchanged via secure HTTP-only cookies or `Authorization: Bearer <session_id>` headers.
  - Allows immediate administrative session invalidation (e.g., when a teacher/student account is deactivated or marked as departed).
- **Alternatives Considered**:
  - *Stateless JWT*: While lightweight, immediate revocation (required for account deactivation and departure per FR-012/FR-014) is difficult without a token blacklist.
  - *Database-backed sessions*: Redis provides sub-millisecond session lookup latency and automatic TTL expiration without polluting the primary relational database.

---

## 4. Role-Based Authorization & Data Isolation

- **Decision**: NestJS Execution Guards (`SessionAuthGuard`, `RolesGuard`) with resource-scoped authorization interceptors/decorators.
- **Rationale**:
  - Roles defined: `ADMIN`, `TEACHER`, `STUDENT`.
  - Scoping rules:
    - `ADMIN`: Full system-wide access.
    - `TEACHER`: Restricted to classes and students assigned via `TeacherClassSubjectAssignment`. Prohibited from viewing student task proposals (FR-053).
    - `STUDENT`: Restricted strictly to self data (own balance, own proposals, own requests). Ranking endpoints return top board + self rank only without revealing non-top peer data (FR-058, FR-051).
- **Alternatives Considered**:
  - *External Policy Engine (Opa/Casbin)*: Overkill for the 3 distinct roles with well-defined relational scoping rules.

---

## 5. Point Economy & Concurrency Safety

- **Decision**: Interactive Transactions with Row-Level Locking (`SELECT FOR UPDATE` or Prisma `$transaction` with optimistic locking and PostgreSQL check constraints).
- **Rationale**:
  - Enforces atomic balance updates across:
    1. Pool $\rightarrow$ Teacher budget funding.
    2. Teacher budget $\rightarrow$ Student reward balance award.
    3. Student balance reservation $\rightarrow$ Reward inventory deduction.
    4. Reward approval/decline/removal point returns.
    5. Challenge / Mission verification acceptance point awards.
    6. Student task proposal completion point awards.
    7. Admin direct adjustments.
  - Database schema includes `CHECK (current_balance >= 0)` and `CHECK (reserved_balance >= 0)` constraints to ensure negative balances are physically impossible at the storage layer.
  - All balance changes write to an append-only, immutable `PointAuditLog` table.
- **Alternatives Considered**:
  - *Event Sourcing*: Adds significant architectural complexity; transactional ledger tables with row checks provide identical auditability with much simpler query semantics.

---

## 6. Audit Logging & Immutability

- **Decision**: PostgreSQL Append-Only `PointAuditLog` entity with application-level and database trigger-level prevention of updates and deletions.
- **Rationale**:
  - FR-066, FR-067, and FR-068 require permanent, unalterable audit records for every point transaction.
  - Each record stores: `id`, `correlationId`, `actorId`, `actorRole`, `sourceEntity`, `recipientEntity`, `amount`, `actionType`, `taskOrReason`, `relatedEntityType`, `relatedEntityId`, `resultingBalance`, and `createdAt`.
  - Application repositories expose only `create` and `find` methods for audit logs, rejecting any update/delete invocations.
- **Alternatives Considered**:
  - *External Immutable Ledger (Amazon QLDB / Blockchain)*: Unnecessary infrastructure complexity; database permissions and append-only tables satisfy all compliance requirements.

---

## 7. Challenge & Mission Verification Abuse Prevention

- **Decision**: Verification tracking table storing submission history, rejection counts, and an active `submission_ban_until` timestamp.
- **Rationale**:
  - On the 3rd rejection for a given activity and student, `submission_ban_until` is set to `now() + 30 days` (FR-042).
  - Admins can invoke the unban endpoint (`DELETE /api/v1/students/:id/bans/:activityId` or `POST /api/v1/students/:id/unban`), which clears `submission_ban_until` and resets the rejection count (FR-043).
  - Submissions check `completedCount < completionLimit` and `submission_ban_until < now()`.
- **Alternatives Considered**:
  - *Global user ban*: Spec requires activity-specific ban rather than locking the entire student account.

---

## 8. Ranking, Tiering & Daily Balance Snapshots

- **Decision**:
  - **Rankings**: Computed on-demand using PostgreSQL window function `RANK() OVER (PARTITION BY class_id ORDER BY current_points DESC)` and `RANK() OVER (ORDER BY current_points DESC)` excluding inactive/deactivated/departed students.
  - **Tiers**: Exactly 5 tiers configured in `TierConfiguration` table. Student entity updates `current_tier_id` dynamically upon balance change.
  - **Daily Snapshots**: `@nestjs/schedule` cron job scheduled at `00:00:00` daily to insert records into `DailyStudentBalanceSnapshot` table for active students.
- **Rationale**:
  - `RANK()` implements Standard Competition Ranking (1, 2, 2, 4) as required by FR-055.
  - Daily snapshots provide historical data for weekly timeline charts (FR-062).
- **Alternatives Considered**:
  - *Continuous rank caching in Redis*: Unnecessary complexity for the expected school scale ($< 5,000$ students per school); indexed SQL window queries execute in $< 5\text{ms}$.

---

## 9. File & Media Storage

- **Decision**: Abstracted `StorageService` interface with two provider implementations:
  1. `LocalStorageService`: Writes files to local filesystem disk (`uploads/` directory) for development and offline testing.
  2. `MinioS3StorageService`: Uses AWS S3 SDK (`@aws-sdk/client-s3`) to communicate with MinIO container or cloud S3 bucket for staging/production.
- **Rationale**:
  - Supports image and document attachments for challenge verification evidence (FR-088) and reward catalog images (FR-085).
  - Clean interface abstraction allows switching storage providers via environment configuration (`STORAGE_PROVIDER=local|minio|s3`).
- **Alternatives Considered**:
  - *Database BLOBs*: Degrades database query performance and bloats database backups.

---

## 10. Observability, Logging & Error Propagation

- **Decision**: Custom Correlation Middleware (`x-correlation-id` header injection) + NestJS Interceptor for Structured Request Completion Logging + Global Exception Filter.
- **Rationale**:
  - Fulfills Constitution Principle VII and FR-072 – FR-075.
  - Assigns or propagates UUID v4 `x-correlation-id` on every HTTP request.
  - Successful requests produce structured INFO logs with status, latency, route, and correlation ID.
  - Failed requests produce structured ERROR logs with error code, sanitized message, stack trace (internal logs only), and correlation ID.
  - Strict log sanitization ensures passwords, national IDs, and session tokens are never logged.
- **Alternatives Considered**:
  - *Default NestJS Logger*: Lacks structured JSON payload formatting and automatic correlation ID binding out of the box.

---

## 11. Report Export Service

- **Decision**: Streaming export utilities using `fast-csv` (CSV), `exceljs` (Excel XLSX), and `pdfmake` / `pdfkit` (PDF).
- **Rationale**:
  - Satisfies FR-071 with role-based filtering (Admin: school-wide; Teacher: assigned classes; Student: self).
  - Streams HTTP response buffers with appropriate MIME types (`text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/pdf`) and `Content-Disposition` headers.
- **Alternatives Considered**:
  - *Third-party reporting engine*: Unnecessary external dependency; Node.js streaming libraries handle tabular reports efficiently.
