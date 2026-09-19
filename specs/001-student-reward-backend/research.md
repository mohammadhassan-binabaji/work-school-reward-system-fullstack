# Research & Technical Decisions: Student Reward System Backend

**Feature Branch**: `001-student-reward-backend`  
**Date**: 2026-09-19  
**Status**: Completed  

This document captures the technical investigations, architecture evaluations, and decisions resolved during Phase 0 of the implementation planning process for the Student Reward System Backend.

---

## 1. Backend Runtime & Web Framework

- **Decision**: Node.js 24 LTS with TypeScript and **Fastify** as the web framework.
- **Rationale**:
  - **Constitutional Observability (Principle VII)**: Fastify has built-in integration with Pino, providing high-performance, structured JSON logging out-of-the-box. Fastify automatically manages request IDs and child loggers, enabling seamless propagation of request correlation identifiers (`X-Correlation-ID`) across all request lifecycles and structured completion logs (INFO on 2xx/3xx, ERROR on 4xx/5xx).
  - **Schema Validation & Contract Generation (Principle IV & V)**: Fastify provides first-class schema validation using JSON Schema / TypeBox. Routes validate headers, parameters, query strings, and payloads at system boundaries prior to business logic execution. In addition, `@fastify/swagger` and `@fastify/swagger-ui` generate accurate OpenAPI 3.0 specifications directly from route schemas.
  - **Separation of Concerns (Principle III)**: Fastify's encapsulated plugin architecture enables clean modular separation between routing/transport, authentication/guards, domain services, and database persistence.
  - **Performance & Developer Experience**: Near-zero overhead routing with fast startup and low memory footprint, running on the machine's installed Node.js 24 and npm 12 environments.
- **Alternatives Considered**:
  - *Express*: Widespread adoption, but lacks built-in structured logging, requires third-party middleware plumbing for request IDs, lacks native async error propagation in older patterns, and has slower JSON serialization.
  - *NestJS*: Full-featured enterprise framework, but introduces heavy boilerplate, reflection metadata, and unnecessary abstraction layers that conflict with Constitution Principle III ("avoid introducing new architectural layers or abstractions without clear need").
  - *Python 3.12 + FastAPI*: Strong candidate with Pydantic and async support, but Node.js 24 + TypeScript provides single-language typing shared across schemas and contracts, simpler binary export toolchains for Excel/PDF, and native ESM support.

---

## 2. Persistence Layer & Database ORM

- **Decision**: Relational database architecture using **Prisma ORM** with **SQLite (WAL mode)** for local development and automated testing, with seamless compatibility for **PostgreSQL** in production deployments.
- **Rationale**:
  - **Relational Integrity & ACID Transactions**: The system requires strict relational constraints across 17+ domain entities (Users, Classes, Subjects, Teacher-Class-Subject assignments, Point Balances, Rewards, Requests, Verification submissions, Audit trails).
  - **Atomic Balance Mutex / Concurrency Control**: Preventing negative balances (teachers and students) and inventory overselling requires atomic operations. Prisma supports explicit transactional boundaries (`prisma.$transaction`) and raw atomic conditional updates (`UPDATE ... WHERE balance >= :amount`) preventing race conditions during concurrent point deductions and reward redemptions.
  - **Zero-Setup Developer & CI Environment**: SQLite with Write-Ahead Logging (WAL) provides single-file, zero-dependency persistence that allows all unit, integration, and contract tests to run immediately in local environments without requiring Docker or external database daemon setup.
  - **Type-Safe Migrations & Schema Discipline**: `schema.prisma` acts as an explicit declarative data contract (Principle IV), generating fully type-safe query clients and automated migration scripts.
- **Alternatives Considered**:
  - *Drizzle ORM*: Lightweight and SQL-like, but requires more manual boilerplate for relation joins, nested transaction propagation, and migration management compared to Prisma.
  - *TypeORM*: Historically popular, but suffers from brittle Active Record / Data Mapper duality, decorators, and less reliable migration tracking.
  - *Raw SQL (better-sqlite3 / pg)*: Maximum speed, but lacks schema-to-TypeScript type synchronization and requires writing verbose manual query mappers and migration runners.

---

## 3. Authentication, Password Security & Role-Based Access Control (RBAC)

