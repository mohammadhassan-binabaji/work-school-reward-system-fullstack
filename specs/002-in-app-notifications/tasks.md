# Tasks: In-App Notification System

**Input**: Design documents from `/specs/002-in-app-notifications/` (`spec.md`, `plan.md`, `data-model.md`, `contracts/openapi.yaml`, `research.md`, `quickstart.md`) and requirements from `/docs/requirements/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Comprehensive contract, integration, and E2E test tasks are included per story in alignment with the test scenarios in `spec.md` and `quickstart.md`.

**Organization**: Tasks are grouped by phase and user story to enable independent implementation, testing, and delivery of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3], [US4], [US5])
- All task descriptions include exact file paths and quote data constraints verbatim.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependency management and root module setup for in-process event dispatch.

- [ ] T001 Install and configure `@nestjs/event-emitter` dependency in `backend/package.json`
- [ ] T002 Configure and register `EventEmitterModule.forRoot()` in root application module in `backend/src/app.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema extensions, Prisma migrations, typed domain event definitions, static notification formatters, and module skeleton that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Extend Prisma relational schema with `NotificationReadStatus` enum (`UNREAD`, `READ`), `OriginatingEntityType` enum (`REWARD_REQUEST`, `TASK_PROPOSAL`, `PROPOSAL_MESSAGE`, `CHALLENGE_VERIFICATION`, `POINT_ALLOCATION`, `POINT_AWARD`, `POINT_ADJUSTMENT`, `ACTIVITY_BAN`, `ACTIVITY_UNBLOCK`), `Notification` model (`id` UUID `@id @default(uuid())`, `recipientId` UUID `@map("recipient_id")`, `subject` VARCHAR(200) `@db.VarChar(200)`, `body` TEXT `@db.Text`, `readStatus` enum `@default(UNREAD) @map("read_status")`, `readAt` DateTime? `@map("read_at") @db.Timestamptz`, `originatingEntityType` enum `@map("originating_entity_type")`, `originatingEntityId` UUID `@map("originating_entity_id")`, `createdAt` DateTime `@default(now()) @map("created_at") @db.Timestamptz`) with composite indexes `@@index([recipientId, createdAt(sort: Desc), id(sort: Desc)])` and `@@index([recipientId, readStatus])`, and relation on `User` model (`notifications Notification[] @relation("UserNotifications")`) in `backend/prisma/schema.prisma`
- [ ] T004 Generate and execute Prisma migration `2_add_notifications` and regenerate Prisma client in `backend/prisma/migrations/2_add_notifications/migration.sql`
- [ ] T005 [P] Create strongly typed domain event classes for reward lifecycle (`RewardStatusChangedEvent`, `RewardRequiresApprovalEvent`) in `backend/src/modules/notifications/events/reward-events.ts`
- [ ] T006 [P] Create strongly typed domain event classes for task proposals and messaging (`ProposalStatusChangedEvent`, `ProposalMessageEvent`) in `backend/src/modules/notifications/events/proposal-events.ts`
- [ ] T007 [P] Create strongly typed domain event classes for points awards, adjustments, and teacher allocations (`PointAwardedEvent`, `PointAdjustedEvent`, `PointAllocatedEvent`) in `backend/src/modules/notifications/events/point-events.ts`
- [ ] T008 [P] Create strongly typed domain event classes for activity verifications and bans/unblocks (`VerificationReviewedEvent`, `VerificationSubmittedEvent`, `ActivityBanEvent`, `ActivityUnblockEvent`) in `backend/src/modules/notifications/events/activity-events.ts`
- [ ] T009 [P] Implement NotificationFormatter utility generating pre-rendered static `subject` (max 200 chars) and `body` strings for all 18 defined event templates (EVT-01 through EVT-18) in `backend/src/modules/notifications/utils/notification-formatter.ts`
- [ ] T010 Create base NotificationsModule skeleton declaring controller, service, and listener, and register `NotificationsModule` in `backend/src/modules/notifications/notifications.module.ts` and `backend/src/app.module.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Notification Inbox Retrieval & Unread Counter (Priority: P1) 🎯 MVP

**Goal**: Authenticated users across all roles (Student, Teacher, School Administrator) can query their personal notification inbox with status filtering (`ALL`, `UNREAD`, `READ`), deterministic sorting (`createdAt DESC, id DESC`), pagination (default 20, max 50), and retrieve their unread notification badge count, strictly isolated from other users.

**Independent Test**: Populate notifications in various read states across multiple user accounts; query `GET /api/v1/notifications` with default pagination and status filters, query `GET /api/v1/notifications/unread-count`, and verify each user sees only their own notifications and accurate unread count with zero cross-user data leakage.

### Tests for User Story 1 ⚠️

- [ ] T011 [P] [US1] Contract tests for inbox query and unread counter endpoints (`GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`) validating OpenAPI schemas, pagination defaults (20 items/page, max 50 items/page), and status enum validation in `backend/test/contract/notifications.contract-spec.ts`
- [ ] T012 [P] [US1] Integration tests for inbox retrieval, deterministic sorting (`createdAt DESC, id DESC`), status filtering (`ALL`, `UNREAD`, `READ`), unread badge count calculation, user isolation boundary enforcement (User A cannot view User B's notifications or count), and empty inbox handling in `backend/test/integration/notifications.integration-spec.ts`

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create validation DTOs for inbox queries (`GetNotificationsQueryDto` with `page` min 1 default 1, `limit` min 1 max 50 default 20, `status` enum `ALL | UNREAD | READ` default `ALL`), `NotificationResponseDto`, `PaginationMetaDto`, `PaginatedNotificationsDto`, and `UnreadCountResponseDto` in `backend/src/modules/notifications/dto/get-notifications-query.dto.ts`, `backend/src/modules/notifications/dto/notification-response.dto.ts`, `backend/src/modules/notifications/dto/paginated-notifications.dto.ts`, and `backend/src/modules/notifications/dto/unread-count-response.dto.ts`
- [ ] T014 [US1] Implement inbox retrieval (`getNotifications`) and unread count query (`getUnreadCount`) in `backend/src/modules/notifications/notifications.service.ts` enforcing `where: { recipientId: userId }`, status filtering, and deterministic ordering (`orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`)
- [ ] T015 [P] [US1] Implement `GET /notifications` and `GET /notifications/unread-count` controller endpoints protected with `SessionAuthGuard` and `@CurrentUser()` in `backend/src/modules/notifications/notifications.controller.ts`

**Checkpoint**: User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 2 - Marking Notifications as Read (Individual & Bulk) (Priority: P1)

**Goal**: Authenticated users can mark an individual notification as read (idempotently transitioning `UNREAD` to `READ` and recording `readAt = now()`) and mark all unread notifications as read across their inbox in a single global operation, decrementing their unread badge count with strict ownership enforcement.

**Independent Test**: Mark an unread notification as read, observe status transition and unread count decrement; re-mark the same notification and verify idempotent success with unchanged `readAt`; execute bulk mark-all-as-read and verify all unread items transition to `READ` and unread count becomes 0; verify User A cannot mark User B's notification as read (404/403 rejection).

### Tests for User Story 2 ⚠️

- [ ] T016 [P] [US2] Contract tests for mark-as-read endpoints (`PATCH /api/v1/notifications/:id/read`, `PATCH /api/v1/notifications/read-all`) in `backend/test/contract/notifications.contract-spec.ts`
- [ ] T017 [P] [US2] Integration tests for single mark-as-read transition, `readAt` timestamp assignment, unread count decrement, idempotent re-marking of already read notifications, atomic bulk mark-all-as-read update, and cross-user modification rejection (User A attempting to mark User B's notification returns 404) in `backend/test/integration/notifications.integration-spec.ts`

### Implementation for User Story 2

- [ ] T018 [P] [US2] Create DTO for bulk read response (`BulkReadResponseDto` with `updatedCount` non-negative integer) in `backend/src/modules/notifications/dto/bulk-read-response.dto.ts`
- [ ] T019 [US2] Implement `markAsRead(userId: string, notificationId: string)` (enforcing recipient ownership, transitioning `UNREAD` -> `READ`, setting `readAt = now()`, and idempotent handling for already `READ` items) and `markAllAsRead(userId: string)` (executing single atomic `updateMany` for `where: { recipientId: userId, readStatus: 'UNREAD' }`) in `backend/src/modules/notifications/notifications.service.ts`
- [ ] T020 [P] [US2] Implement `PATCH /notifications/:id/read` and `PATCH /notifications/read-all` controller endpoints in `backend/src/modules/notifications/notifications.controller.ts`

**Checkpoint**: User Stories 1 and 2 work together independently for complete inbox management.

---

## Phase 5: User Story 3 - Student Event Notifications (Priority: P1)

**Goal**: Automatically generate unread in-app notifications for students upon reward request status transitions (`PENDING_TO_RECEIVE`, `COMPLETED`, `DECLINED`), task proposal reviews and admin messages, teacher point awards, admin point adjustments, challenge/mission verification reviews, 3-rejection activity bans, and manual activity unblocks.

**Independent Test**: Trigger each of the 9 student-affecting domain events across Rewards, Proposals, Points, and Activities modules; verify an unread notification record is immediately created for the student with pre-rendered subject and body, accurate `originatingEntityType`, and `originatingEntityId` deep-link identifier.

### Tests for User Story 3 ⚠️

- [ ] T021 [P] [US3] Integration tests for student event notification generation: verify notifications created for reward request approvals (`PENDING_TO_RECEIVE`), completions (`COMPLETED`), declines (`DECLINED`), auto-approved reward creations, proposal status transitions (`READY_TO_DO`, `DECLINED`, `COMPLETED`), admin proposal messages, teacher point awards (`POINT_AWARD`), admin manual balance adjustments (`POINT_ADJUSTMENT`), activity verification acceptances/rejections (`CHALLENGE_VERIFICATION`), 3-rejection activity ban alerts (`ACTIVITY_BAN`), and admin unblock alerts (`ACTIVITY_UNBLOCK`) in `backend/test/integration/notifications.integration-spec.ts`

### Implementation for User Story 3

- [ ] T022 [US3] Implement student domain event handler methods in `NotificationsListener` for reward events (`RewardStatusChangedEvent`), proposal events (`ProposalStatusChangedEvent`, `ProposalMessageEvent`), point events (`PointAwardedEvent`, `PointAdjustedEvent`), and activity events (`VerificationReviewedEvent`, `ActivityBanEvent`, `ActivityUnblockEvent`) formatting static text via `NotificationFormatter` and persisting records via `prisma.notification.create` in `backend/src/modules/notifications/notifications.listener.ts`
- [ ] T023 [P] [US3] Dispatch `RewardStatusChangedEvent` from `RewardsService` on request status transitions (`PENDING_TO_RECEIVE`, `COMPLETED`, `DECLINED`, and immediate `PENDING_TO_RECEIVE` on auto-approved creation) in `backend/src/modules/rewards/rewards.service.ts`
- [ ] T024 [P] [US3] Dispatch `ProposalStatusChangedEvent` (on approval to `READY_TO_DO`, point updates, completion, or decline) and `ProposalMessageEvent` (when admin posts a message to a student proposal) from `ProposalsService` in `backend/src/modules/proposals/proposals.service.ts`
- [ ] T025 [P] [US3] Dispatch `PointAwardedEvent` (teacher award to student) and `PointAdjustedEvent` (admin balance adjustment) from `PointsService` in `backend/src/modules/points/points.service.ts`
- [ ] T026 [P] [US3] Dispatch `VerificationReviewedEvent` (acceptance/rejection), `ActivityBanEvent` (upon 3rd rejection trigger), and `ActivityUnblockEvent` (upon admin manual unblock) from `ActivitiesService` in `backend/src/modules/activities/activities.service.ts`

**Checkpoint**: All student-facing automated notification workflows are fully functional and verifiable.

---

## Phase 6: User Story 4 - Administrator Actionable Review Alerts (Priority: P2)

**Goal**: Automatically fan-out unread in-app review notifications to all active school administrators when students submit reward requests requiring approval, voluntary task proposals, messages on proposals, or activity verification requests.

**Independent Test**: Have a student submit each reviewable item; verify that every active school administrator receives a distinct unread notification with the student's name, item title, and deep-link entity ID, while deactivated administrators receive none, and one administrator reading their notification does not alter other administrators' inboxes.

### Tests for User Story 4 ⚠️

- [ ] T027 [P] [US4] Integration tests for multi-admin fan-out notification delivery: verify student reward request submissions requiring approval (`PENDING_TO_APPROVE`), task proposal submissions (`PENDING_TO_APPROVE`), student proposal messages, and activity verification submissions create independent unread notifications for all active administrators, exclude deactivated administrators, and maintain independent read statuses per administrator in `backend/test/integration/notifications.integration-spec.ts`

### Implementation for User Story 4

- [ ] T028 [US4] Implement multi-admin fan-out helper and event handlers in `NotificationsListener` querying all active administrators (`prisma.user.findMany({ where: { role: 'ADMIN', accountState: 'ACTIVE' } })`) and inserting records via `prisma.notification.createMany` for `RewardRequiresApprovalEvent`, proposal submission events, student proposal message events, and `VerificationSubmittedEvent` in `backend/src/modules/notifications/notifications.listener.ts`
- [ ] T029 [P] [US4] Dispatch `RewardRequiresApprovalEvent` from `RewardsService` when a student creates a reward request requiring approval (`PENDING_TO_APPROVE`) in `backend/src/modules/rewards/rewards.service.ts`
- [ ] T030 [P] [US4] Dispatch proposal submission event and student message event from `ProposalsService` in `backend/src/modules/proposals/proposals.service.ts`
- [ ] T031 [P] [US4] Dispatch `VerificationSubmittedEvent` from `ActivitiesService` when a student submits challenge or mission verification evidence in `backend/src/modules/activities/activities.service.ts`

**Checkpoint**: Multi-admin review alert broadcasting is fully operational.

---

## Phase 7: User Story 5 - Teacher Point Budget Allocation Alerts (Priority: P2)

**Goal**: Automatically generate an unread in-app notification exclusively for a teacher when an administrator allocates points from the system point pool to that teacher's point award budget.

**Independent Test**: Allocate points from the system point pool to a teacher's budget; verify an unread notification is generated exclusively for that teacher with the allocated amount and updated balance (`originatingEntityType: 'POINT_ALLOCATION'`), and confirm other teachers receive no notification.

### Tests for User Story 5 ⚠️

- [ ] T032 [P] [US5] Integration tests for teacher budget allocation notifications: verify transferring points from system pool to a teacher creates a notification exclusively in the target teacher's inbox with allocated amount and new balance, with zero notifications delivered to other teachers in `backend/test/integration/notifications.integration-spec.ts`

### Implementation for User Story 5

- [ ] T033 [US5] Implement `PointAllocatedEvent` handler in `NotificationsListener` creating an unread `POINT_ALLOCATION` notification for the recipient teacher in `backend/src/modules/notifications/notifications.listener.ts`
- [ ] T034 [US5] Dispatch `PointAllocatedEvent` from `PointsService` upon successful point allocation from system pool to teacher budget (`fundTeacherBudget`) in `backend/src/modules/points/points.service.ts`

**Checkpoint**: All user stories (US1 through US5) are implemented and functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: API documentation refinement, comprehensive end-to-end verification, error propagation auditing, and non-regression validation across the full backend suite.

- [ ] T035 [P] Add OpenAPI Swagger annotations (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiQuery`, `@ApiParam`) across `NotificationsController` and all notification DTOs in `backend/src/modules/notifications/`
- [ ] T036 Implement and execute full End-to-End Quickstart Validation test suite covering all 6 verification scenarios from `quickstart.md` in `backend/test/e2e/quickstart-validation.e2e-spec.ts`
- [ ] T037 [P] Audit notification error propagation, structured JSON logging, and correlation ID handling to ensure compliance with Constitution Principle VII (Error Handling & Observability) in `backend/src/modules/notifications/`
- [ ] T038 Execute complete backend test suite (`npm run test`, `npm run test:e2e`) and TypeScript build check (`npm run build`) to confirm zero regressions across all modules in `backend/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion (T001, T002) - BLOCKS all user stories.
- **User Story 1 (Phase 3 - MVP)**: Depends on Foundational phase completion (T003–T010). Delivers baseline inbox retrieval and unread counter.
- **User Story 2 (Phase 4)**: Depends on User Story 1 (Phase 3) for inbox retrieval context. Delivers single and bulk mark-as-read mutations.
- **User Story 3 (Phase 5)**: Depends on Foundational event classes (T005–T009) and listener skeleton (T010). Delivers automated student notifications across domain modules.
- **User Story 4 (Phase 6)**: Depends on Foundational event classes and listener skeleton (T010). Delivers multi-admin fan-out on student submissions.
- **User Story 5 (Phase 7)**: Depends on Foundational event classes and listener skeleton (T010). Delivers teacher budget allocation alerts.
- **Polish (Phase 8)**: Depends on all desired user story phases (Phases 3–7) being complete.

### User Story Dependencies

```
Phase 1: Setup (T001, T002)
   │
   ▼
