# Data Requirements

This document defines the important business data the system must store or display. It intentionally does not define database schema, tables, keys, APIs, or implementation types.

## General Data Rules

- Data must support the role-based behavior and permissions defined in [requirements.md](requirements.md).
- Point-flow and reward-activity history must remain traceable and permanently retained where the requirements define it as audit history.
- A user's national ID is the only user identifier and contains 10 digits.
- Passwords are required for administrator, teacher, and student sign-in. The system must not expose stored passwords in user-facing views.

## Administrator

The system must store or display:

- First name
- Last name
- National ID
- Account state, including active or inactive status
- Administrator role

The first administrator is provisioned manually. Administrators can create additional administrator, teacher, and student accounts.

## Teacher

The system must store or display:

- First name
- Last name
- National ID
- Account state, including active, deactivated, or departed state
- Teacher point balance used as an award budget
- Assigned classes and subjects

The system must preserve a deactivated teacher's balance and assignments while preventing actions. When a teacher leaves the school, the balance, assignments, and relationships are removed. Removing one class assignment must not change the teacher balance.

## Student

The system must store or display:

- First name
- Last name
- National ID
- Account state, including active, inactive, deactivated, or departed state
- Current student point balance
- Student's single assigned class
- Current tier
- Highest current-point balance
- Current class rank and school rank
- Ranking population counts, such as `15 of 32`
- Weekly end-of-day current-balance history

When a student changes class, the balance and reward requests remain unchanged. When a student leaves the school, the balance and active requests are removed. Inactive, deactivated, and departed students are excluded from rankings.

## Class

The system must store or display:

- Class name or label, such as `7A` or `7 Grade A`
- Active or inactive state
- Assigned students
- Teacher-subject assignments

A class can contain multiple subjects and teachers. Each student can belong to only one class.

## Subject

The system must store or display:

- Subject name
- The class or classes where the subject is taught
- The teacher or teachers assigned to teach the subject in each class

## Teacher-Class-Subject Assignment

Each assignment must identify:

- Teacher
- Class
- Subject
- Assignment state, when an assignment is removed or no longer active

A teacher may have multiple assignments to the same class when the subjects differ and may teach multiple classes.

## Point Balance and Point Activity

The system must distinguish between:

- System-wide point pool
- Teacher award-budget balance
- Student reward-point balance
- Reserved student points for an active reward request

Each point activity record must preserve:

- Actor who caused the change
- Source of the points
- Recipient of the points
- Point amount
- Action type
- Selected task and point-amount option for teacher awards
- Reason or description for non-teacher-award actions
- Date and time
- Related student, teacher, class, subject, activity, reward, or request when applicable
- Resulting balance when needed to trace the flow

Teacher awards are positive and reduce the teacher balance by the awarded amount. Administrators can add or subtract student points. Point activity history is immutable and permanently retained.

## Point Transfer Task

Administrators define tasks used by teachers when awarding points. Each task must store:

- Task name, such as `Doing Homework`
- Task description, if provided
- One or more predefined point-amount options
- Active or inactive state

Teachers must select one task and one of its point-amount options when awarding points. Custom tasks and custom point amounts are not allowed.

## Reward

The system must store or display:

- Reward name
- Reward description
- Point price
- Whether the reward requires administrator approval
- Inventory quantity (only for rewards not requiring approval; rewards requiring approval have no inventory limit)
- Active or removed state
- Creation and relevant change information

Reward price is fixed after creation. To use a different price, the administrator removes the old reward and creates a new one.

Rewards not requiring approval must not accept new requests when inventory is zero.

## Reward Request

Each request must preserve:

- Student
- Reward
- Whether the reward requires approval
- Point price at request time
- Original request date and time
- Current request state
- Reserved point amount
- Approval, decline, or receive information when applicable

Allowed request labels are:

- `Pending to Approve`
- `Pending to Receive`
- `Completed`
- `Declined`