- **Decision**: **Argon2id** (via `@node-rs/argon2` or `argon2`) for credential hashing; **Stateful Redis Sessions** with secure, signed HTTP-only cookies (and fallback `Authorization: Bearer <sessionId>` header for API clients); pre-handler Fastify authorization hooks enforcing `ADMIN`, `TEACHER`, and `STUDENT` role boundaries with **instant 0-second session invalidation on user state changes**.
- **Rationale**:
  - **Account State Verification & Invalidation Invariant**: Users whose account state is not `Active` (i.e. `Inactive`, `Deactivated`, or `Departed`) MUST NOT be permitted to authenticate. Crucially, when an administrator changes a user's state (e.g. deactivating a teacher per FR-012, or departing a student/teacher per FR-010/014), all active sessions for that user MUST be invalidated immediately so that subsequent requests are rejected on the next HTTP call.
  - **Redis Session Architecture**:
    - On login (`POST /auth/login`), credentials and `accountState === 'Active'` are verified. A cryptographically random `sessionId` (UUID v4) is generated.
    - The session payload is written to Redis under key `session:{sessionId}` with a configurable TTL (e.g. 7 days): `{ userId, role, nationalId, firstName, lastName, accountState, createdAt }`.
    - Active sessions for each user are tracked in a Redis set `user_sessions:{userId}` containing all active `sessionId` members for that user.
    - The session identifier is issued to the client via an HTTP-only, secure, `SameSite=Lax` cookie (and also returned in the JSON login response for non-browser/API clients).
  - **Instant Revocation Trigger**:
    - When any user state mutation occurs (teacher deactivated/departed, student departed/deactivated/inactive, administrator deactivated), the transaction publishes a revocation event or calls the session manager to delete all `session:{sessionId}` keys listed in `user_sessions:{userId}` and clears the set.
    - Any subsequent request bearing that `sessionId` immediately receives `401 Unauthorized` (`SESSION_REVOKED` / `ACCOUNT_INACTIVE`).
  - **Credential Security (FR-003, FR-005)**: Passwords are encrypted with Argon2id and never returned in responses or logs.
  - **10-Digit National ID (FR-003, FR-004)**: Validated against regex `^\d{10}$` at the schema boundary.
  - **Role-Based Guards (FR-006, Principle V)**: Auth middleware loads session from Redis, verifies `accountState === 'Active'`, and enforces:
    - *Admin*: Full administrative operations.
    - *Teacher*: Scoped exclusively to classes and students assigned via `TeacherClassSubject`.
    - *Student*: Scoped strictly to the student's own records (proposals, balances, redemptions); blocked from querying other students' private data.
    - *Teacher Isolation*: Teachers are strictly rejected from accessing student task proposals or proposal message threads (FR-053).
- **Alternatives Considered**:
  - *Stateless JWT*: Rejected by user requirement because JWT signatures cannot be revoked immediately upon user deactivation without secondary database lookups or token revocation blacklists.
  - *Short-Lived JWT (5 min) + Refresh Token*: Rejected because deactivated users retain access during the remaining lifetime of their short-lived access token (up to 5 minutes) before token expiration triggers refresh rejection.
  - *Relational DB Session Table*: Viable, but Redis provides sub-millisecond memory-speed session verification and native key expiration (TTL) without periodic database cleanup cron jobs.

---

## 4. Ranking Algorithm & Data Privacy Boundaries

- **Decision**: In-memory and SQL-optimized **Standard Competition Ranking ("1224" ranking)** with top-student privacy filtering.
- **Rationale**:
  - **Ranking Logic (FR-054, FR-055, FR-056)**: Active enrolled students are queried (`account_state = 'Active'`), ordered by `current_points DESC`, then secondary stable sorting by name. Students with identical current points receive identical ranks, and subsequent ranks skip positions corresponding to the number of tied students (e.g., scores 100, 80, 80, 50 receive ranks 1, 2, 2, 4).
  - **Scope**: Evaluated at both `class` scope (for students in a specific class) and `school` scope (across all classes).
  - **Privacy Constraints (FR-058, SC-003)**:
    - When an administrator or teacher queries rankings, full administrative ranking lists are returned (teachers restricted to their assigned classes).
    - When a student queries rankings, the backend returns:
      1. The student's own calculated rank and current points.
      2. The total active population count (e.g., "15 of 32").
      3. The Top-$N$ student leaderboard (default Top 5 or Top 10) containing only name, rank, and points.
      4. Names and points of all students outside the Top-$N$ leaderboard are strictly filtered out by the response serializer before egress.
- **Alternatives Considered**:
  - *Dense Ranking ("1223")*: Violates FR-055 which explicitly requires standard competition ranking with position skipping.
  - *Dynamic on-the-fly SQL window function `RANK() OVER (ORDER BY current_points DESC)`*: Feasible in SQLite/PostgreSQL, but in-memory ranking on retrieved active cohort allows combining ranking, tie-breaking, student privacy projection, and top-$N$ slicing in a single coherent service function.

---

## 5. Tier Calculation & Daily Snapshot Mechanism

- **Decision**:
  - **Tiers**: Synchronous automated evaluation upon balance change using the 5 administrator-configured tier thresholds.
  - **Daily Balance Snapshots**: Scheduled reconciliation service capturing end-of-day current point balances per student.
- **Rationale**:
  - **Tier Evaluation (FR-060, FR-061, SC-005)**: The database maintains exactly 5 tier records configured by administrators with `tier_index` (1 to 5), `tier_name`, and `min_points`. Whenever a student's balance updates (award, adjustment, redemption reserve deduction, decline return), the student service resolves the appropriate tier (`max(tier) where current_points >= min_points`) and persists the updated tier foreign key atomically.
  - **Highest Balance Tracking (FR-059)**: Evaluated atomically: `IF current_points > highest_balance THEN highest_balance = current_points`.
  - **Daily Snapshots (FR-062)**: Stored in `daily_student_balance_snapshots` with composite unique constraint `(student_id, snapshot_date)`. Can be triggered via automated daily scheduled cron/timer or idempotently on end-of-day reconciliation API.