Phase 2: Foundational (T003 - T010)
   ├───┬───────────────────────┬───────────────────────┐
   │   │                       │                       │
   ▼   ▼                       ▼                       ▼
Phase 3: US1 (Inbox & Count)  Phase 5: US3 (Students)  Phase 6: US4 (Admins)  Phase 7: US5 (Teachers)
   │                           │                       │                       │
   ▼                           │                       │                       │
Phase 4: US2 (Mark Read)       │                       │                       │
   │                           │                       │                       │
   └───┬───────────────────────┴───────────────────────┴───────────────────────┘
       │
       ▼
Phase 8: Polish & E2E Validation (T035 - T038)
```

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run sequentially or in parallel.
- **Phase 2**: Event definition tasks T005, T006, T007, T008, and formatter T009 can all be implemented in parallel once Prisma schema (T003, T004) is migrated.
- **Phase 3 (US1)**: Contract test (T011) and Integration test (T012) can run in parallel before implementation. DTOs (T013) and controller (T015) can be created in parallel.
- **Phase 4 (US2)**: Contract test (T016), Integration test (T017), and DTO (T018) can run in parallel.
- **Phase 5 (US3)**: Domain service dispatches across modules (T023 `rewards`, T024 `proposals`, T025 `points`, T026 `activities`) can all be implemented in parallel.
- **Phase 6 (US4)**: Domain service dispatches (T029 `rewards`, T030 `proposals`, T031 `activities`) can all be implemented in parallel.
- **Phase 8**: Swagger annotations (T035) and error/logging audit (T037) can run in parallel.

---

## Parallel Example: User Story 1 (MVP)

```bash
# Developer A: Implement DTOs and Controller interface
backend/src/modules/notifications/dto/get-notifications-query.dto.ts
backend/src/modules/notifications/dto/notification-response.dto.ts
backend/src/modules/notifications/dto/paginated-notifications.dto.ts
backend/src/modules/notifications/dto/unread-count-response.dto.ts
backend/src/modules/notifications/notifications.controller.ts

# Developer B: Implement Service logic and Database Queries
backend/src/modules/notifications/notifications.service.ts

# Developer C: Write Contract and Integration Tests
backend/test/contract/notifications.contract-spec.ts
backend/test/integration/notifications.integration-spec.ts
```

---

## Implementation Strategy & MVP Scope

- **MVP Scope**: **User Story 1 (Inbox Retrieval & Unread Counter)** + **User Story 2 (Marking as Read)** constitutes the minimum viable inbox product. It allows users to view, paginate, filter, and acknowledge notifications with full test coverage and data isolation.
- **Incremental Delivery**:
  1. *Increment 1 (MVP)*: Phases 1, 2, 3, 4 (Core Inbox, Unread Counter, Read Mutations).
  2. *Increment 2*: Phase 5 (Student Automated Event Notifications across all 4 domain services).
  3. *Increment 3*: Phase 6 & Phase 7 (Administrator Review Alerts Fan-Out & Teacher Budget Notifications).
  4. *Increment 4*: Phase 8 (E2E quickstart validation and full regression test execution).
