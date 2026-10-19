# API Quickstart & Verification Guide

This guide describes the core API endpoints and verification flows for the Student Reward System Backend.

## Authentication & Headers
- All authenticated endpoints require either:
  - Cookie: `sessionId=<uuid>`
  - Header: `Authorization: Bearer <sessionId>` or `X-Session-Id: <uuid>`
- All requests are tagged with `X-Correlation-Id` for traceability across logs and audit ledgers.

## Key API Endpoints

### 1. Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/initial-admin` - Bootstrap initial administrator account.
- `POST /api/v1/auth/login` - Authenticate using 10-digit National ID and password.
- `POST /api/v1/auth/logout` - Invalidate active session in Redis.
- `GET /api/v1/auth/me` - Get profile of the current authenticated user.

### 2. User Management (`/api/v1/users`) [Admin only]
- `POST /api/v1/users` - Create administrator, teacher, or student accounts.
- `GET /api/v1/users` - List users with optional role and accountState filtering.
- `GET /api/v1/users/:id` - Get user details.
- `PATCH /api/v1/users/:id/state` - Update user account state (`ACTIVE`, `INACTIVE`, `DEACTIVATED`, `DEPARTED`).

### 3. Academic Structure (`/api/v1/classes`, `/api/v1/subjects`, `/api/v1/assignments`)
- `POST/GET/PATCH/DELETE /api/v1/classes` - Manage class structures.
- `POST/GET/PATCH/DELETE /api/v1/subjects` - Manage subject catalog.
- `POST /api/v1/classes/assign-student` - Assign or reassign a student to a class (preserves points and active requests).
- `POST /api/v1/classes/students/:id/depart` - Process student departure (clears balances, cancels pending requests).
- `POST/GET/DELETE /api/v1/assignments` - Assign teacher to class and subject.
- `POST /api/v1/assignments/teachers/:id/depart` - Process teacher departure (returns unspent budget to system pool).

### 4. Point Economy (`/api/v1/points`)
- `GET /api/v1/points/pool` - Get system pool balance.
- `POST /api/v1/points/pool/fund-teacher` - Transfer points from pool to teacher budget.
- `POST/GET/PATCH/DELETE /api/v1/points/tasks` - Predefined transfer tasks with discrete positive point options.
- `POST /api/v1/points/teacher-award` - Teacher awards points to student in assigned class.
- `POST /api/v1/points/admin-adjust` - Direct admin credit or debit to student balance.

### 5. Reward Catalog & Redemption (`/api/v1/rewards`, `/api/v1/reward-requests`)
- `POST/GET/PATCH/DELETE /api/v1/rewards` - Manage reward catalog (price is immutable).
- `POST /api/v1/reward-requests` - Student redeems reward (immediate balance reservation). Returns `409` if the student already has a pending request for the same reward.
- `POST /api/v1/reward-requests/:id/approve` - Admin approves request.
- `POST /api/v1/reward-requests/:id/decline` - Admin declines request (refunds reserved points to student).
- `POST /api/v1/reward-requests/:id/receive` - Admin confirms physical handover (completes redemption).

### 6. Challenges & Missions (`/api/v1/activities`, `/api/v1/verifications`, `/api/v1/students`)
- `POST/GET/PATCH/DELETE /api/v1/activities` - Manage challenges and missions.
- `POST /api/v1/activities/:id/submissions` - Student submits verification evidence (text and file URL).
- `POST /api/v1/verifications/:id/accept` - Admin accepts submission (awards fixed points).
- `POST /api/v1/verifications/:id/reject` - Admin rejects submission (3 rejections trigger dynamic temporary submission ban).
- `POST /api/v1/students/:id/unban` - Admin manually unbans student.

### 7. Voluntary Task Proposals (`/api/v1/proposals`)
- `POST /api/v1/proposals` - Student submits task proposal.
- `POST /api/v1/proposals/:id/approve` - Admin approves and sets point value (`READY_TO_DO`).
- `PATCH /api/v1/proposals/:id/points` - Admin modifies point value while `READY_TO_DO`.
- `POST /api/v1/proposals/:id/cancel` - Student cancels proposal (allowed strictly in `READY_TO_DO`).
- `POST /api/v1/proposals/:id/complete` - Admin marks completed and awards points.
- `POST/GET /api/v1/proposals/:id/messages` - Private in-request messages (teachers strictly excluded).

### 8. Rankings & Tiers (`/api/v1/rankings`, `/api/v1/tiers`)
- `GET /api/v1/rankings/class/:id` - Standard competition ranking for class (privacy-masked for students).
- `GET /api/v1/rankings/school` - School-wide standard competition ranking.
- `GET /api/v1/rankings/students/:id/snapshot-history` - Student daily snapshot history (balance + school/class ranks) for charts.
- `GET /api/v1/rankings/students/:id/balance-history?limit=14&beforeDate=...` - Student daily balance snapshot history for interactive line charts (chronological LTR, cursor-based pagination).
- `GET/PUT /api/v1/tiers` - Configure exactly 5 student tiers.

### 9. Point Flow Audit & Reporting (`/api/v1/reports`)
- `GET /api/v1/reports/point-flow` - Query role-scoped immutable audit log records.
- `GET /api/v1/reports/point-flow/export?format=csv|xlsx|pdf` - Stream report in CSV, Excel (XLSX), or PDF format.

### 10. Guidance Cards (`/api/v1/guidance-cards`)
- `POST/GET/PATCH/DELETE /api/v1/guidance-cards` - Manage and view display-only point earning guidance cards.
