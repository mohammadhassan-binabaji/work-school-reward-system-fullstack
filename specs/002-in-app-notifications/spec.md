# Feature Specification: In-App Notification System

**Feature Branch**: `002-in-app-notifications`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "for the existing nestjs backend i want to create a new feature : in-app notification system. base on requirements documentation in docs/requirements/ about notification mechanism. Use the following documents as the source of truth: docs/requirements/requirements.md, docs/requirements/user-stories.md, docs/requirements/business-rules.md, docs/requirements/data-requirements.md, docs/requirements/open-questions.md. The goal is to create a complete behavioral specification for the in-app notification mechanism scope of the existing system and backend. Do not implement anything. Do not make technology or framework decisions. Do not create an implementation plan. Preserve the business intent and requirements from the existing documentation while making the expected system behavior precise, testable, and unambiguous. The should specification should fit and follow the current nestjs backend."

## Clarifications

### Session 2026-10-09

- Q: What default page size and maximum page limit should the notification inbox pagination enforce? (FR-004) → A: Default 20 items per page, maximum 50 items per page.
- Q: Should the bulk mark-all-as-read operation apply globally to all unread notifications for the user, or support filtering by notification type? (FR-007) → A: Global operation marking all unread notifications for the user as read.
- Q: Should notification subject and body text be stored as static text generated at creation time, or dynamically constructed on query? (FR-002) → A: Persist pre-rendered static subject and body text at creation time.
- Q: What secondary sort order should the system apply to guarantee deterministic pagination when multiple notifications share the same creation timestamp? (FR-004) → A: Secondary sort by unique identifier descending (`id DESC`).
- Q: Should originating entity types be constrained to a strict closed enumeration matching the 9 defined event triggers? (FR-021) → A: Closed enumeration of the 9 defined entity types.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Notification Inbox Retrieval & Unread Counter (Priority: P1)

As an authenticated user (student, teacher, or school administrator), I need to view my personal in-app notifications, filter them by read status (`All`, `Unread`, `Read`), and inspect my unread badge count, so that I can monitor updates relevant to my activities without being exposed to any other user's private alerts.

**Why this priority**: Baseline inbox access and unread badge tracking are the essential consumption interfaces for all users across the school. Without this, no notifications can be viewed or acted upon.

**Independent Test**: Can be tested independently by populating notifications in different read states for multiple user accounts across all roles, querying inbox lists with status filters, fetching the unread count, and verifying that each user only sees their own alerts and counts.

**Acceptance Scenarios**:

1. **Given** an authenticated user with both read and unread notifications, **When** the user requests their notification inbox with no status filter (or `All`), **Then** the system returns a paginated list of all notifications addressed to that user (defaulting to 20 items per page, with a maximum allowable page limit of 50 items), ordered by creation timestamp descending with unique identifier descending as tie-breaker (`createdAt DESC, id DESC`).
2. **Given** an authenticated user with both read and unread notifications, **When** the user requests notifications filtered by `Unread`, **Then** the system returns only notifications in `Unread` status addressed to that user.
3. **Given** an authenticated user with both read and unread notifications, **When** the user requests notifications filtered by `Read`, **Then** the system returns only notifications in `Read` status addressed to that user.
4. **Given** an authenticated user with 4 unread and 6 read notifications, **When** the user requests their unread notification count, **Then** the system returns an aggregate count of exactly 4.
5. **Given** User A and User B, **When** User A queries their notification inbox or unread counter, **Then** the system returns only records addressed to User A, strictly excluding all notifications belonging to User B.
6. **Given** a newly registered user or a user with no notifications, **When** the user requests their inbox and unread counter, **Then** the system returns an empty list and an unread count of 0.

---

### User Story 2 - Marking Notifications as Read (Individual & Bulk) (Priority: P1)

As an authenticated user, I need to mark an individual notification as read when I open/inspect it and mark all my unread notifications as read with a single action, so that my unread count updates accurately and my inbox remains organized.

