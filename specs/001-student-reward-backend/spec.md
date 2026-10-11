# Feature Specification: Student Reward System Backend

**Feature Branch**: `001-student-reward-backend`

**Created**: 2026-09-19

**Status**: Draft

**Input**: User description: "Build the backend of the existing system based on the existing requirements documentation in docs/requirements/. Use the following documents as the source of truth: docs/requirements/requirements.md, docs/requirements/user-stories.md, docs/requirements/business-rules.md, docs/requirements/data-requirements.md, docs/requirements/open-questions.md. The goal is to create a complete behavioral specification for the backend scope of the existing system. Do not implement anything. Do not make technology or framework decisions. Do not create an implementation plan. Preserve the business intent and requirements from the existing documentation while making the expected system behavior precise, testable, and unambiguous. The backend specification should cover the complete currently defined backend scope rather than a single small feature."

## Clarifications

### Session 2026-09-19
- Q: What evidence formats should students be allowed to submit when requesting verification for a challenge or mission? (FR-088) → A: Text description with direct file or image upload attachments (Option B).
- Q: Can administrators edit non-point fields (such as title, description, and completion limit) of an existing challenge or mission, or must the activity be recreated to change any field? (FR-036) → A: Allow editing title, description, and completion limit, while point value remains strictly immutable (Option A).
- Q: Should catalog rewards support image media (such as an image URL or image attachment) in addition to their name and text description? (FR-085) → A: Optional image (URL or image file reference) alongside name and description (Option A).
- Q: Should point-flow reports be generated strictly on-demand using runtime filter criteria, or should the backend also persist named saved filter templates? (FR-069) → A: On-demand parameterized report queries only (Option A).
- Q: Should classes and subjects support additional metadata attributes (such as academic year, grade level, or description) beyond their name or label? (FR-079, FR-080) → A: Name/label with optional grade level and description (Option A).
- Q: How should the temporary submission ban duration for 3 challenge/mission verification rejections be configured? (FR-042) → A: Dynamic and configurable via an environment variable (`ACTIVITY_BAN_DURATION_DAYS`) with a default value of 30 calendar days.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Account Provisioning & Role-Based Access Control (Priority: P1)

As a school administrator, I need to provision user accounts (administrators, teachers, and students) identified by a 10-digit national ID and password, and authenticate users so that each actor can access only their role-authorized capabilities.

**Why this priority**: Authentication and access control are the foundational security prerequisites for all subsequent system interactions and data separation.

**Independent Test**: Can be tested independently by provisioning initial and subsequent user accounts across all three roles (Administrator, Teacher, Student), attempting logins with valid/invalid credentials, and verifying that role-based permissions strictly allow authorized actions and reject unauthorized operations.

**Acceptance Scenarios**:

