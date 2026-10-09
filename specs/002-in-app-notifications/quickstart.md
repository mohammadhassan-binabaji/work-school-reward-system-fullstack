# Quickstart & Verification Guide: In-App Notification System

**Feature Branch**: `002-in-app-notifications` | **Date**: 2026-10-09 | **Status**: Completed

This guide provides runnable end-to-end verification workflows and testing commands for validating the In-App Notification System according to its specification and acceptance criteria.

---

## Prerequisites & Environment Setup

Ensure PostgreSQL and Redis containers are running, and database migrations are applied:

```bash
cd backend
# Start infrastructure containers
docker compose up -d

# Apply database migrations and generate Prisma client
npm run prisma:migrate
npm run prisma:generate

# (Optional) Seed base user accounts and roles
npm run prisma:seed
```

---

## Verification Scenarios

### Scenario 1: Inbox Retrieval, Deterministic Sorting & Pagination (User Story 1 / FR-004)

**Objective**: Verify paginated retrieval of notifications sorted by `createdAt DESC, id DESC` and status filtering (`ALL`, `UNREAD`, `READ`).

1. **Query Default Inbox (Page 1, Limit 20, Status ALL)**:
   ```bash
   curl -X GET "http://localhost:3000/api/v1/notifications?page=1&limit=20&status=ALL" \
     -H "Cookie: session_id=<STUDENT_SESSION_COOKIE>"
   ```
   **Expected Response**:
   - HTTP 200 with `data` array (up to 20 items) and `meta` pagination object (`totalItems`, `totalPages`, `currentPage`, `itemCount`, `itemsPerPage`).
   - Items sorted in reverse chronological order (`createdAt DESC`) with secondary tie-breaker `id DESC`.

2. **Query Filtered Unread Notifications**:
   ```bash
   curl -X GET "http://localhost:3000/api/v1/notifications?status=UNREAD" \
     -H "Cookie: session_id=<STUDENT_SESSION_COOKIE>"
   ```
   **Expected Response**:
   - HTTP 200 containing only records where `readStatus: "UNREAD"` and `readAt: null`.

3. **Query Filtered Read Notifications**:
   ```bash
   curl -X GET "http://localhost:3000/api/v1/notifications?status=READ" \
     -H "Cookie: session_id=<STUDENT_SESSION_COOKIE>"
   ```
   **Expected Response**:
   - HTTP 200 containing only records where `readStatus: "READ"` and `readAt` is a valid ISO timestamp.

---

### Scenario 2: Unread Notification Badge Counter (User Story 1 / FR-005)

**Objective**: Verify retrieval of the accurate unread notification count.

```bash
curl -X GET "http://localhost:3000/api/v1/notifications/unread-count" \
  -H "Cookie: session_id=<STUDENT_SESSION_COOKIE>"
```

**Expected Response**:
```json
{
  "unreadCount": 4
}
```

---

### Scenario 3: Individual Mark-as-Read & Idempotency (User Story 2 / FR-006)

**Objective**: Verify single notification status transition from `UNREAD` to `READ` and idempotent re-execution.

1. **Mark Notification Read**:
   ```bash
   curl -X PATCH "http://localhost:3000/api/v1/notifications/<NOTIFICATION_UUID>/read" \
     -H "Cookie: session_id=<STUDENT_SESSION_COOKIE>"
   ```
   **Expected Response**:
   - HTTP 200 with `readStatus: "READ"` and populated `readAt` timestamp.
   - Calling `/notifications/unread-count` confirms the count decremented by 1.

2. **Re-mark Same Notification Read (Idempotency Check)**:
   ```bash
   curl -X PATCH "http://localhost:3000/api/v1/notifications/<NOTIFICATION_UUID>/read" \
     -H "Cookie: session_id=<STUDENT_SESSION_COOKIE>"
   ```
   **Expected Response**:
   - HTTP 200 with identical `readAt` timestamp (not updated) and unread count unchanged.

---

### Scenario 4: Bulk Mark-All-as-Read (User Story 2 / FR-007)

**Objective**: Verify transition of all unread notifications across the entire inbox in a single global operation.

```bash
curl -X PATCH "http://localhost:3000/api/v1/notifications/read-all" \
  -H "Cookie: session_id=<STUDENT_SESSION_COOKIE>"
```

**Expected Response**:
```json
{
  "updatedCount": 3
}
```
- Querying `/notifications/unread-count` immediately returns `{ "unreadCount": 0 }`.

---

### Scenario 5: User Isolation & Cross-User Security (FR-008 / SC-004)

**Objective**: Verify that User A cannot view, count, or mark User B's notification as read.

1. **User A Attempts to Mark User B's Notification as Read**:
   ```bash
   curl -X PATCH "http://localhost:3000/api/v1/notifications/<USER_B_NOTIFICATION_UUID>/read" \
     -H "Cookie: session_id=<USER_A_SESSION_COOKIE>"
   ```
   **Expected Response**:
   - HTTP 404 (or 403) error response. User B's notification remains `UNREAD`.

---

### Scenario 6: End-to-End Domain Event Generation

#### A. Student Event Triggers (User Story 3 / FR-009 through FR-015)
1. **Teacher Awards Points**: Teacher executes `POST /points/award`. Check student inbox: notification created with subject `"Points Awarded"`, teacher name, points awarded, and `originatingEntityType: "POINT_AWARD"`.
2. **Admin Adjusts Points**: Admin executes `POST /points/adjust`. Check student inbox: notification created with subject `"Point Balance Adjusted"`, adjustment amount, reason, and `originatingEntityType: "POINT_ADJUSTMENT"`.
3. **Reward Status Change**: Admin approves reward request (`PATCH /rewards/requests/:id/status` -> `PENDING_TO_RECEIVE`). Check student inbox: notification created with subject `"Reward Ready for Pickup"` and `originatingEntityType: "REWARD_REQUEST"`.
4. **Proposal Approved / Message**: Admin approves proposal (`PATCH /proposals/:id/status` -> `READY_TO_DO`) or sends message (`POST /proposals/:id/messages`). Check student inbox: notification created with `originatingEntityType: "TASK_PROPOSAL"` / `"PROPOSAL_MESSAGE"`.
5. **Activity Verification & Ban**: Admin reviews verification request (`PATCH /activities/verifications/:id/status`). Check student inbox: notification created with `originatingEntityType: "CHALLENGE_VERIFICATION"`. If 3rd rejection occurs, an `"ACTIVITY_BAN"` notification is also generated.

#### B. Administrator Actionable Review Alerts (User Story 4 / FR-016 through FR-019)
1. **Student Submits Reviewable Item**: Student requests approval-required reward, submits task proposal, posts proposal message, or submits verification.
2. **Admin Inbox Check**: Check inboxes of all active school administrators. Each administrator has received an unread notification with the student's name, item title, and deep-link entity ID.

#### C. Teacher Budget Allocation Alert (User Story 5 / FR-020)
1. **Admin Funds Teacher**: Admin executes `POST /points/fund-teacher`.
2. **Teacher Inbox Check**: Check the recipient teacher's inbox: unread notification created with subject `"Point Budget Allocated"`, allocated amount, and new available balance. Verify other teachers received no notification.

---

## Automated Test Execution

Execute the test suites to validate contract conformance, integration logic, and end-to-end flows:

```bash
cd backend

# Run notification contract conformance tests
npm run test -- test/contract/notifications.contract-spec.ts

# Run notification event integration tests
npm run test -- test/integration/notifications.integration-spec.ts

# Run full end-to-end test suite
npm run test:e2e
```