Rewards not requiring approval enter `Pending to Receive` immediately on request and decrease inventory. Rewards requiring approval enter `Pending to Approve`; administrator approval moves them to `Pending to Receive`; decline returns reserved points.

The administrator marks a request as received after handover, changing it to `Completed`.

Students cannot cancel reward requests at any stage.

## Challenge or Mission

The system must store or display:

- Activity type: challenge or mission
- Name
- Description or required action
- Fixed point value
- Per-student completion limit
- Active, inactive, or removed state
- Creation information

Only administrators create and manage these activities. The fixed point value cannot be changed after creation; changing it requires removing and recreating the activity.

## Challenge or Mission Verification Request

Each verification request must preserve:

- Student
- Challenge or mission
- Submitted evidence or verification information, when provided
- Submission date and time
- Administrator reviewer
- Review date and time
- Review result
- Rejection history
- Current activity-completion count for the student
- Ban or unblock state when applicable

Accepted verification marks the activity completed for the student and awards the fixed points. Three rejected requests for the same student and activity trigger a flexible approximately one-month ban. Administrators can manually unblock the student from the student profile.

## Student Task Proposal

Each student task proposal must preserve:

- Student proposer
- Proposed task description or message
- Current status (`Pending to Approve`, `Ready to Do`, `Completed`, `Declined`, `Canceled`)
- Assigned point value (set by administrator upon approval; editable prior to completion)
- Submission date and time
- Approval date and time
- Completion date and time
- Reviewing administrator

Allowed proposal statuses are:

- `Pending to Approve`
- `Ready to Do`
- `Completed`
- `Declined`
- `Canceled`

## Student Task Proposal Message

Each message within a task proposal must preserve:

- Task proposal reference
- Sender (student or administrator)
- Message body
- Sent date and time

## Point Earning Guidance Card

Each guidance card must store:

- Title
- Description
- Logo selected from a predefined set of logos
- Suggested point value or point range (such as 10 to 20 points)
- Active or removed state

Only administrators can create, edit, and delete guidance cards. Cards are display-only for students and do not support any student interaction.

## Student Tier

The system must store exactly five tiers. Each tier must have:

- Tier name, such as Bronze, Silver, or Gold
- Minimum current-point threshold
- Display information for the tier
- Active configuration state, if needed while editing

Only administrators define and change tier names and thresholds. Tier membership is calculated from current points and is informational and reportable in the current phase.

## Ranking and Top-Student Data

The system must provide:

- Current-point rank within the student's class
- Current-point rank across the school
- Number of active enrolled students in each ranking scope
- Student current points used for ranking
- Class or school scope
- Top-student name, rank, and current points

Equal current points share a rank, and subsequent ranks skip tied positions. Rankings exclude inactive, deactivated, and departed students.

## Audit Record

Each immutable audit record must preserve enough information to trace:

- Point-flow action
- Actor
- Source and recipient
- Amount
- Reason or action description
- Related student, teacher, class, subject, reward, activity, or request
- Date and time
- Relevant resulting state or balance

Audit records cover transfers, awards, administrator adjustments, reward requests, redemptions, cancellations, declines, and returned points. Administrators cannot correct or delete them.

## Report

A point-flow report must support:

- Date range
- Student
- Teacher
- Class
- Subject
- Action type
- Reward
- Student tier
- Role-appropriate data visibility
- CSV export
- Excel export
- PDF export

Teachers may report only on students in their assigned classes. Students may view their own point activity.

## Data Details To Clarify Before Design

These details are not yet specified as business requirements and should be confirmed before solution design:

- Whether classes and subjects have descriptions, academic-year labels, or other display fields.
- Whether rewards need images or other presentation content in addition to descriptions and digital redemption content.
- Which evidence formats students may submit for challenge and mission verification.
- Whether administrators may edit the text or evidence requirements of an existing challenge or mission without changing its fixed points.
- Whether reports need a stored report name, saved filter, or only on-demand filters.