**Why this priority**: Immediate state transition from unread to read is necessary to keep notification badges and inbox state meaningful and actionable.

**Independent Test**: Can be tested by selecting an unread notification, marking it as read, observing its status transition and timestamp capture, verifying the unread count decrement, executing the mark-all-as-read action, and verifying all unread items transition to `Read` with unread count becoming zero.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an unread notification in their inbox, **When** the user marks that notification as read (or opens it), **Then** the system updates that notification's status from `Unread` to `Read`, records the current read timestamp, and decrements the user's unread notification count by 1.
2. **Given** an authenticated user with a notification already marked as `Read`, **When** the user attempts to mark that notification as read again, **Then** the operation succeeds idempotently without modifying the original read timestamp or altering the unread count.
3. **Given** an authenticated user with multiple unread notifications, **When** the user triggers the mark-all-as-read action, **Then** the system updates all unread notifications addressed to that user across their entire inbox to `Read` status, sets their read timestamp to the current time, and resets the user's unread notification count to 0.
4. **Given** an authenticated user with zero unread notifications, **When** the user triggers the mark-all-as-read action, **Then** the system completes successfully with no state change and an unread count of 0.
5. **Given** User A and User B, **When** User A attempts to mark User B's notification as read by identifier, **Then** the system rejects the operation with an authorization/access denial error and does not modify User B's notification.

---

### User Story 3 - Student Event Notifications (Priority: P1)

As a student, I need to receive immediate in-app notifications whenever my reward requests change state, my task proposals are reviewed or receive messages, points are awarded or adjusted, or my activity verifications are reviewed (including bans and unblocks), so that I stay informed about my achievements and actions.

**Why this priority**: Students are the primary subjects of the school reward economy; timely notifications close the feedback loop for points earned, spent, and requested.

**Independent Test**: Can be tested by triggering each student-affecting event in the system and verifying that an unread notification is created for the specific student with the correct subject, body, originating entity type, and originating entity identifier for client deep linking.

**Acceptance Scenarios**:

1. **Given** an active student reward request, **When** an administrator approves a request requiring approval (moving it to `Pending to Receive`), or hands over the reward (moving it to `Completed`), or declines the request (moving it to `Declined`), **Then** the system immediately generates an unread notification in the student's inbox specifying the reward name, the updated status label (`Pending to Receive`, `Completed`, or `Declined`), and links the notification to the reward request entity.
2. **Given** an active student who requests a reward that does not require approval, **When** the request enters `Pending to Receive` upon creation, **Then** the system generates an unread notification in the student's inbox confirming the request is ready for pickup.
3. **Given** a student task proposal in `Pending to Approve`, **When** an administrator approves the proposal (moving it to `Ready to Do` with an assigned point value), or updates the assigned point value, or declines the proposal (moving it to `Declined`), or marks the proposal `Completed` after task execution, **Then** the system immediately creates an unread notification in the student's inbox with the relevant status, point value, and links to the task proposal entity.
4. **Given** an active student task proposal, **When** an administrator sends a message within the proposal conversation, **Then** the system creates an unread notification in the student's inbox with the message sender reference, preview text, and links to the task proposal entity.
5. **Given** a student enrolled in a class, **When** a teacher awards positive points to the student for a predefined task, **Then** the system creates an unread notification in the student's inbox indicating the points awarded, the task name, the teacher's name, and links to the point activity record.
6. **Given** an enrolled student, **When** an administrator manually adjusts the student's point balance (adding or subtracting points), **Then** the system creates an unread notification in the student's inbox indicating the point adjustment amount, the administrative reason, and links to the point audit record.
7. **Given** a submitted challenge or mission verification request by a student, **When** an administrator approves the request (marking the activity completed and awarding points) or rejects the request (recording a rejection reason), **Then** the system creates an unread notification in the student's inbox indicating the review decision, activity title, awarded points or rejection reason, and links to the verification request entity.
8. **Given** a student who receives a third verification rejection for a challenge or mission, **When** the system applies the temporary submission ban, **Then** the system creates an unread notification in the student's inbox alerting them of the temporary activity submission ban.
9. **Given** a student currently banned from submitting verification requests for an activity, **When** an administrator manually unblocks the student from their profile, **Then** the system creates an unread notification in the student's inbox notifying them that their submission eligibility has been restored.

