# Requirements

## Product

**Title:** Student Reward System

The system enables teachers to award points to students for actions such as completing homework on time. Students use earned points to redeem school-defined rewards.

## Actors

- **School administrator:** Manages classes, class membership, teacher assignments, reward catalog, system point pool, teacher point balances, and student point adjustments.
- **Teacher:** Teaches assigned subjects in assigned classes and awards positive points to students in those classes using the teacher's available point balance.
- **Student:** Belongs to one class, receives points, views the balance and reward requests, and redeems rewards.

## Account and access management

- The first school administrator shall be added manually.
- An administrator shall be able to create additional administrator, teacher, and student accounts.
- Accounts shall store a first name, last name, username, password, and an optional profile image.
- A user's identifier shall be a 10-digit national ID.
- Administrators, teachers, and students shall sign in using their national ID and password.
- Profile images shall support JPEG, PNG, and WebP formats up to 5 MB.
- When an account has no profile image, the user interface shall display an initials-based fallback placeholder.
- Administrators shall be able to upload an optional profile image when creating a single user account.
- Administrators shall be able to bulk import student accounts via an Excel spreadsheet with an optional accompanying ZIP archive containing student images matched by filename specified in the spreadsheet.
- If an Excel row specifies an image filename that does not exist in the uploaded ZIP file, validation shall fail for that row.
- User profile images shall be displayed in the following designated views:
  - In the top header/profile section of each app for the logged-in user.
  - In the administrator user management table (/users) beside the user name.
  - In the teacher class management view (/classes) beside student names in expanded class rosters.
  - On the student gamified leaderboard podium on the dashboard for the top 3 students.
- No additional non-functional requirements are specified beyond the functional requirements in this package.

## Functional Requirements

### Class and membership management

- Administrators shall create classes.
- Administrators shall edit class details (name, grade level, description, and active status).
- Administrators shall delete classes; deleting a class unassigns its students and removes its teacher assignments.
- Administrators shall create subjects.
- Administrators shall edit subject details (name and description).
- Administrators shall delete subjects; deleting a subject removes associated teacher assignments.
- Administrators shall assign students to classes.
- Each student shall belong to exactly one class.
- Changing a student's class shall not change the student's point balance or reward requests.
- When a student leaves the school, the system shall remove the student's point balance and active reward requests.
- Administrators shall assign teachers to classes by subject.
- If a teacher leaves the school, the system shall remove the teacher's point balance, class assignments, and teacher-class-subject relationships.
- If a teacher is deactivated, the system shall preserve the teacher's point balance, class assignments, and relationships, but shall prevent the teacher from performing system actions.
- If a teacher is removed from a class, the system shall remove that class assignment without changing the teacher's point balance; administrators shall manage the balance separately.
- A class may have multiple subjects and teachers.
- A teacher may teach multiple classes.
- A teacher may have multiple assignments to the same class when the subjects differ.
- The system shall manage the teacher-class-subject assignments used to determine which students a teacher may reward.

### Teacher points

- Administrators shall transfer points from the system-wide point pool to a teacher's point balance.
- A teacher shall be able to award positive points to a student only when the student belongs to a class where that teacher is assigned.
- Administrators shall define tasks for point transfers, such as doing homework, and configure one or more point-amount options for each task.
- When awarding points, a teacher shall select one of the administrator-defined tasks and one of its predefined point-amount options.
- Teachers shall not be able to enter a custom task or a custom point amount.
- Awarding points shall reduce the teacher's balance by the exact amount awarded.
- The system shall prevent a teacher from awarding more points than the teacher's available balance.

### Student points and rewards

- Administrators shall be able to add or subtract points from a student's balance.
- Administrators shall manage the reward catalog, including creating, pricing, editing, and removing rewards.
- Administrators shall not change the price of an existing reward; to use a different price, they shall remove the old reward and create a new reward.
- When an administrator removes a reward, its active requests shall be closed and their reserved points shall return to the respective students.
- When creating a reward, administrators shall configure whether the reward requires administrator approval before fulfillment.
- Rewards that require approval shall have no inventory limit.
- Rewards that do not require approval shall have finite inventory.
- Students shall be able to request rewards when they have sufficient points.
- A student request shall reserve and immediately deduct the required points.
- Students shall not be able to cancel reward requests at any stage.
- The system shall prevent a student from creating a new reward request for a reward when the student already has a pending request (`Pending to Approve` or `Pending to Receive`) for that same reward.

### Reward redemption

