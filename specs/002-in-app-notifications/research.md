# Research & Architectural Decisions: In-App Notification System

**Feature Branch**: `002-in-app-notifications` | **Date**: 2026-10-09 | **Status**: Completed

This document consolidates research, architectural evaluation, trade-off analysis, and developer-approved decisions for the In-App Notification System.

---

## 1. Internal Communication & Event Dispatch Architecture

### Decision
Adopt **NestJS In-Process Event Emitter (`@nestjs/event-emitter`)** with strongly typed domain events and post-commit event dispatch.

### Rationale
- **Decoupled Architecture**: Domain services (`RewardsService`, `ProposalsService`, `PointsService`, `ActivitiesService`) emit domain events without possessing direct references to `NotificationsService` or `NotificationsModule`.
- **Maintainability & Extensibility**: Adding new observers (e.g., real-time WebSocket gateways, audit listeners, metrics counters) requires zero modifications to existing domain business logic.
- **Transaction Safety**: Domain services dispatch events upon successful completion of database transactions, ensuring notifications are generated only for committed state transitions.

### Alternatives Considered
- **Direct Synchronous Service Calls**: Rejected because it introduces tight coupling between all domain services and the notification module, increasing circular dependency risks and complicating unit testing.
- **External Message Broker / Outbox Pattern (BullMQ / Redis Streams / RabbitMQ)**: Rejected as unnecessary architectural and operational complexity for the current single-instance school backend scope (~1,000–5,000 users). In-process event handling satisfies all latency and throughput requirements.

---

## 2. Multi-Administrator Alert Fan-Out Strategy

### Decision
Adopt **Fan-Out on Write** into the unified `notifications` table.

### Rationale
- **Independent Inboxes & Badges**: Each active school administrator possesses an independent record with individual `readStatus` (`UNREAD` / `READ`) and `readAt` timestamps. When Administrator A reads or marks an alert as read, Administrator B's unread badge count and inbox state remain untouched.
- **Uniform Data Model & Query Simplicity**: All users (students, teachers, admins) query and mutate notifications using identical indexed SQL queries without joins against broadcast/receipt tables.
- **Low Write Overhead**: Schools typically operate with a small number of administrators (2–10 active admins). Emitting notifications to all active admins via `prisma.notification.createMany` executes in a single bulk database insert (<5ms).

### Alternatives Considered
- **Fan-Out on Read (Broadcast Notification + Join Table)**: Rejected because it requires complex SQL `LEFT JOIN` queries with subselects for inbox pagination and unread counts, and creates divergent code paths between student/teacher notifications and admin alerts.

---

## 3. Notification Persistence & Historical Immutability

### Decision
Persist **pre-rendered static text** (`subject` and `body`) at creation time and enforce **permanent non-deletable records** without foreign key deletion cascade on originating entities.

### Rationale
- **Historical Fidelity & Audit Compliance**: If a reward, task proposal, activity, or user profile is renamed, updated, or removed in the future, the notification preserved in the recipient's inbox reflects the exact human-readable text and context present when the event transpired.
- **Referential Resilience**: The `originatingEntityId` is stored as a scalar UUID rather than a strictly enforced database foreign key constraint with cascade delete. If an originating entity is deleted, the notification record remains permanently viewable with its historical snapshot.
- **User Data Deletion Policy**: In alignment with FR-003 and school audit principles, no delete endpoints (`DELETE /notifications/:id`) are provided.

### Alternatives Considered
- **Dynamic Text Template Rendering on Query**: Rejected because template changes or referenced entity modifications (e.g., changing a reward's point price or deleting a proposal) would corrupt historical inbox displays and violate spec requirement FR-002.

---

## 4. API Endpoint Structure, Pagination & Read State Operations

### Decision
Implement RESTful endpoints under `/notifications` secured by `SessionAuthGuard` and strictly scoped to `req.user.id`.

### Endpoints
1. `GET /notifications`: Query inbox with `page` (default 1), `limit` (default 20, max 50), and `status` (`ALL`, `UNREAD`, `READ`).
2. `GET /notifications/unread-count`: Returns `{ unreadCount: number }`.
3. `PATCH /notifications/:id/read`: Marks a single notification as read (idempotent; returns updated notification). Returns 404/403 if the notification does not exist or belongs to another user.
4. `PATCH /notifications/read-all`: Marks all unread notifications for the user as read in a single query (`UPDATE ... WHERE recipient_id = $userId AND read_status = 'UNREAD'`; returns `{ updatedCount: number }`).

### Rationale
- **Deterministic Pagination**: Ordered by `createdAt DESC, id DESC` to eliminate pagination drift when notifications share identical timestamps.
- **Data Isolation & Security**: Every query enforces `where: { recipientId: req.user.id }` at the service layer, preventing any cross-user data exposure (FR-008, SC-004).
- **Atomic Bulk Updates**: `read-all` runs as a single atomic SQL update query, providing O(1) performance regardless of inbox size.

---

## 5. Originating Entity Types & Closed Enumeration

### Decision
Enforce a strict TypeScript/Prisma enumeration `OriginatingEntityType` with exactly the 9 defined trigger types:
1. `REWARD_REQUEST`
2. `TASK_PROPOSAL`
3. `PROPOSAL_MESSAGE`
4. `CHALLENGE_VERIFICATION`
5. `POINT_ALLOCATION`
6. `POINT_AWARD`
7. `POINT_ADJUSTMENT`
8. `ACTIVITY_BAN`
9. `ACTIVITY_UNBLOCK`

### Rationale
- Complies strictly with FR-021 and Clarification 2026-10-09.
- Guarantees predictable deep-link payload contracts for frontend client routing.