---

### User Story 4 - Administrator Actionable Review Alerts (Priority: P2)

As a school administrator, I need to receive in-app notifications whenever students submit items requiring administrative review (reward requests requiring approval, new task proposals, student messages on proposals, or challenge/mission verification requests), so that administrative tasks are promptly identified and processed.

**Why this priority**: Administrators oversee and approve transactions; timely actionable notifications prevent student submissions from stalling in pending review queues.

**Independent Test**: Can be tested by having a student submit each reviewable item, verifying that an unread notification is generated for school administrators with the student's name, submission title, and deep-link entity reference.

**Acceptance Scenarios**:

1. **Given** a student requesting a reward that requires approval, **When** the reward request is submitted into `Pending to Approve` status, **Then** the system generates an unread notification in the inboxes of active school administrators containing the student name, reward name, point price, and links to the reward request entity.
2. **Given** an enrolled student, **When** the student submits a voluntary task proposal in `Pending to Approve` status, **Then** the system generates an unread notification in the inboxes of active school administrators containing the student name, proposed task description summary, and links to the task proposal entity.
3. **Given** an active student task proposal, **When** the student sends a message within the proposal conversation, **Then** the system generates an unread notification in the inboxes of active school administrators containing the student name, message preview, and links to the task proposal entity.
4. **Given** an enrolled student, **When** the student submits a challenge or mission verification request with evidence, **Then** the system generates an unread notification in the inboxes of active school administrators containing the student name, activity title, activity type, and links to the verification request entity.

---

### User Story 5 - Teacher Point Budget Allocation Alerts (Priority: P2)

As a teacher, I need to receive an in-app notification whenever an administrator allocates points from the system point pool to my award budget, so that I immediately know I have points available to reward students.

**Why this priority**: Teachers can only award points when they have an available budget funded by administrators; prompt notification alerts them when their budget has been replenished.

**Independent Test**: Can be tested by having an administrator transfer points from the system pool to a teacher's account, and verifying that an unread notification is generated exclusively for that teacher with the transferred amount and updated available balance.

**Acceptance Scenarios**:

1. **Given** an active teacher and an administrator, **When** the administrator transfers points from the system-wide point pool to the teacher's point balance, **Then** the system creates an unread notification in that teacher's personal inbox indicating the allocated point amount, the new available balance, and links to the point transfer transaction.
2. **Given** Teacher A and Teacher B, **When** an administrator transfers points exclusively to Teacher A, **Then** a notification is created only in Teacher A's inbox, and Teacher B receives no notification.

---

### Edge Cases

