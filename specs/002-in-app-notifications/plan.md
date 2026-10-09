# Implementation Plan: In-App Notification System

**Branch**: `002-in-app-notifications` | **Date**: 2026-10-09 | **Spec**: [specs/002-in-app-notifications/spec.md](spec.md)

**Input**: Feature specification from `/specs/002-in-app-notifications/spec.md` and requirements from `/docs/requirements/`

---

## Summary

Build the In-App Notification System for the Student Reward System backend using a decoupled event-driven architecture powered by `@nestjs/event-emitter`. The system provides persistent in-app notifications for Students, Teachers, and School Administrators across 9 key business trigger categories (reward request lifecycles, task proposals and messages, activity verifications and temporary submission bans/unblocks, teacher point allocations, teacher point awards, and manual point adjustments). It implements an immutable, pre-rendered inbox model, deterministic pagination (`createdAt DESC, id DESC`), unread badge tracking, individual and bulk mark-as-read transitions, and strict cross-user data isolation.

---

## Technical Context

- **Language/Version**: TypeScript 5.x / Node.js 20+ LTS
- **Primary Dependencies**: NestJS v10+ (`@nestjs/core`, `@nestjs/common`, `@nestjs/swagger`, `@nestjs/event-emitter`), Prisma ORM v5+, `class-validator`, `class-transformer`
- **Storage**:
  - **Relational DB**: PostgreSQL 16 (`notifications` table with composite indexes on `[recipient_id, created_at DESC, id DESC]` and `[recipient_id, read_status]`)
- **Event Architecture**:
  - In-process typed event emitter (`@nestjs/event-emitter`) with post-commit event dispatch from domain services (`RewardsService`, `ProposalsService`, `PointsService`, `ActivitiesService`)
  - Multi-admin alert fan-out on write (`prisma.notification.createMany`) to all active administrator user accounts
- **Testing**: Jest (`ts-jest`), Supertest (contract conformance tests, integration tests for domain event listeners, end-to-end user lifecycle tests)
- **Target Platform**: Linux container (Docker) / Node.js runtime
- **Project Type**: RESTful Web Service Module (Modular Monolith)
- **Performance Goals**: $< 50\text{ms}$ p95 for inbox queries and unread count queries; $< 100\text{ms}$ for bulk mark-all-as-read and multi-admin fan-out writes
- **Constraints**:
  - Pre-render and persist static `subject` and `body` text at event creation time to guarantee historical accuracy
  - Immutable inbox history (no delete operations or cascade deletion on referenced domain entities)
  - Strict data isolation: queries and mutations strictly scoped to `req.user.id`
  - Pagination limits: default 20 items/page, maximum 50 items/page
  - Closed enumeration of 9 originating entity types (`REWARD_REQUEST`, `TASK_PROPOSAL`, `PROPOSAL_MESSAGE`, `CHALLENGE_VERIFICATION`, `POINT_ALLOCATION`, `POINT_AWARD`, `POINT_ADJUSTMENT`, `ACTIVITY_BAN`, `ACTIVITY_UNBLOCK`)
- **Scale/Scope**: Single school scope (~1,000–5,000 active users, ~100,000 notification records/year)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evaluation & Evidence |
| :--- | :--- | :--- |
| **I. Requirements & Specification First** | **PASS** | Plan strictly implements FR-001 through FR-022 and User Stories 1–5 from `spec.md` without modifying business intent. |
| **II. Backend-First Delivery** | **PASS** | Fully decoupled backend implementation with OpenAPI 3.0 contract (`contracts/openapi.yaml`) and executable verification scenarios (`quickstart.md`). |
| **III. Modular Architecture & Separation of Concerns** | **PASS** | Dedicated `NotificationsModule` with clear separation of HTTP controller, service layer, event listener, and formatting utilities; decoupled from domain modules via `@nestjs/event-emitter`. |
| **IV. API & Data Contract Discipline** | **PASS** | Fully defined REST API in `contracts/openapi.yaml` and Prisma database model in `data-model.md` with composite performance indexes. |
| **V. Security & Input Validation** | **PASS** | Endpoints protected with `SessionAuthGuard`, strict `req.user.id` scoping to prevent cross-user data tampering (FR-008, SC-004), and `class-validator` DTOs. |
| **VI. Testability & Verification** | **PASS** | Test strategy includes contract tests (`notifications.contract-spec.ts`), integration event tests (`notifications.integration-spec.ts`), and E2E validation scenarios. |
| **VII. Error Handling & Observability** | **PASS** | Preserves semantic error codes via `GlobalExceptionFilter`, structured logging on event handling and notification creation, and `X-Correlation-Id` propagation. |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-in-app-notifications/
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
│   ├── schema.prisma                       # Notification model, enums & user relation
│   └── migrations/                         # SQL migration for notifications table
├── src/
│   ├── app.module.ts                       # Register EventEmitterModule and NotificationsModule
│   ├── modules/
│   │   ├── notifications/                  # NEW: In-App Notification Module
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts # GET /notifications, GET /unread-count, PATCH /:id/read, PATCH /read-all
│   │   │   ├── notifications.service.ts    # Inbox retrieval, unread count, read mutations
│   │   │   ├── notifications.listener.ts   # Event listener handling all domain events & admin fan-out
│   │   │   ├── dto/                        # Query params, pagination, read response DTOs
│   │   │   │   ├── get-notifications-query.dto.ts
│   │   │   │   ├── notification-response.dto.ts
│   │   │   │   ├── paginated-notifications.dto.ts
│   │   │   │   └── unread-count-response.dto.ts
│   │   │   ├── events/                     # Strongly typed domain event classes
│   │   │   │   ├── reward-events.ts
│   │   │   │   ├── proposal-events.ts
│   │   │   │   ├── point-events.ts
│   │   │   │   └── activity-events.ts
│   │   │   └── utils/
│   │   │       └── notification-formatter.ts # Pre-rendered static subject & body text templates
│   │   ├── points/                         # Emit PointAwardedEvent, PointAdjustedEvent, PointAllocatedEvent
│   │   ├── rewards/                        # Emit RewardStatusChangedEvent, RewardRequiresApprovalEvent
│   │   ├── proposals/                      # Emit ProposalStatusChangedEvent, ProposalMessageEvent
│   │   └── activities/                     # Emit VerificationReviewedEvent, ActivityBanEvent, ActivityUnblockEvent
├── test/
│   ├── contract/
│   │   └── notifications.contract-spec.ts  # OpenAPI endpoint contract validation
│   ├── integration/
│   │   └── notifications.integration-spec.ts # Domain event dispatch & multi-admin fan-out tests
│   └── e2e/
│       └── quickstart-validation.e2e-spec.ts # End-to-end user scenario validation
```

**Structure Decision**: Integrated within the existing **Modular Monolith** under `backend/src/modules/notifications/`. Domain events decouple notification generation from existing modules (`rewards`, `proposals`, `points`, `activities`).

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | Standard NestJS modular layered architecture with `@nestjs/event-emitter` is utilized with zero unjustified complexity. | N/A |