- **Alternatives Considered**:
  - *Real-time continuous balance graph via audit log replay*: Complex and slow for weekly charting queries. Pre-aggregated daily snapshots provide instantaneous $O(1)$ weekly chart retrieval.

---

## 6. Verification Request File Uploads & Abuse Ban Engine

- **Decision**:
  - **File Uploads**: Streaming multipart uploads via `@fastify/multipart` stored on the local file system under an isolated `uploads/verification/` directory with cryptographically secure random file identifiers and MIME-type/extension allowlists.
  - **Ban Engine**: Deterministic counter evaluation on verification review with a configurable 30-calendar-day ban window and explicit administrator override.
- **Rationale**:
  - **Attachment Support (FR-088)**: Students submit a text description along with direct image/file uploads (e.g., photos of homework or completion certificates). Files are stored on disk with metadata (original filename, storage path, mime type, size) stored in the database.
  - **3-Rejection Ban (FR-041, FR-042, FR-043, SC-007)**: When an administrator reviews a verification request and marks it `Rejected`, the system counts total rejection records for that `(student_id, activity_id)` pair. On the 3rd rejection, `banned_until` is set to `now + 30 days`. Any subsequent submission attempt while `banned_until > now` and `unbanned_at IS NULL` is immediately rejected with HTTP 403 Forbidden. Administrators can call the unblock endpoint to set `unbanned_at = now`, immediately restoring eligibility.
- **Alternatives Considered**:
  - *Base64-encoded strings in JSON payload*: High memory overhead, bloats database records, and risks payload limit errors.
  - *Permanent ban*: Violates FR-042 (requires flexible ~1-month ban with administrator override).

---

## 7. Reporting & Multi-Format Export Architecture

- **Decision**: Parameterized query service querying immutable audit records, with format-specific streaming adapters for CSV (`csv-stringify`), Excel (`exceljs`), and PDF (`pdfkit`).
- **Rationale**:
  - **On-Demand Parameterized Filtering (FR-069)**: Supports filtering by `startDate`, `endDate`, `studentId`, `teacherId`, `classId`, `subjectId`, `actionType`, `rewardId`, and `studentTier` dynamically at runtime without saved templates.
  - **Role-Based Scoping (FR-070)**:
    - Admin: Entire school audit trail.
    - Teacher: Restricted to students in classes assigned to teacher.
    - Student: Restricted to transactions where `actor_id = studentId OR recipient_id = studentId`.
  - **Export Formats (FR-071, SC-008)**:
    - *CSV*: Light, fast UTF-8 stream using `csv-stringify`.
    - *Excel*: Styled spreadsheet using `exceljs` with bold headers, formatted numbers/dates, and auto-adjusted column widths.
    - *PDF*: Clean tabular document generated via `pdfkit` with header metadata, report generation timestamp, filter summary, and tabular row layout.
- **Alternatives Considered**:
  - *Client-side export generation*: Violates Backend-First Delivery (Constitution Principle II) and requires sending entire unpaginated datasets to the client.
  - *Headless Chromium (Puppeteer) for PDF*: Very heavy memory footprint (~300MB+ Chromium binary), slow, and introduces external OS dependencies. `pdfkit` is pure Node.js and fast.

---

## 8. Error Handling, Observability & Request Correlation

- **Decision**: Centralized custom `ApplicationError` hierarchy, Fastify lifecycle hooks for correlation ID propagation (`X-Correlation-ID`), and Pino structured completion logging.
- **Rationale**:
  - **Constitution Principle VII Compliance**:
    - Every HTTP request receives or inherits a unique UUID v4 correlation ID via `onRequest` hook.
    - The correlation ID is attached to the Fastify request context and returned in the `X-Correlation-ID` response header.
    - Fastify `onResponse` hook logs structured completion events at `INFO` level: `{ correlationId, method, url, statusCode, durationMs }`.
    - Fastify `onError` hook catches all errors and logs at `ERROR` level with the correlation ID, error code, and error cause without leaking sensitive information.
    - Public error response body is strictly normalized:
      ```json
      {
        "statusCode": 400,
        "error": "Bad Request",
        "message": "Human-readable validation or business rule failure",
        "correlationId": "c3b9b4a4-681b-4f9e-8c3e-8c9e4726b12a"
      }
      ```
    - Passwords, tokens, and credentials are explicitly redacted by Pino logger serializers.
- **Alternatives Considered**:
  - *Ad-hoc `console.log` statements*: Violates Constitution Principle VII requiring structured, contextual completion logging.
  - *Unhandled native error dumps*: Violates Constitution Principle V & VII by leaking internal implementation details or stack traces to clients.