- When a student requests a reward that does not require approval, the request shall enter `Pending to Receive` immediately and inventory shall decrease.
- When a student requests a reward that requires approval, the request shall enter `Pending to Approve`.
- An administrator shall manually review each `Pending to Approve` request.
- If the administrator approves the request, the request shall move to `Pending to Receive`.
- If the administrator declines the request, the reserved points shall return to the student's balance and the request shall move to `Declined`.
- Students shall not be able to create a new request for a reward when its inventory is zero.
- When the student receives the reward, the administrator shall mark the request as received and the status shall change to `Completed`.

### Notifications

- For reward state changes, the system shall show a message or label on the student's request.
- SMS, email, and other external notifications are not required for this behavior.
- Reward request statuses shall use the labels `Pending to Approve`, `Pending to Receive`, `Completed`, and `Declined`.
- Status labels shall use these colors: `Pending to Approve` blue, `Pending to Receive` blue, `Completed` green, and `Declined` red.

### Audit and reporting

- The system shall maintain a complete audit history of point transfers and point flow, including administrator transfers to teachers, teacher awards to students, administrator student-balance adjustments, and point changes caused by reward requests and redemptions.
- The audit history shall support reporting for administrators, teachers, and students according to their roles.
- Reports shall provide filters for date range, student, teacher, class, subject, action type, and reward.
- Reports shall support export to CSV, Excel, and PDF.
- Audit records shall preserve enough information to trace the source, recipient, amount, reason or action, actor, and time of each point change.
- Audit records for point transfers, awards, adjustments, reward requests, redemptions, cancellations, declines, and returned points shall be immutable.
- Administrators shall not be able to correct or delete these audit records.
- Immutable audit records and reports shall be retained permanently.

### Rankings and point analytics

- The system shall rank students by their current points within their class and across the whole school.
- Rankings and top-student boards shall exclude deactivated, departed, and otherwise inactive students.
- Students shall be able to see their current rank and the total number of students in the relevant class and school ranking, such as `15 of 32`.
- Students with equal current points shall share the same rank; subsequent ranks shall skip the tied positions, such as two students ranked 13 followed by rank 15.
- The system shall provide a top-student board ranked by current points for the whole school and for each class.
- Students shall see their own rank and current points, plus the name, rank, and current points of students displayed on the relevant class and school top-student boards.
- Students shall not see the names and points of students outside the displayed top-student boards.
- Administrators and teachers shall be able to view current student points in diagrams, tables, and other reporting views.
- Teachers shall be able to view student point reports only for students in classes to which they are assigned.
- Students shall be able to view their own weekly current-point history in diagrams and other reporting views.
- Weekly student point history shall represent the student's current balance at the end of each day.
- The student point history diagram shall render an interactive curved timeline with a 7-day visible viewport, non-negative scale bounds ($y \ge 0$), horizontal touch panning, and cursor-based lazy-loading for historical dates.
- The system shall store each student's highest current-point balance.
- The system shall provide a five-tier student tier system based on current points.
- Administrators shall define and change the names and minimum required current-point thresholds for the five tiers.
- The number of tiers shall be fixed at exactly five.
- Tier names may use labels such as Bronze, Silver, and Gold.
- Each tier shall support assigning one of 10 predefined dark-mode color themes (with 6 semantic color token roles: Primary, Text Light, Border, Border Glow, Ambient Blob, Ring Track, and Ring Fill) and custom Persian motivational messages.
- The student dashboard shall feature a points card styling components with dual current-tier and next-tier semantic color tokens (Current Tier for card border, glow, ambient blob, point unit label, and progress gauge background track/inner fill; Next Tier for progress arc, arc glow, and countdown target).
- The student dashboard shall display a randomly selected motivational message from the current tier's configured motivational message list (with a fallback message if empty).
- The countdown text shall dynamically display the next tier name (e.g., "X نوین دیگر تا ارتقا به سطح [نام سطح بعدی]") styled with the current tier text color and bold next tier target color; at max tier, it shall display a congratulatory max-level milestone message.
- The system shall assign each student to a tier based on the student's current points and the configured minimum thresholds.
- A student's tier shall change automatically when the student's current points move across a configured threshold.
- The current student tier shall be displayed to the student, teachers, and administrators where student current-point information is shown.
- Teachers and administrators shall be able to filter point reports by student tier.

### Challenges and missions

