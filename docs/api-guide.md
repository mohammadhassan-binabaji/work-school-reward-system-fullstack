# API Quickstart & Verification Guide

This guide describes the core API endpoints and verification flows for the Student Reward System Backend.

## Authentication & Headers
**Current session policy:** Browser frontends use the host-only, HttpOnly `sessionId` cookie and never receive the session ID in JavaScript. The student Android app uses an opaque `Authorization` credential protected at rest by Android Keystore. Cookie-authenticated state-changing requests require `X-CSRF-Token` from `GET /api/v1/auth/csrf`. Redis TTL is one hour without “remember me,” 30 days for remembered students, and seven days for remembered admin/teacher accounts.

The header-based alternatives listed below remain for compatibility; browser frontends should use the cookie strategy described above:
- All authenticated endpoints require either:
  - Cookie: `sessionId=<uuid>`
  - Header: `Authorization: Bearer <sessionId>` or `X-Session-Id: <uuid>`
- All requests are tagged with `X-Correlation-Id` for traceability across logs and audit ledgers.

## Key API Endpoints

### 1. Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/initial-admin` - Bootstrap initial administrator account.
- `POST /api/v1/auth/login` - Authenticate using 10-digit National ID and password.
- `POST /api/v1/auth/mobile-login` - Student Android login; returns a session credential without setting a cookie.
- `GET /api/v1/auth/csrf` - Get the CSRF token for a browser session.
- `POST /api/v1/auth/logout` - Invalidate active session in Redis.
- `GET /api/v1/auth/me` - Get profile of the current authenticated user.

### 2. User Management (`/api/v1/users`) [Admin only]
- `GET /api/v1/users/students` - Admin or vice principal lookup of active students using only the identifying fields needed by direct-adjustment forms; vice principals do not receive access to general user-management endpoints.
- `POST /api/v1/users` - Create user account (supports multipart/form-data with optional profile image file up to 5MB, JPG/PNG/WebP).
- `GET /api/v1/users/import/template` - Download student bulk import Excel template with optional image filename column.
- `POST /api/v1/users/import/excel` - Bulk import students from Excel file and optional ZIP archive containing photos matching filenames in spreadsheet.
- `GET /api/v1/users` - List users with optional role and accountState filtering (includes `imageUrl`).
- `GET /api/v1/users/:id` - Get user details (includes `imageUrl`).
- `PATCH /api/v1/users/:id/state` - Admin-only account-state changes (`ACTIVE`, `INACTIVE`, `DEACTIVATED`, `DEPARTED`). Setting a vice principal to `DEPARTED` returns their remaining balance to the system pool.

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
- `POST /api/v1/points/pool/fund-vice-principal` - Admin transfers points from pool to an active vice principal's personal balance.
- `POST/GET/PATCH/DELETE /api/v1/points/tasks` - Predefined transfer tasks with discrete positive point options.
- `POST /api/v1/points/teacher-award` - Teacher awards points to student in assigned class.
- `POST /api/v1/points/admin-adjust` - Admin directly credits or debits a student's balance using the system pool.
- `POST /api/v1/points/vice-adjust` - Vice principal credits a student from their own balance or debits the student to return points to their own balance. Insufficient balances are rejected.

### 5. Reward Catalog & Redemption (`/api/v1/rewards`, `/api/v1/reward-requests`)
- `POST/GET/PATCH/DELETE /api/v1/rewards` - Admins and vice principals manage the reward catalog (price is immutable); create/update accept an image URL or a JPEG, PNG, or WebP upload up to 5 MB, and updates can clear the image.
- `POST /api/v1/reward-requests` - Student redeems reward (immediate balance reservation). Returns `409` if the student already has a pending request for the same reward.
- `POST /api/v1/reward-requests/:id/approve` - Admin or vice principal approves request.
- `POST /api/v1/reward-requests/:id/decline` - Admin or vice principal declines request (refunds reserved points to student).
- `POST /api/v1/reward-requests/:id/receive` - Admin or vice principal confirms physical handover (completes redemption).