- **Deactivated or Departed Users**: When a user account is deactivated or marked as departed, the system ceases generating new event notifications for that user. Existing notifications remain permanently stored in their historical inbox.
- **Multiple School Administrators**: When a student action triggers an administrative review alert, the notification is generated for all active school administrators so that any authorized administrator can act on it. When one administrator reviews the item, the notification in other administrators' inboxes remains in their personal inbox as an immutable record of the event.
- **Self-Triggered Actions**: When an administrator sends a message on a proposal, only the student receives a notification (the sending administrator does not receive a self-notification). Similarly, when a student sends a message, only administrators receive a notification.
- **Consecutive Duplicate Events**: If multiple rapid events occur (such as several consecutive messages on a task proposal or multiple point awards from different teachers), each event generates an independent, distinct notification record with its own unique identifier and timestamp.
- **Target Entity Deletion or Removal**: If a catalog reward, task proposal, or referenced entity is subsequently modified, renamed, or removed after a notification is generated, the notification text and entity reference remain intact and permanently viewable, reflecting the exact historical state at event time.
- **Immutable Inbox Preservation**: Users cannot delete individual or bulk notifications. Any attempt by a client to request notification deletion is rejected by the system.
- **Zero Unread Inboxes**: Requesting unread notifications when none exist returns an empty result set and count of 0 without error.
- **Cross-User Tampering**: Attempting to query, inspect, or mark as read another user's notification by guessing or supplying their notification identifier is strictly rejected with an authorization failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST maintain a private in-app notification inbox for every registered user account (administrators, teachers, and students).
- **FR-002**: The system MUST store for each notification: a unique identifier, recipient user reference, static pre-rendered subject title, static pre-rendered message body (persisted at event creation time to preserve immutable historical accuracy), read status (`Unread` or `Read`), creation timestamp, read timestamp (populated upon read, null when unread), originating entity type, and originating entity identifier.
- **FR-003**: The system MUST prevent users from deleting notifications; notification records MUST be permanently retained in the recipient's inbox.
- **FR-004**: The system MUST provide an endpoint/capability for authenticated users to retrieve their own notifications, with support for filtering by read status (`All`, `Unread`, `Read`), sorting in descending order of creation time with a deterministic secondary sort by unique identifier descending (`createdAt DESC, id DESC`), and pagination (defaulting to 20 items per page, with a maximum allowable limit of 50 items per page).
- **FR-005**: The system MUST provide an endpoint/capability for authenticated users to retrieve their current total count of unread notifications.
- **FR-006**: The system MUST provide an endpoint/capability for authenticated users to mark a specific notification addressed to them as `Read`, recording the read timestamp.
- **FR-007**: The system MUST provide an endpoint/capability for authenticated users to mark all of their unread notifications as `Read` in a single global operation across their entire inbox, setting the read timestamp to the current time for all affected records.
- **FR-008**: The system MUST enforce strict user data isolation: a user MUST NOT be able to view, list, count, or modify notifications belonging to any other user.
- **FR-009**: The system MUST generate an unread in-app notification for a student whenever the student's reward request transitions to `Pending to Receive`, `Completed`, or `Declined`.
- **FR-010**: The system MUST generate an unread in-app notification for a student whenever the student's task proposal transitions to `Ready to Do` (with assigned points), has its assigned points modified, transitions to `Completed`, or transitions to `Declined`.
- **FR-011**: The system MUST generate an unread in-app notification for a student whenever an administrator posts a message within the student's task proposal.
- **FR-012**: The system MUST generate an unread in-app notification for a student whenever a teacher awards points to the student, specifying the points awarded, task name, and teacher name.
- **FR-013**: The system MUST generate an unread in-app notification for a student whenever an administrator manually adds or subtracts points from the student's balance, specifying the adjustment amount and reason.
- **FR-014**: The system MUST generate an unread in-app notification for a student whenever an administrator accepts or rejects the student's challenge or mission verification request.
- **FR-015**: The system MUST generate an unread in-app notification for a student whenever the student is placed on a temporary activity submission ban following three rejected verifications, or when an administrator manually unblocks the student for an activity.
- **FR-016**: The system MUST generate an unread in-app notification for active school administrators whenever a student submits a reward request that requires administrator approval.
- **FR-017**: The system MUST generate an unread in-app notification for active school administrators whenever a student submits a new task proposal in `Pending to Approve` status.
- **FR-018**: The system MUST generate an unread in-app notification for active school administrators whenever a student sends a message within a task proposal.
- **FR-019**: The system MUST generate an unread in-app notification for active school administrators whenever a student submits a challenge or mission verification request.
- **FR-020**: The system MUST generate an unread in-app notification for a teacher whenever an administrator allocates points from the system point pool to that teacher's point balance, specifying the allocated point amount and resulting balance.
- **FR-021**: The system MUST preserve originating entity type and entity identifier on every generated notification to support client application deep linking to the related subject item, with originating entity type strictly constrained to the closed enumeration: `REWARD_REQUEST`, `TASK_PROPOSAL`, `PROPOSAL_MESSAGE`, `CHALLENGE_VERIFICATION`, `POINT_ALLOCATION`, `POINT_AWARD`, `POINT_ADJUSTMENT`, `ACTIVITY_BAN`, `ACTIVITY_UNBLOCK`.
- **FR-022**: The system MUST NOT deliver external notifications (such as SMS, email, or third-party push) as part of this in-app notification feature.