1. **Given** a new installation with no users, **When** the first school administrator is manually provisioned with a 10-digit national ID, first name, last name, username, and password, **Then** the administrator can successfully authenticate using that national ID and password.
2. **Given** an authenticated school administrator, **When** the administrator creates an account for a new teacher or student with a unique 10-digit national ID, first name, last name, username, and password, **Then** the user account is created in an active state and the user can authenticate with those credentials.
3. **Given** an existing account, **When** an authentication attempt is made with an incorrect password or non-existent 10-digit national ID, **Then** the backend rejects the authentication attempt without leaking stored credentials or distinguishing whether the ID or password was incorrect.
4. **Given** an authenticated student or teacher, **When** the user attempts an administrator-only backend operation (such as creating a class or adjusting another user's balance), **Then** the backend rejects the request with an authorization failure.

---

### User Story 2 - Academic Structure & Assignment Management (Priority: P1)

As a school administrator, I need to create classes, assign students exclusively to a single class, and assign teachers to classes by subject, preserving point balances and active requests across class transitions and handling departures or deactivations appropriately.

**Why this priority**: Class and subject structures establish the organizational boundaries for teacher award eligibility, student class rankings, and teacher reporting.

**Independent Test**: Can be tested by creating classes and subjects, assigning students and teachers, updating class assignments, deactivating teachers, and verifying that membership rules, point balances, active requests, and award permissions behave exactly as specified.

**Acceptance Scenarios**:

1. **Given** an active class, **When** an administrator assigns a student to that class, **Then** the student is associated with that class and cannot simultaneously belong to any other class.
2. **Given** a student enrolled in Class A with an existing point balance and active reward requests, **When** an administrator reassigns the student to Class B, **Then** the student's point balance, active reward requests, and historical records remain intact and unchanged.
3. **Given** an enrolled student with an active balance and active reward requests, **When** the student is marked as departed/leaving the school, **Then** the backend removes the student's point balance, removes the student's active reward requests, and excludes the student from active rankings.
4. **Given** an active teacher assigned to a class for a specific subject, **When** the teacher is deactivated, **Then** the backend preserves the teacher's point balance, class assignments, and subject relationships, but prevents the teacher from performing any system actions.
5. **Given** an active teacher assigned to a class, **When** the teacher is removed from that specific class assignment, **Then** the assignment is removed while the teacher's point balance remains unchanged.
6. **Given** an active teacher, **When** the teacher is marked as departed/leaving the school, **Then** the backend removes the teacher's point balance, class assignments, and teacher-class-subject relationships.

---

### User Story 3 - Point Allocation & Teacher Awarding Workflow (Priority: P1)

As a school administrator and teacher, I need administrators to fund teacher award balances from the system point pool and define task-based award options, so that teachers can award positive points from their available balance to students in their assigned classes without exceeding their budget.

**Why this priority**: Point allocation and teacher awards form the core transactional mechanic of the student reward economy.

**Independent Test**: Can be tested by funding a teacher's balance from the system pool, defining point transfer tasks with discrete options, executing positive point awards to eligible students, verifying balance decrements and audit records, and confirming that over-budget awards or cross-class ineligible awards are blocked.

**Acceptance Scenarios**:

1. **Given** an administrator and an active system point pool, **When** the administrator transfers points to an active teacher, **Then** the teacher's award budget increases by that amount, the system pool decreases accordingly, and an immutable audit record is created.
2. **Given** an administrator, **When** the administrator defines a point transfer task (e.g., "Doing Homework") with predefined point options (e.g., 5, 10, 15 points), **Then** the task and its point options become available for teacher point awards.
3. **Given** a teacher with an available balance of 20 points assigned to teach Math in Class 7A, and a student in Class 7A, **When** the teacher awards 10 points to the student by selecting the predefined task and option, **Then** the student's current point balance increases by 10, the teacher's available balance decreases to 10, the student's highest balance is updated if exceeded, and an immutable audit record is created.
4. **Given** a teacher with an available balance of 5 points, **When** the teacher attempts to award 10 points to a student, **Then** the backend rejects the transaction due to insufficient award budget and neither balance changes.
5. **Given** a teacher not assigned to Class 7B, **When** the teacher attempts to award points to a student in Class 7B, **Then** the backend rejects the transaction due to lack of class assignment eligibility.
6. **Given** a teacher attempting to award points, **When** the teacher supplies a custom task name or a custom point amount not defined in the task configuration, **Then** the backend rejects the request.
7. **Given** an administrator, **When** the administrator directly adjusts a student's balance by adding or subtracting points, **Then** the student's balance updates accordingly, highest balance updates if applicable, and an immutable audit record is created.

---

### User Story 4 - Reward Catalog Management & Redemption Lifecycle (Priority: P2)

As a student and school administrator, I need students to request catalog rewards using their earned points (reserving points immediately), and administrators to manage catalog items and process reward requests through approval, delivery, decline, or removal workflows.

**Why this priority**: Reward redemption completes the economic value loop for students who have earned points.

**Independent Test**: Can be tested by creating approval-required and non-approval rewards, submitting student reward requests, validating immediate point reservation and inventory deductions, transitioning statuses (`Pending to Approve`, `Pending to Receive`, `Completed`, `Declined`), and verifying point returns on declines or catalog item removals.

**Acceptance Scenarios**:

1. **Given** an administrator creating a reward that does not require approval, **When** the reward is created with a fixed price and finite inventory quantity, **Then** it becomes available in the catalog and maintains its inventory limit.
2. **Given** an administrator creating a reward that requires approval, **When** the reward is created with a fixed price and marked as approval required, **Then** it is cataloged with no inventory limit.
3. **Given** an existing reward, **When** an administrator attempts to change its price, **Then** the backend rejects the modification; the administrator must remove the old reward and create a new reward to apply a different price.
4. **Given** an active reward not requiring approval with available inventory of 3 and price of 50 points, and a student with 60 points, **When** the student requests the reward, **Then** the backend immediately deducts 50 points into reserved points, decrements available inventory to 2, sets the request status to `Pending to Receive` (status color: blue), and logs the event.
5. **Given** an active reward not requiring approval with inventory 0, **When** a student attempts to request the reward, **Then** the backend rejects the request due to zero inventory.
6. **Given** an active reward requiring approval with price of 100 points, and a student with 120 points, **When** the student requests the reward, **Then** the backend immediately reserves 100 points, sets the request status to `Pending to Approve` (status color: blue), and logs the request.
7. **Given** a reward request in `Pending to Approve` status, **When** an administrator approves the request, **Then** the request status transitions to `Pending to Receive` (status color: blue).
8. **Given** a reward request in `Pending to Approve` status, **When** an administrator declines the request, **Then** the reserved points are immediately returned to the student's current point balance, the request status transitions to `Declined` (status color: red), and the request closes.
9. **Given** a reward request in `Pending to Receive` status, **When** an administrator marks the reward as received after physical handover, **Then** the request status transitions to `Completed` (status color: green), the reserved points are finalized/cleared, and the request closes.
10. **Given** active reward requests in `Pending to Approve` or `Pending to Receive` for a reward, **When** an administrator removes that reward from the catalog, **Then** all active requests for that reward are closed, their reserved points are returned to the respective students' balances, and audit records are created.
11. **Given** an active reward request at any stage, **When** a student attempts to cancel the request, **Then** the backend rejects the cancellation request.
12. **Given** a student who already has a reward request in `Pending to Approve` or `Pending to Receive` status for a specific reward, **When** the student attempts to request the same reward again, **Then** the backend rejects the request with a `409 Conflict` error and error code `DUPLICATE_PENDING_REQUEST`, and no points are deducted.

---

### User Story 5 - Challenges, Missions & Submission Abuse Prevention (Priority: P2)

As a school administrator, and student, I need administrators to create fixed-value challenges and missions with per-student completion limits, administrators to award points for completions, students to submit verification requests, and the system to enforce temporary submission bans after repeated rejections while allowing administrative overrides.

**Why this priority**: Challenges and missions provide engagement pathways beyond routine classroom tasks, requiring verified completion controls and abuse prevention.

**Independent Test**: Can be tested by creating challenges and missions, submitting verification requests up to the completion limit, validating awards upon administrator verification, testing rejection counters and the 3-rejection ban trigger, and executing administrative unban actions.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** the administrator creates a challenge or mission with a fixed point value and a maximum per-student completion limit, **Then** the activity is created and its point value cannot be modified thereafter.
2. **Given** an active challenge or mission, **When** a student submits a verification request with a text description and attached file or image evidence, **Then** the request is recorded in pending review state for administrative verification.
3. **Given** a pending verification request, **When** an administrator accepts the submission, **Then** the backend awards the activity's fixed point value to the student, increments the student's completion count for that activity, updates the student's highest balance if exceeded, and records the completion in immutable audit history.
4. **Given** a student who has reached the configured completion limit for a challenge or mission, **When** the student attempts to submit another verification request for that activity, **Then** the backend rejects the submission as the activity is marked done for that student.
5. **Given** a student with 2 previous rejections for a specific challenge or mission, **When** an administrator rejects a 3rd verification request for the same activity, **Then** the backend records the rejection and places a temporary submission ban (configurable via `ACTIVITY_BAN_DURATION_DAYS`, defaulting to 30 calendar days) on that student for that specific activity.
6. **Given** a student under an active submission ban for an activity, **When** the student attempts to submit a verification request for that activity, **Then** the backend rejects the submission due to the active ban.
7. **Given** a student under an active submission ban for an activity, **When** an administrator unbans/unblocks the student via the administrator profile/details interface, **Then** the ban is cleared and the student is immediately permitted to submit verification requests up to the remaining completion limit.

---

### User Story 6 - Student Voluntary Task Proposals & In-Request Messaging (Priority: P3)

As a student and school administrator, I need students to submit voluntary task proposals, view and list their own open and historical task proposals, and exchange messages with administrators within the proposal, and administrators to view, filter, approve, price, adjust points, verify completion, or decline proposals, while allowing students to cancel only while in `Ready to Do`.

**Why this priority**: Student task proposals encourage voluntary student initiative while maintaining strict administrator review, pricing control, transparency for proposing students, and private communication.

**Independent Test**: Can be tested by submitting proposals, querying/listing proposals as the submitting student, verifying that students can only see their own proposals and not those of other students, exchanging messages between student and admin, transitioning across proposal states (`Pending to Approve` -> `Ready to Do` -> `Completed` / `Declined` / `Canceled`), adjusting point amounts prior to completion, verifying point award on completion, and ensuring teachers are strictly isolated from proposal data.

**Acceptance Scenarios**:

1. **Given** an enrolled student, **When** the student submits a task proposal with a proposed description, **Then** the proposal is created in `Pending to Approve` status.
2. **Given** an authenticated student who has submitted task proposals in various states (`Pending to Approve`, `Ready to Do`, `Completed`, `Declined`, `Canceled`), **When** the student queries/lists their task proposals, **Then** the backend returns all task proposals submitted by that student with their status, assigned point value, description, and message thread history.
3. **Given** an authenticated student, **When** the student attempts to view, query, or access a task proposal submitted by another student, **Then** the backend rejects the request or excludes other students' proposals to prevent data leakage.
4. **Given** a proposal in `Pending to Approve`, **When** an administrator declines the proposal, **Then** the status transitions to `Declined` and the proposal closes.
5. **Given** a proposal in `Pending to Approve`, **When** an administrator approves the proposal and assigns a positive point value, **Then** the status transitions to `Ready to Do`, the assigned point value is stored, and the value is visible to the student.
6. **Given** a proposal in `Ready to Do` status, **When** an administrator updates the assigned point value, **Then** the proposal's point value is updated and displayed to the student.
7. **Given** a proposal in `Ready to Do` status, **When** the student cancels the proposal, **Then** the status transitions to `Canceled` and the proposal closes.
8. **Given** a proposal in `Pending to Approve` or `Completed`, **When** a student attempts to cancel the proposal, **Then** the backend rejects the cancellation.
9. **Given** a proposal in `Ready to Do` status, **When** an administrator confirms the student performed the task and marks it completed, **Then** the backend transfers the assigned point value to the student's current balance, transitions the status to `Completed`, updates the student's highest balance if exceeded, and records an immutable audit record.
10. **Given** an active task proposal, **When** the proposing student or an administrator posts a message to the proposal, **Then** the message body, sender identity, and timestamp are preserved in the proposal's message thread.
11. **Given** an authenticated teacher, **When** the teacher attempts to query or view student task proposals or proposal messages, **Then** the backend rejects the request with an authorization failure.

---

### User Story 7 - Rankings, Tier Calculation & Daily Balance Snapshots (Priority: P3)

As a student, teacher, and school administrator, I need the system to calculate class and school-wide student rankings using standard competition ranking, maintain exactly five administrator-configured student tiers based on current points, store highest balances, record daily end-of-day balances, and restrict student ranking visibility to privacy-safe top-student boards.

**Why this priority**: Rankings, tiers, and point analytics motivate students and provide analytical visibility for teachers and administrators without exposing private data of non-top students.

**Independent Test**: Can be tested by configuring tier thresholds, creating students with various current balances (including ties and inactive statuses), verifying rank calculation (dense/standard competition ranking skipping positions), confirming tier assignments and dynamic tier transitions on balance changes, verifying daily end-of-day balance snapshots, and testing privacy filters on student board queries.

**Acceptance Scenarios**:

1. **Given** active students in a class with current points of [100, 80, 80, 50], **When** rankings are calculated, **Then** Student 1 is rank 1, Student 2 is rank 2, Student 3 is rank 2, and Student 4 is rank 4 (rank 3 is skipped).
2. **Given** a student with inactive, deactivated, or departed status, **When** class or school rankings and top-student boards are calculated, **Then** the inactive student is completely excluded from ranking positions and population counts.
3. **Given** an authenticated student requesting their ranking, **When** the backend returns ranking data, **Then** it provides the student's own rank, their current points, the total active population count (e.g., `15 of 32`), and only the names, ranks, and points of students appearing on the top-student board; names and point values of students outside the top board are omitted.
4. **Given** an administrator configuring the 5 student tiers with names (e.g., Tier 1 to Tier 5) and minimum current-point thresholds, **When** a student's current points cross a threshold (via award, adjustment, or redemption deduction), **Then** the student's tier automatically updates to match the configured threshold.
5. **Given** a student whose current point balance increases to a new all-time high, **When** the balance change occurs, **Then** the backend automatically updates the student's stored highest current-point balance.
6. **Given** active students with fluctuating point balances throughout a day, **When** the daily end-of-day snapshot process runs, **Then** the backend records each student's current point balance at the end of that day for weekly history charting.

---

### User Story 8 - Point Earning Guidance Cards (Priority: P4)

As a student and school administrator, I need administrators to manage display-only guidance cards detailing ways to earn points so that students can view earning opportunities without interactive action capabilities on the cards.

**Why this priority**: Guidance cards provide informational support to guide student participation.

**Independent Test**: Can be tested by creating, updating, and deleting guidance cards with titles, descriptions, predefined logos, and point ranges, verifying student query access, and verifying that cards do not expose or accept interactive student submissions.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** the administrator creates a guidance card with a title, description, logo selected from predefined logos, and a suggested point value or range (e.g., "10 to 20 points"), **Then** the guidance card is stored and made visible in the active guidance list.
2. **Given** an authenticated student, **When** the student retrieves guidance cards, **Then** the backend returns the read-only card details.
3. **Given** an authenticated student, **When** the student attempts to modify, create, delete, or submit actions against a guidance card, **Then** the backend rejects the request.

---

### User Story 9 - Immutable Audit Logging & Role-Based Filtered Reporting (Priority: P1)

As a school administrator, teacher, and student, I need the system to permanently record an immutable audit entry for every point-flow event and provide role-scoped, filtered point-flow reports exportable in CSV, Excel, and PDF formats.

**Why this priority**: Point economy integrity and compliance require an unalterable audit trail and role-segregated reporting.

**Independent Test**: Can be tested by performing point transfers, awards, adjustments, requests, redemptions, declines, and returns; attempting to modify/delete audit records (confirming rejection); running filtered queries with date ranges, actors, classes, subjects, action types, rewards, and tiers; verifying teacher queries only return their assigned students; and generating CSV, Excel, and PDF export outputs.

**Acceptance Scenarios**:

1. **Given** any point-modifying event (admin transfer, teacher award, admin adjustment, reward reservation, reward decline return, reward catalog removal return, challenge award, task proposal award), **When** the transaction executes, **Then** an immutable audit record is permanently written containing actor, source, recipient, amount, action type, reason/task, related entities, timestamp, and resulting balance.
2. **Given** an administrator, **When** the administrator attempts to update or delete any point-flow audit record, **Then** the backend strictly rejects the operation, preserving immutability.
3. **Given** an administrator running a report, **When** the administrator filters by date range, student, teacher, class, subject, action type, reward, or student tier, **Then** the backend returns all matching audit records across the school.
4. **Given** an authenticated teacher running a report, **When** the teacher queries student point records, **Then** the backend strictly limits the returned records to students in classes currently assigned to that teacher.
5. **Given** an authenticated student running a report, **When** the student queries point history, **Then** the backend strictly returns only the student's own point activity.
6. **Given** a valid report query, **When** an export is requested for CSV, Excel, or PDF format, **Then** the backend generates the structured export payload matching the filtered dataset.

---

### Edge Cases

- **Concurrent Point Award / Redemption**: What happens when multiple concurrent requests attempt to deduct from a teacher's budget or reserve a student's balance? The backend MUST execute point balance deductions atomically and enforce balance checks so neither teacher nor student balances can ever drop below zero.
- **Concurrent Reward Inventory Depletion**: What happens when the last unit of a non-approval reward is requested by two students simultaneously? The backend MUST atomically decrement inventory and allow only one request to succeed, rejecting the other due to zero inventory.
- **Teacher Removal with Pending Actions**: What happens if a teacher is removed from a class while an award request is processing? The backend MUST evaluate assignment validity at the exact time of transaction execution.
- **Multiple Subject Assignments**: What happens when a teacher teaches both Math and Science to the same class? The teacher holds distinct teacher-class-subject assignments and is eligible to award points to students of that class under either subject context.
- **Student Class Change During Active Proposal or Request**: What happens when a student changes classes while having an active reward request or task proposal? The reward requests and task proposals remain active and tied to the student; point balances remain unchanged.
- **Admin Direct Point Deduction Exceeding Balance**: What happens if an administrator attempts to subtract more points than a student currently has? The backend MUST prevent negative student balances unless an explicit administrative overdraft policy is specified (default: reject deduction if amount > current balance).
- **Challenge Ban Boundary**: What happens when a student receives a 3rd rejection on a challenge while an administrative unban is being processed? The ban is recorded with timestamp; subsequent administrative unban explicitly clears the ban flag.
- **Tied Rankings with Gap**: What happens when 3 students tie for rank 1? Ranks are assigned as 1, 1, 1, and the next student is assigned rank 4.
- **Zero-Point Awards or Transfers**: What happens if a user attempts a transfer or award of 0 or negative points? The backend MUST reject non-positive amounts for all standard awards, transfers, and task proposal approvals.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Account Management
- **FR-001**: The system MUST allow initial provisioning of the first school administrator account.
- **FR-002**: The system MUST allow school administrators to create and manage administrator, teacher, and student accounts.
- **FR-003**: The system MUST require each user account to have a unique 10-digit national ID as its primary identifier, along with first name, last name, username, and password.
- **FR-004**: The system MUST authenticate administrators, teachers, and students using their 10-digit national ID and password.
- **FR-005**: The system MUST prevent stored passwords from being exposed in user-facing views, responses, or logs.
- **FR-006**: The system MUST enforce role-based authorization across all backend operations, rejecting unauthorized actions.

#### Academic Structure & Membership
- **FR-007**: The system MUST allow administrators to create and manage classes and subjects.
- **FR-008**: The system MUST enforce that each student belongs to exactly one class at any given time.
- **FR-009**: The system MUST preserve a student's point balance, active reward requests, task proposals, and point history when the student is reassigned to a different class.
- **FR-010**: When a student leaves the school (departed state), the system MUST remove the student's point balance, cancel active reward requests (clearing reserved points), and exclude the student from active rankings.
- **FR-011**: The system MUST allow administrators to assign teachers to classes by subject, supporting multiple subjects per class, multiple classes per teacher, and multiple subject assignments for the same teacher in the same class.
- **FR-012**: When an administrator deactivates a teacher, the system MUST preserve the teacher's point balance, class assignments, and subject relationships, while preventing the teacher from executing any system actions.
- **FR-013**: When an administrator removes a teacher from a specific class assignment, the system MUST remove that assignment without modifying the teacher's point balance.
- **FR-014**: When a teacher leaves the school (departed state), the system MUST remove the teacher's point balance, class assignments, and teacher-class-subject relationships.

#### Point Economy & Teacher Awards
- **FR-015**: The system MUST maintain a system-wide point pool, individual teacher award-budget balances, and individual student reward-point balances.
- **FR-016**: The system MUST allow administrators to transfer points from the system-wide point pool to a teacher's award-budget balance.
- **FR-017**: The system MUST allow administrators to define point transfer tasks with a task name, optional description, and one or more predefined positive point-amount options.
- **FR-018**: The system MUST require teachers to select an active administrator-defined task and one of its predefined point-amount options when awarding points.
- **FR-019**: The system MUST prevent teachers from entering custom task names or custom point amounts.
- **FR-020**: The system MUST permit a teacher to award positive points to a student ONLY if the student is currently enrolled in a class assigned to that teacher.
- **FR-021**: The system MUST deduct the exact awarded point amount from the teacher's available balance upon point award.
- **FR-022**: The system MUST prevent a teacher from awarding points exceeding the teacher's available point balance.
- **FR-023**: The system MUST allow administrators to add or subtract points from a student's point balance, preventing negative resulting balances.

#### Reward Catalog & Redemption Lifecycle
- **FR-024**: The system MUST allow administrators to create, edit metadata for, and remove catalog rewards with a fixed point price, description, and approval requirement flag.
- **FR-025**: The system MUST enforce that reward prices are immutable once created; changing a price requires removing the old reward and creating a new reward.
- **FR-026**: The system MUST require rewards not requiring approval to have a finite inventory quantity, and rewards requiring approval to have no inventory limit.
- **FR-027**: When a student requests a reward with sufficient points, the system MUST reserve and immediately deduct the required points from the student's available balance.
- **FR-028**: The system MUST prevent students from requesting rewards with insufficient points or rewards with zero inventory.
- **FR-029**: The system MUST prevent students from canceling reward requests at any lifecycle stage.
- **FR-096**: The system MUST prevent a student from creating a new reward request for a reward when the student already has a pending request (`Pending to Approve` or `Pending to Receive`) for that same reward. The system MUST return a `409 Conflict` error with error code `DUPLICATE_PENDING_REQUEST`.
- **FR-030**: For rewards not requiring approval, the system MUST immediately transition the request to `Pending to Receive` status (color: blue) and decrement the available inventory by 1.
- **FR-031**: For rewards requiring approval, the system MUST set the request status to `Pending to Approve` (color: blue).
- **FR-032**: The system MUST allow administrators to review `Pending to Approve` requests:
  - If approved, the request status MUST transition to `Pending to Receive` (color: blue).
  - If declined, the reserved points MUST return to the student's balance, and the status MUST transition to `Declined` (color: red).
- **FR-033**: The system MUST allow administrators to mark a `Pending to Receive` request as received, transitioning the status to `Completed` (color: green) and finalizing point deduction.
- **FR-034**: When an administrator removes a reward from the catalog, the system MUST close all active requests for that reward, return reserved points to the respective students, and record audit records.

#### Challenges, Missions & Verification
- **FR-035**: The system MUST allow only administrators to create and manage challenges and missions with a title, description/action, fixed point value, and per-student completion limit.
- **FR-036**: The system MUST allow administrators to edit the title, description, and completion limit of an existing challenge or mission, while enforcing that the fixed point value remains strictly immutable once created (changing a point value requires removing and recreating the activity).
- **FR-037**: The system MUST allow students to submit verification requests for active challenges and missions until the student's completion count reaches the configured limit.
- **FR-038**: When an administrator accepts a challenge or mission verification request, the system MUST award the configured fixed points to the student, increment the student's completion count for that activity, and mark the request accepted.
- **FR-039**: The system MUST allow and administrators to award points directly for challenge and mission completion within the configured completion limits.
- **FR-040**: When a student reaches the configured completion limit for a challenge or mission, the system MUST mark the activity done for that student and reject further verification submissions.
- **FR-041**: The system MUST retain rejected verification requests and maintain a count of rejections per student and activity.
- **FR-042**: When a student accumulates 3 rejected verification requests for the same challenge or mission, the system MUST apply a temporary submission ban on that student for that specific activity, using a configurable duration that defaults to 30 calendar days (`ACTIVITY_BAN_DURATION_DAYS`).
- **FR-043**: The system MUST allow administrators to manually unban/unblock a student for an activity from the student's profile/details page, immediately restoring submission eligibility.

#### Student Task Proposals & In-Request Messaging
- **FR-044**: The system MUST allow students to submit voluntary task proposals with an optional title/subject and proposed description, initializing them in `Pending to Approve` status.
- **FR-045**: The system MUST allow administrators to review pending task proposals:
  - If rejected, the status MUST transition to `Declined` and close.
  - If approved, the administrator MUST set a positive point amount, and the status MUST transition to `Ready to Do` with the point amount visible to the student.
- **FR-046**: The system MUST allow administrators to modify the assigned point amount of an approved task proposal while it remains in `Ready to Do` status.
- **FR-047**: The system MUST allow a student to cancel a task proposal ONLY while the proposal is in `Ready to Do` status, transitioning the status to `Canceled` and closing the proposal.
- **FR-048**: When an administrator verifies completion of a `Ready to Do` task proposal, the system MUST transfer the assigned points to the student's current balance, transition the status to `Completed`, and close the proposal.
- **FR-049**: The system MUST support an in-request message thread on each task proposal between the proposing student and administrators throughout the proposal's lifecycle.
- **FR-050**: The system MUST allow students to view and list their own open task proposals (including proposals in `Pending to Approve` and `Ready to Do` states, as well as completed, declined, and canceled proposals), displaying the proposal title (if provided), description, current status, assigned point value, and full message thread history.
- **FR-051**: The system MUST enforce that students can ONLY view, query, and access their own submitted task proposals and CANNOT view, list, or access task proposals submitted by other students.
- **FR-052**: The system MUST allow administrators to view, query, and filter all task proposals across the school by status (`Pending to Approve`, `Ready to Do`, `Completed`, `Declined`, `Canceled`).
- **FR-053**: The system MUST strictly isolate student task proposals and proposal messages from teachers (teachers cannot view, query, or participate in proposals).

#### Rankings, Tiers & Student Analytics
- **FR-054**: The system MUST calculate student rankings by current point balance at both class scope and school-wide scope.
- **FR-055**: The system MUST use standard competition ranking where equal points receive identical ranks, and subsequent ranks skip positions corresponding to the number of tied students (e.g., [1, 2, 2, 4]).
- **FR-056**: The system MUST exclude inactive, deactivated, and departed students from all rankings and top-student boards.
- **FR-057**: The system MUST provide top-student boards for each class and for the entire school showing rank, student name, and current points.
- **FR-058**: When returning ranking views to a student, the system MUST provide the student's own rank, current points, total population count (e.g., `15 of 32`), and the top-student board; the system MUST NOT expose names or point balances of students outside the top-student board to students.
- **FR-059**: The system MUST store and automatically update each student's highest current-point balance whenever their current balance reaches a new peak.
- **FR-060**: The system MUST maintain exactly five student tiers, configured exclusively by administrators with custom tier names and minimum current-point thresholds.
- **FR-061**: The system MUST automatically update a student's tier whenever their current point balance crosses a configured threshold.
- **FR-062**: The system MUST record each active student's current point balance at the end of each day to maintain a daily historical balance timeline for weekly history reporting.
- **FR-063**: The system MUST allow administrators and teachers to view student point analytics in tables and diagrammatic views, restricting teachers strictly to students in their assigned classes.

#### Point Earning Guidance
- **FR-064**: The system MUST allow administrators to create, edit, and delete guidance cards with a title, description, logo identifier selected from predefined logos, and suggested point value or range (e.g., 10 to 20 points).
- **FR-065**: The system MUST provide students with read-only query access to active guidance cards, without interactive submission capabilities.

#### Immutable Audit Trail & Reporting
- **FR-066**: The system MUST write an immutable audit log record for every point-modifying event, including pool transfers, teacher awards, administrator adjustments, reward reservations, redemptions, declines, cancellations, reward removals, challenge awards, and task proposal awards.
- **FR-067**: Each audit record MUST capture the actor, source, recipient, amount, action type, task/reason description, related entity identifiers, timestamp, and resulting balance state.
- **FR-068**: The system MUST permanently retain audit records and strictly prevent administrators or any users from modifying or deleting audit records.
- **FR-069**: The system MUST provide on-demand point-flow reporting executed with runtime parameter filtering by date range, student, teacher, class, subject, action type, reward, and student tier (without requiring persisted saved filter entities).
- **FR-070**: The system MUST restrict reporting visibility by role: administrators view school-wide data; teachers view only students in assigned classes; students view only their own point history.
- **FR-071**: The system MUST support exporting filtered point reports to CSV, Excel, and PDF formats.

#### System Observability & Correlation
- **FR-072**: The system MUST assign or propagate a unique request correlation identifier to every incoming request lifecycle.
- **FR-073**: The system MUST include the correlation identifier across all application layers and in all structured log entries and error contexts.
- **FR-074**: The system MUST produce structured completion logs for all requests (INFO level for successful requests, ERROR level for failed requests with error context).
- **FR-075**: The system MUST prevent secrets, passwords, credentials, and sensitive tokens from being emitted into logs or public error responses.

#### Data Storage, Display & Entity Lifecycle
- **FR-076**: The system MUST store for each administrator: first name, last name, national ID, username, password, and account state (`Active` or `Inactive`).
- **FR-077**: The system MUST store for each teacher: first name, last name, national ID, username, password, account state (`Active`, `Deactivated`, or `Departed`), teacher point balance (award budget), and assigned classes and subjects.
- **FR-078**: The system MUST store for each student: first name, last name, national ID, username, password, account state (`Active`, `Inactive`, `Deactivated`, or `Departed`), current point balance, reserved points, single assigned class, current tier, highest current-point balance, current class rank, current school rank, ranking population counts, and weekly end-of-day current-balance history.
- **FR-079**: The system MUST store for each class: class name or label, optional grade level, optional description, active or inactive state, assigned students, and teacher-subject assignments.
- **FR-080**: The system MUST store for each subject: subject name, optional description, the classes where the subject is taught, and the teachers assigned to teach the subject in each class.
- **FR-081**: The system MUST store for each teacher-class-subject assignment: teacher reference, class reference, subject reference, and assignment state (`Active` or `Removed`).
- **FR-082**: The system MUST distinguish between and separately maintain the system-wide point pool, individual teacher award-budget balances, individual student reward-point balances, and reserved student points for active reward requests.
- **FR-083**: Each point activity record MUST preserve: actor, source, recipient, point amount, action type, selected task and point-amount option (for teacher awards), reason or description (for non-teacher-award actions), date and time, related entities (student, teacher, class, subject, activity, reward, or request when applicable), and resulting balance when needed to trace the flow.
- **FR-084**: The system MUST store for each point transfer task: task name, task description (if provided), one or more predefined point-amount options, and active or inactive state.
- **FR-085**: The system MUST store for each reward: reward name, description, optional image reference (URL or image attachment), point price (immutable), approval requirement flag, inventory quantity (finite for non-approval rewards; no limit for approval-required rewards), active or removed state, and creation and relevant change information.
- **FR-086**: Each reward request MUST preserve: student reference, reward reference, whether the reward requires approval (snapshot at request time), point price at request time, original request date and time, current request state, reserved point amount, and approval, decline, or receive information when applicable.
- **FR-087**: The system MUST store for each challenge or mission: activity type (challenge or mission), name, description or required action, fixed point value (immutable), per-student completion limit, active/inactive/removed state, and creation information.
- **FR-088**: Each challenge or mission verification request MUST preserve: student reference, activity reference, submitted evidence or verification information (supporting a text description and direct file or image upload attachments), submission date and time, administrator reviewer, review date and time, review result, rejection history, current activity-completion count for the student, and ban or unblock state when applicable.
- **FR-089**: Each student task proposal MUST preserve: student proposer, proposed task title (optional), proposed task description, current status, assigned point value (set by administrator upon approval; editable prior to completion), submission date and time, approval date and time, completion date and time, and reviewing administrator.
- **FR-090**: Each task proposal message MUST preserve: task proposal reference, sender (student or administrator), message body, and sent date and time.
- **FR-091**: The system MUST store for each guidance card: title, description, logo selected from a predefined set, suggested point value or range, and active or removed state.
- **FR-092**: The system MUST store exactly five student tiers, each with: tier name, minimum current-point threshold, display information, and active configuration state if needed while editing.
- **FR-093**: The system MUST store ranking and top-student data including: current-point rank within the student's class, current-point rank across the school, number of active enrolled students in each ranking scope, student current points used for ranking, scope (class or school), and top-student name, rank, and current points.
- **FR-094**: The system MUST support all data required for role-based behavior and permissions as defined in the functional requirements.
- **FR-095**: Point-flow and reward-activity history MUST remain traceable and permanently retained where the requirements define it as audit history.

---

### Key Entities *(include if feature involves data)*

#### Administrator

The system must store or display:

- First name
- Last name
- National ID (10-digit, unique identifier)
- Username
- Stored password (opaque/protected; never exposed in user-facing views)
- Account state: `Active` or `Inactive`
- Administrator role

The first administrator is provisioned manually. Administrators can create additional administrator, teacher, and student accounts.

#### Teacher

The system must store or display:

- First name
- Last name
- National ID (10-digit, unique identifier)
- Username
- Stored password (opaque/protected; never exposed in user-facing views)
- Account state: `Active`, `Deactivated`, or `Departed`
- Teacher point balance (award budget, distinct from student reward points)
- Assigned classes and subjects (via Teacher-Class-Subject Assignments)

The system must preserve a deactivated teacher's balance and assignments while preventing all teacher actions. When a teacher leaves the school (departed), the balance, assignments, and relationships are removed. Removing one class assignment must not change the teacher's point balance.

#### Student

The system must store or display:

- First name
- Last name
- National ID (10-digit, unique identifier)
- Username
- Stored password (opaque/protected; never exposed in user-facing views)
- Account state: `Active`, `Inactive`, `Deactivated`, or `Departed`
- Current student point balance (reward points)
- Reserved student points (for active reward requests, tracked separately from current balance)
- Student's single assigned class
- Current tier (derived from current points and tier thresholds)
- Highest current-point balance ever achieved (stored separately from current balance)
- Current class rank and school rank
- Ranking population counts (e.g., `15 of 32`)
- Weekly end-of-day current-balance history

When a student changes class, the balance and reward requests remain unchanged. When a student leaves the school, the balance and active requests are removed. Inactive, deactivated, and departed students are excluded from rankings.

#### Class

The system must store or display:

- Class name or label (e.g., `7A` or `7 Grade A`)
- Optional grade level
- Optional description
- Status: `Active` or `Inactive`
- Assigned students
- Teacher-subject assignments

A class can contain multiple subjects and teachers. Each student can belong to only one class.

#### Subject

The system must store or display:

- Subject name
- Optional description
- The class or classes where the subject is taught
- The teacher or teachers assigned to teach the subject in each class

#### Teacher-Class-Subject Assignment

Each assignment must identify:

- Teacher reference
- Class reference
- Subject reference
- Assignment state: `Active` or `Removed`

A teacher may have multiple assignments to the same class when the subjects differ and may teach multiple classes.

#### Point Pool / Balance

The system must distinguish between and separately maintain:

- **System-wide point pool**: Master administrative point allocation pool.
- **Teacher award-budget balance**: Points allocated to a specific teacher for awarding to students. Teacher points are an award budget and are not the same as student reward points.
- **Student reward-point balance**: Current redeemable point balance held by a student.
- **Reserved student points**: Points deducted from a student's available balance and held for an active reward request.

#### Point Activity Record

Each point activity record must preserve:

- Actor who caused the change
- Source of the points
- Recipient of the points
- Point amount
- Action type
- Selected task and point-amount option (for teacher awards)
- Reason or description (for non-teacher-award actions)
- Date and time
- Related student, teacher, class, subject, activity, reward, or request (when applicable)
- Resulting balance (when needed to trace the flow)

Teacher awards are positive and reduce the teacher balance by the awarded amount. Administrators can add or subtract student points. Point activity history is immutable and permanently retained.

#### Point Transfer Task

Administrators define tasks used by teachers when awarding points. Each task must store:

- Task name (e.g., `Doing Homework`)
- Task description (optional)
- One or more predefined point-amount options (positive integers)
- Status: `Active` or `Inactive`

Teachers must select one task and one of its point-amount options when awarding points. Custom tasks and custom point amounts are not allowed.

#### Reward

The system must store or display:

- Reward name
- Reward description
- Optional image reference (URL or image file reference)
- Point price (immutable after creation)
- Whether the reward requires administrator approval (boolean)
- Inventory quantity (finite integer for rewards not requiring approval; no inventory limit for rewards requiring approval)
- Status: `Active` or `Removed`
- Creation and relevant change information

Reward price is fixed after creation. To use a different price, the administrator removes the old reward and creates a new one. Rewards not requiring approval must not accept new requests when inventory is zero.

#### Reward Request

Each request must preserve:

- Student reference
- Reward reference
- Whether the reward requires approval (snapshot at request time)
- Point price at request time
- Original request date and time
- Current request state
- Reserved point amount
- Approval, decline, or receive information (when applicable), including administrator reviewer reference and action timestamp

Allowed request status labels and their display colors:

| Status              | Color |
|---------------------|-------|
| Pending to Approve  | Blue  |
| Pending to Receive  | Blue  |
| Completed           | Green |
| Declined            | Red   |

Rewards not requiring approval enter `Pending to Receive` immediately on request and decrease inventory. Rewards requiring approval enter `Pending to Approve`; administrator approval moves them to `Pending to Receive`; decline returns reserved points. The administrator marks a request as received after handover, changing it to `Completed`. Students cannot cancel reward requests at any stage.

#### Challenge / Mission

The system must store or display:

- Activity type: `Challenge` or `Mission`
- Name
- Description or required action
- Fixed point value (immutable after creation)
- Per-student completion limit (configured by administrator)
- Status: `Active`, `Inactive`, or `Removed`
- Creation information

Only administrators create and manage these activities. Administrators may update the title, description, and completion limit, but the fixed point value cannot be changed after creation; changing a point value requires removing and recreating the activity.

#### Activity Verification Request

Each verification request must preserve:

- Student reference
- Challenge or mission reference
- Submitted evidence or verification information (text description and direct file or image upload attachments)
- Submission date and time
- Administrator reviewer reference
- Review date and time
- Review result: `Accepted` or `Rejected`
- Rejection history (retained for rejection counting per student and activity)
- Current activity-completion count for the student
- Ban or unblock state (when applicable), including ban timestamp

Accepted verification marks the activity completed for the student and awards the fixed points. Three rejected requests for the same student and activity trigger a configurable ban (defaulting to 30 calendar days via `ACTIVITY_BAN_DURATION_DAYS`). Administrators can manually unblock the student from the student profile.

#### Student Task Proposal

Each student task proposal must preserve:

- Student proposer reference
- Proposed task description or message
- Current status: `Pending to Approve`, `Ready to Do`, `Completed`, `Declined`, or `Canceled`
- Assigned point value (set by administrator upon approval; editable by administrator prior to completion)
- Submission date and time
- Approval date and time
- Completion date and time
- Reviewing administrator reference

#### Task Proposal Message

Each message within a task proposal must preserve:

- Task proposal reference
- Sender: Student or Administrator
- Message body
- Sent date and time

#### Point Earning Guidance Card

Each guidance card must store:

- Title
- Description
- Logo selected from a predefined set of logos
- Suggested point value or point range (e.g., 10 to 20 points)
- Status: `Active` or `Removed`

Only administrators can create, edit, and delete guidance cards. Cards are display-only for students and do not support any student interaction.

#### Student Tier Configuration

The system must store exactly five tiers. Each tier must have:

- Tier rank or index (1 to 5)
- Tier name (e.g., `Bronze`, `Silver`, `Gold`)
- Minimum current-point threshold
- Display information for the tier
- Active configuration state (if needed while editing)

Only administrators define and change tier names and thresholds. Tier membership is calculated from current points and is informational and reportable in the current phase.

#### Daily Student Balance Snapshot

End-of-day balance record for historical analytics:

- Student reference
- Snapshot date
- End-of-day current point balance

#### Ranking and Top-Student Data

The system must provide:

- Current-point rank within the student's class
- Current-point rank across the school
- Number of active enrolled students in each ranking scope
- Student current points used for ranking
- Class or school scope
- Top-student name, rank, and current points

Equal current points share a rank, and subsequent ranks skip tied positions. Rankings exclude inactive, deactivated, and departed students.

#### Audit Record

Each immutable audit record must preserve enough information to trace:

- Event identifier
- Correlation identifier (request lifecycle)
- Point-flow action type
- Actor reference
- Source type and identifier
- Recipient type and identifier
- Point amount
- Reason or action description
- Selected task and point-amount option (for teacher awards)
- Related entity references (student, teacher, class, subject, reward, activity, request, or proposal)
- Date and time
- Relevant resulting state or balance

Audit records cover transfers, awards, administrator adjustments, reward requests, redemptions, cancellations, declines, and returned points. Administrators cannot correct or delete them. Audit records are permanently retained.

#### Report

A point-flow report is generated on-demand using runtime filter parameters and must support:

- Date range filter
- Student filter
- Teacher filter
- Class filter
- Subject filter
- Action type filter
- Reward filter
- Student tier filter
- Role-appropriate data visibility
- CSV export
- Excel export
- PDF export

Teachers may report only on students in their assigned classes. Students may view their own point activity. Reports do not require persisted saved filter definitions.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of point balance transactions (awards, transfers, adjustments, deductions, returns) execute atomically with zero instances of unauthorized negative balances.
- **SC-002**: 100% of point-flow actions generate permanent, immutable audit records traceable by actor, source, recipient, amount, reason, and timestamp.
- **SC-003**: 0% unauthorized data leakage across roles: students cannot view non-top student balances or task proposals of other students; teachers cannot access student task proposals or point reports of non-assigned classes.
- **SC-004**: Student ranking calculations and top-student boards accurately reflect standard competition ranking with position skipping in 100% of test scenarios.
- **SC-005**: Dynamic tier recalculation executes instantaneously upon balance change, ensuring 100% accuracy of student tier assignments against configured thresholds.
- **SC-006**: 100% of reward request edge cases (e.g., reward removal with active requests, zero inventory concurrency, request declines) correctly return or clear reserved points without economic leakage.
- **SC-007**: 100% of challenge/mission verification rejections are tracked accurately, automatically triggering submission bans on the 3rd rejection and allowing clean administrator unbans.
- **SC-008**: Export generation (CSV, Excel, PDF) accurately represents 100% of filtered audit datasets matching role-based visibility constraints.
- **SC-009**: 100% of HTTP transactions emit structured completion logs with unique correlation identifiers and zero credential/secret exposure.

---

## Assumptions

- **Authentication Method**: Standard username/national ID and credential authentication with session/token state management managed by the backend; no external identity provider is required for the baseline system.
- **Ranking Population Size**: Top-student boards display a configurable top $N$ students (e.g., top 5 or top 10) by default per class and school-wide scope.
- **Negative Balances**: Administrative direct adjustments cannot reduce a student's balance below 0 unless explicit policy overrides are introduced in future versions.
- **Ban Period Flexibility**: The ban period for 3 challenge rejections is dynamic and configurable via the `ACTIVITY_BAN_DURATION_DAYS` environment variable (default: 30 calendar days from the 3rd rejection timestamp), with immediate override capability by an administrator at any time.
- **Guidance Card Logos**: A fixed set of predefined logo identifiers (e.g., icon names or IDs) is configured in the system for administrator selection on guidance cards.
- **End-of-Day Snapshot Timing**: Daily balance snapshots represent the student's balance at 23:59:59 (school local time) or are captured automatically on end-of-day reconciliation.
- **Notifications**: System notification state changes are represented through the status attributes and labels of requests/proposals; external push, email, or SMS messaging is explicitly out of scope for the backend in this phase.
- **Audit Storage**: Audit records are stored in permanent append-only data structures without soft-deletion or modification endpoints.
- **Tiers in Current Phase**: Student tiers are strictly informational and analytical based on current points; tier-based reward discounts, privileges, or gating are out of scope for this phase.
- **Role-Specific Account States**: Administrator accounts use `Active`/`Inactive` states only. Teacher accounts use `Active`/`Deactivated`/`Departed` states. Student accounts use `Active`/`Inactive`/`Deactivated`/`Departed` states. These role-specific state sets are derived from the data requirements.

---
