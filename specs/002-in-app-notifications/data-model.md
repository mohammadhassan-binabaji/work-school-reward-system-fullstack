# Data Model: In-App Notification System

**Feature Branch**: `002-in-app-notifications` | **Date**: 2026-10-09 | **Status**: Completed

This document defines the database entities, Prisma schema extensions, enumerations, relational constraints, and event trigger mapping tables for the In-App Notification System.

---

## 1. Prisma Schema Additions

```prisma
enum NotificationReadStatus {
  UNREAD
  READ
}

enum OriginatingEntityType {
  REWARD_REQUEST
  TASK_PROPOSAL
  PROPOSAL_MESSAGE
  CHALLENGE_VERIFICATION
  POINT_ALLOCATION
  POINT_AWARD
  POINT_ADJUSTMENT
  ACTIVITY_BAN
  ACTIVITY_UNBLOCK
}

model Notification {
  id                    String                 @id @default(uuid()) @db.Uuid
  recipientId           String                 @map("recipient_id") @db.Uuid
  recipient             User                   @relation("UserNotifications", fields: [recipientId], references: [id], onDelete: Cascade)
  subject               String                 @db.VarChar(200)
  body                  String                 @db.Text
  readStatus            NotificationReadStatus @default(UNREAD) @map("read_status")
  readAt                DateTime?              @map("read_at") @db.Timestamptz
  originatingEntityType OriginatingEntityType  @map("originating_entity_type")
  originatingEntityId   String                 @map("originating_entity_id") @db.Uuid
  createdAt             DateTime               @default(now()) @map("created_at") @db.Timestamptz

  @@index([recipientId, createdAt(sort: Desc), id(sort: Desc)])
  @@index([recipientId, readStatus])
  @@map("notifications")
}
```

### Relationship with User Model
Extend the existing `User` model in `prisma/schema.prisma` with:
```prisma
model User {
  // ... existing fields ...
  notifications Notification[] @relation("UserNotifications")
  // ...
}
```

---

## 2. Entity Attribute Definitions

| Field Name | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | `uuid()` | Primary key unique identifier for the notification record. |
| `recipientId` | UUID | No | - | Foreign key reference to the recipient `User.id`. Cascades on user deletion. |
| `subject` | VarChar(200) | No | - | Pre-rendered static subject title generated at event creation time. |
| `body` | Text | No | - | Pre-rendered static descriptive body text with event details. |
| `readStatus` | Enum (`NotificationReadStatus`) | No | `UNREAD` | Current read status: `UNREAD` or `READ`. |
| `readAt` | Timestamptz | Yes | `null` | Timestamp when the notification was marked as `READ`. Remains `null` while `UNREAD`. |
| `originatingEntityType` | Enum (`OriginatingEntityType`) | No | - | Closed enumeration of the originating domain entity type. |
| `originatingEntityId` | UUID | No | - | Unique identifier of the originating business entity (deep-link reference). |
| `createdAt` | Timestamptz | No | `now()` | Exact timestamp when the notification record was generated. |

---

## 3. Database Indexes & Performance Optimization

1. **Composite Pagination Index**:
   - `@@index([recipientId, createdAt(sort: Desc), id(sort: Desc)])`
   - Optimizes inbox queries: `WHERE recipient_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`.
2. **Unread Badge & Status Filter Index**:
   - `@@index([recipientId, readStatus])`
   - Optimizes unread count queries: `SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND read_status = 'UNREAD'` and status-filtered inbox queries.

---

## 4. State Transitions & Invariants

```
   [Event Triggered]
          │
          ▼
   ┌──────────────┐
   │    UNREAD    │ ◄── (Default state; readAt = null)
   └──────┬───────┘
          │
          │ User opens/marks notification OR marks all as read
          ▼
   ┌──────────────┐
   │     READ     │ ◄── (readAt = now(); immutable once set)
   └──────────────┘
```

### Invariants:
1. **Unidirectional Read State**: Once a notification is transitioned to `READ`, it cannot be reverted to `UNREAD`.
2. **Idempotent Mark-as-Read**: Marking an already `READ` notification as read leaves `readStatus` and original `readAt` unchanged.
3. **Audit Immutability**: Notification subject, body, originating entity reference, and creation timestamp cannot be modified after creation.
4. **Permanent Storage**: No delete endpoints or operations exist for notifications; records remain for the lifecycle of the user account.
5. **Data Isolation**: All read and write operations are strictly bounded by `recipientId == authenticatedUser.id`.

---

## 5. Domain Event Trigger & Notification Mapping Matrix