### 6. Challenges & Missions (`/api/v1/activities`, `/api/v1/verifications`, `/api/v1/students`)
- `POST/GET/PATCH/DELETE /api/v1/activities` - Admins and vice principals manage challenges and missions.
- `POST /api/v1/activities/:id/submissions` - Student submits verification evidence (text and file URL).
- `POST /api/v1/verifications/:id/accept` - Admin or vice principal accepts submission (awards fixed points).
- `POST /api/v1/verifications/:id/reject` - Admin or vice principal rejects submission (3 rejections trigger dynamic temporary submission ban).
- `POST /api/v1/students/:id/unban` - Admin or vice principal manually unbans a student.

### 7. Voluntary Task Proposals (`/api/v1/proposals`)
- `POST /api/v1/proposals` - Student submits task proposal.
- `POST /api/v1/proposals/:id/approve` - Admin or vice principal approves and sets point value (`READY_TO_DO`).
- `PATCH /api/v1/proposals/:id/points` - Admin or vice principal modifies point value while `READY_TO_DO`.
- `POST /api/v1/proposals/:id/cancel` - Student cancels proposal (allowed strictly in `READY_TO_DO`).
- `POST /api/v1/proposals/:id/complete` - Admin or vice principal marks completed and awards points.
- `POST/GET /api/v1/proposals/:id/messages` - Private in-request messages (admin, vice principal, and proposal owner only; teachers are excluded).

### 8. Rankings & Tiers (`/api/v1/rankings`, `/api/v1/tiers`)
- `GET /api/v1/rankings/class/:id` - Standard competition ranking for class (privacy-masked for students).
- `GET /api/v1/rankings/school` - School-wide standard competition ranking.
- `GET /api/v1/rankings/students/:id/snapshot-history` - Student daily snapshot history (balance + school/class ranks) for charts.
- `GET /api/v1/rankings/students/:id/balance-history?limit=14&beforeDate=...` - Student daily balance snapshot history for interactive line charts (chronological LTR, cursor-based pagination).
- `GET /api/v1/tiers` - Get all 5 student tier configurations, including assigned `themeId` and `motivationalMessages`.
- `PUT /api/v1/tiers` - Update all 5 student tier configurations (tier name, `minPointsThreshold`, `themeId`, and `motivationalMessages`). Automatically re-evaluates active students' tiers.

### 9. Point Flow Audit & Reporting (`/api/v1/reports`)
- `GET /api/v1/reports/point-flow` - Query role-scoped immutable audit log records. Transfer amounts are positive magnitudes between debited `sourceType` and credited `recipientType`. Optional `reasonDetail` contains the task name for `TEACHER_AWARD_STUDENT` or user-supplied reason for `ADMIN_ADJUST_STUDENT` (`null` for other action types).
- `GET /api/v1/reports/point-flow/export?format=csv|xlsx|pdf` - Stream report in CSV, Excel (XLSX), or PDF format.

### 10. Guidance Cards (`/api/v1/guidance-cards`)
- `POST/GET/PATCH/DELETE /api/v1/guidance-cards` - Manage and view display-only point earning guidance cards.

### 11. Notifications (`/api/v1/notifications`)
- `GET /api/v1/notifications` and `GET /api/v1/notifications/unread-count` - Read the authenticated user's own inbox and unread count.
- `PATCH /api/v1/notifications/:id/read` and `PATCH /api/v1/notifications/read-all` - Mark only the authenticated user's notifications as read.
- Reward approval requests, proposals and proposal messages, and activity verification submissions notify every active administrator and vice principal. Vice principals cannot read another user's inbox.

Vice principals are denied user, academic, pool, point-task, guidance-card, tier, ranking, and report APIs, even if they call those endpoints directly.