- The system shall provide a Challenges and Missions section.
- Only school administrators shall be able to create and manage challenges and missions.
- Administrators shall define a fixed point value when creating each challenge or mission.
- Administrators shall not be able to change the point value of an existing challenge or mission; changing it requires removing the existing activity and creating a new one.
- Administrators shall configure the maximum number of times each student may complete each challenge or mission.
- Students shall be able to earn points by completing challenges and missions.
- A mission may require an action such as joining the school's Instagram social page.
- A challenge may require completing a specified task.
- Administrators shall be able to award points for challenge and mission completion.
- Students shall be able to submit a verification request for a completed challenge or mission.
- An administrator shall manually review each verification request.
- If the administrator confirms the submission is valid, the system shall mark the challenge or mission completed for the student and award the configured mission or challenge points.
- A student shall be able to submit verification requests for a challenge or mission only until the configured completion limit is reached.
- When a student reaches the configured completion limit, the system shall mark that activity done for the student and prevent further verification requests for it.
- If three verification requests for the same challenge or mission are rejected for a student, the system shall block that student from submitting another verification request for that activity for approximately one month.
- The system shall retain rejected verification requests sufficiently to count rejections for the same student and activity.
- The ban duration shall remain flexible rather than being defined as an exact calendar period.
- Administrators shall be able to manually unban or unblock a student for an activity from the student's profile or details page in the administrator web interface.

### Student task proposals

- Students shall be able to submit voluntary task proposals (such as proposing to sing a song in front of the class).
- Each student task proposal shall start in a `Pending to Approve` state.
- Administrators shall be able to review pending task proposals.
- If an administrator rejects a proposal, the proposal shall change to `Declined` state and close.
- If an administrator approves a proposal, the administrator shall set a positive point amount for the proposal; the status shall change to `Ready to Do` and the point amount shall be visible to the student.
- Administrators shall be able to modify the assigned point amount after approval while the proposal is active, and the updated point amount shall be displayed to the student.
- While a proposal is in `Ready to Do` state, the student shall be able to cancel the request, changing its status to `Canceled` and closing the request.
- After the student performs the task, an administrator shall manually verify completion and mark the request complete; the system shall transfer the assigned points to the student and change the status to `Completed` (closed).
- Students and administrators shall be able to exchange messages within a task proposal during its active lifetime.
- Teachers shall not see or participate in student task proposals.
- Students and administrators shall be able to view open task proposals.
- Administrators shall be able to filter task proposals by status (`Pending to Approve`, `Ready to Do`, `Completed`, `Declined`, `Canceled`).

### `Point earning guidance`

- The system shall provide a guidance page for students displaying cards that describe ways to earn points.
- Only administrators shall be able to create, edit, and delete guidance cards.
- Each guidance card shall have a title, a description, a logo selected from a set of predefined logos, and a suggested point value or point range (such as 10 to 20 points).
- Guidance cards shall be display-only for students; students shall not be able to click on or take any action on a card.
- The guidance page shall be visible to students.

### In-app notifications

- The system shall provide an in-app notification inbox for students, teachers, and administrators.
- The system shall automatically generate and store an unread in-app notification for the affected student upon the following events:
  - Reward request status transitions (`Pending to Receive`, `Completed`, or `Declined`).
  - Task proposal status transitions (`Ready to Do`, `Completed`, or `Declined`) and incoming messages from an administrator.
  - Points awarded by a teacher or balance adjustments made by an administrator.
  - Challenge or mission verification request reviews (approval, rejection, or submission ban/unblock).
- The system shall automatically generate and store an unread in-app notification for school administrators upon the following events:
  - Submission of a reward request that requires administrator approval.
  - Submission of a new student task proposal.
  - Submission of a new message from a student within a task proposal.
  - Submission of a student challenge or mission verification request.
- The system shall automatically generate and store an unread in-app notification for a teacher when an administrator transfers points to that teacher's point balance.
- Each notification shall contain a subject (title), message content (text), creation date and time, read status (`Unread` or `Read`), read date and time when applicable, and an originating event reference consisting of entity type and entity identifier to enable client navigation.
- Users shall be able to view their notifications.
- Users shall be able to filter notifications by status (`All`, `Unread`, `Read`).
- The system shall provide an unread notification count indicator for each user.
- An unread notification shall be marked as read when at least 50% of its card is visible in the user's viewport continuously for 1 second; merely loading the page shall not mark it as read.
- Users shall be able to mark all their unread notifications as read through a single action.
- Notifications shall not be deleted by users and shall remain in the inbox with their read status.
- Notification retrieval and status updates shall be provided through in-app REST endpoints.