### Key Entities

- **Notification**:
  - Represents a single in-app message delivered to a specific user's inbox.
  - Attributes:
    - Unique identifier
    - Recipient user (reference to the recipient user account)
    - Subject (concise static summary title rendered at creation time, e.g., "Points Awarded", "Reward Approved", "New Proposal Message")
    - Message body (static human-readable descriptive text of the event rendered at creation time)
    - Read status (`Unread` or `Read`)
    - Creation date and time
    - Read date and time (null when unread, populated when marked read)
    - Originating entity type (strict closed enumeration: `REWARD_REQUEST`, `TASK_PROPOSAL`, `PROPOSAL_MESSAGE`, `CHALLENGE_VERIFICATION`, `POINT_ALLOCATION`, `POINT_AWARD`, `POINT_ADJUSTMENT`, `ACTIVITY_BAN`, `ACTIVITY_UNBLOCK`)
    - Originating entity identifier (unique identifier of the referenced business entity)
  - Relationships:
    - Belongs to exactly one Recipient User.
    - References an originating system entity (reward request, task proposal, activity verification, point audit log, or user profile).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of defined system trigger events (reward status changes, proposal status updates and messages, point awards and adjustments, verification reviews, activity bans/unblocks, administrative review submissions, and teacher budget transfers) result in immediate generation of unread in-app notifications in the correct recipients' inboxes.
- **SC-002**: 100% of generated notifications include accurate originating entity type and originating entity identifier attributes, allowing client applications to resolve direct deep links to the affected items.
- **SC-003**: Marking a notification as read or executing mark-all-as-read updates the user's unread notification count badge immediately and with 100% accuracy.
- **SC-004**: 100% of notification listing, counting, and state-change requests strictly enforce recipient user boundaries, with zero unauthorized access or data exposure across user accounts.
- **SC-005**: Mark-all-as-read executes successfully as a single user operation, transitioning all unread notifications to read status regardless of inbox size.
- **SC-006**: Notification history remains 100% permanent with zero accidental deletions, preserving complete auditability of user alerts over the lifetime of the user account.

## Assumptions

- **Delivery Mechanism**: Notifications are strictly in-app and persisted in the application database; external communication channels (SMS, email, webhooks, mobile OS push services) are explicitly excluded as confirmed in `docs/requirements/requirements.md`.
- **Real-Time Transport**: In-app notifications are stored persistently in the recipient's inbox and accessible via API query endpoints (with badge unread counts); any real-time client transport (e.g., WebSocket/SSE push) can layer atop this persistent storage contract without altering business semantics.
- **Recipient Scope for Administrator Alerts**: Student actions requiring review are broadcast to all active school administrators, allowing any available administrator to view the alert and act upon the submission.
- **Ordering & Pagination**: Inbox retrieval defaults to reverse chronological order with unique identifier tie-breaker (`createdAt DESC, id DESC`), supporting standard pagination defaulting to 20 items per page up to a maximum limit of 50 items per page to maintain responsiveness for long-term user inboxes.
- **Permanence**: In alignment with the system's strict audit and compliance design principles, notifications are non-deletable by users and are retained permanently for display and history.