| Event Code | Trigger Condition | Recipient(s) | Originating Entity Type | Originating Entity ID | Static Subject Template | Static Message Body Template |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **EVT-01** | Student Reward Request status -> `PENDING_TO_RECEIVE` | Student | `REWARD_REQUEST` | `RewardRequest.id` | Reward Ready for Pickup | Your request for "{rewardName}" is approved and ready for pickup. |
| **EVT-02** | Student Reward Request status -> `COMPLETED` | Student | `REWARD_REQUEST` | `RewardRequest.id` | Reward Completed | Your request for "{rewardName}" has been handed over and completed. |
| **EVT-03** | Student Reward Request status -> `DECLINED` | Student | `REWARD_REQUEST` | `RewardRequest.id` | Reward Request Declined | Your request for "{rewardName}" was declined. Reason: {declineReason}. |
| **EVT-04** | Student Reward Request created requiring approval (`PENDING_TO_APPROVE`) | All Active Admins | `REWARD_REQUEST` | `RewardRequest.id` | New Reward Request Requires Approval | Student {studentName} requested reward "{rewardName}" ({priceAtRequest} points) requiring approval. |
| **EVT-05** | Student Task Proposal submitted (`PENDING_TO_APPROVE`) | All Active Admins | `TASK_PROPOSAL` | `StudentTaskProposal.id` | New Task Proposal Submitted | Student {studentName} submitted a new task proposal: "{proposalDescriptionSummary}". |
| **EVT-06** | Student Task Proposal approved (`READY_TO_DO`) or points updated | Student | `TASK_PROPOSAL` | `StudentTaskProposal.id` | Task Proposal Approved | Your task proposal has been approved with {assignedPointValue} points. |
| **EVT-07** | Student Task Proposal status -> `DECLINED` | Student | `TASK_PROPOSAL` | `StudentTaskProposal.id` | Task Proposal Declined | Your task proposal was declined. Reason: {declineReason}. |
| **EVT-08** | Student Task Proposal status -> `COMPLETED` | Student | `TASK_PROPOSAL` | `StudentTaskProposal.id` | Task Proposal Completed | Your task proposal has been marked completed and {assignedPointValue} points have been awarded. |
| **EVT-09** | Admin sends message on Task Proposal | Student | `PROPOSAL_MESSAGE` | `StudentTaskProposal.id` | New Message on Task Proposal | Admin {adminName} sent a message: "{messagePreview}". |
| **EVT-10** | Student sends message on Task Proposal | All Active Admins | `PROPOSAL_MESSAGE` | `StudentTaskProposal.id` | New Student Message on Proposal | Student {studentName} sent a message on proposal: "{messagePreview}". |
| **EVT-11** | Student submits Challenge / Mission Verification | All Active Admins | `CHALLENGE_VERIFICATION` | `VerificationRequest.id` | New Activity Verification Submitted | Student {studentName} submitted verification for {activityType} "{activityTitle}". |
| **EVT-12** | Admin accepts Activity Verification (`ACCEPTED`) | Student | `CHALLENGE_VERIFICATION` | `VerificationRequest.id` | Verification Approved | Your verification for {activityType} "{activityTitle}" was approved. You earned {pointValue} points! |
| **EVT-13** | Admin rejects Activity Verification (`REJECTED`) | Student | `CHALLENGE_VERIFICATION` | `VerificationRequest.id` | Verification Rejected | Your verification for {activityType} "{activityTitle}" was rejected. Reason: {rejectionReason}. |
| **EVT-14** | Student placed on 3-rejection activity ban | Student | `ACTIVITY_BAN` | `Activity.id` | Activity Submission Ban | You have received 3 rejections for "{activityTitle}". You are temporarily banned from submitting for this activity until {bannedUntilDate}. |
| **EVT-15** | Admin unblocks student from activity ban | Student | `ACTIVITY_UNBLOCK` | `Activity.id` | Activity Eligibility Restored | Your submission eligibility for activity "{activityTitle}" has been restored by an administrator. |
| **EVT-16** | Teacher awards positive points to student | Student | `POINT_AWARD` | `PointAuditLog.id` | Points Awarded | Teacher {teacherName} awarded you {amount} points for task "{taskName}". |
| **EVT-17** | Admin manually adjusts student point balance | Student | `POINT_ADJUSTMENT` | `PointAuditLog.id` | Point Balance Adjusted | An administrator adjusted your balance by {amount} points. Reason: {reason}. |
| **EVT-18** | Admin transfers points to Teacher budget | Teacher | `POINT_ALLOCATION` | `PointAuditLog.id` | Point Budget Allocated | An administrator allocated {amount} points to your award budget. Your new available balance is {newBalance} points. |
