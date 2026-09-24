# Quickstart Validation Guide: Student Reward System Backend

**Feature Branch**: `001-student-reward-backend`
**Date**: 2026-09-24
**Status**: Ready for Verification

---

## 1. Prerequisites & Environment Setup

### 1.1 Requirements
- **Node.js**: v20.x or higher LTS
- **Package Manager**: `npm` or `pnpm`
- **Docker & Docker Compose**: For PostgreSQL 16, Redis 7, and MinIO instances

### 1.2 Infrastructure Services Setup
Launch required infrastructure using Docker Compose:

```bash
docker compose up -d postgres redis minio
```

Default connection strings:
- **PostgreSQL**: `postgresql://postgres:postgres@localhost:5432/student_rewards`
- **Redis**: `redis://localhost:6379`
- **MinIO**: `http://localhost:9000` (Console: `http://localhost:9001`)

### 1.3 Backend Installation & Migrations
```bash
# Install dependencies
npm install

# Run Prisma schema migrations
npx prisma migrate dev --name init

# Start application in development mode
npm run start:dev
```

The application starts on `http://localhost:3000`. Swagger API documentation is available at `http://localhost:3000/docs`.

---

## 2. End-to-End Validation Scenarios

### Scenario 1: Initial Admin Provisioning & Authentication
**Goal**: Verify FR-001, FR-003, FR-004, FR-072 (Correlation ID & Stateful Session).

1. **Step 1: Provision Initial Administrator**
   - `POST /api/v1/auth/initial-admin`
   - Body: `{"nationalId": "1111111111", "firstName": "Admin", "lastName": "Super", "username": "admin", "password": "AdminPassword123!"}`
   - **Expected**: `201 Created` with User JSON object.
2. **Step 2: Authenticate Admin**
   - `POST /api/v1/auth/login`
   - Body: `{"nationalId": "1111111111", "password": "AdminPassword123!"}`
   - **Expected**: `200 OK` returning `sessionId` and `Set-Cookie: sessionId=...`. Header contains `X-Correlation-Id`.

---

### Scenario 2: Academic Setup & User Provisioning
**Goal**: Verify FR-002, FR-007, FR-008, FR-011 (Class/Subject creation and assignments).

1. **Step 1: Create Class & Subject**
   - `POST /api/v1/classes` $\rightarrow$ `{"name": "Class 7A", "gradeLevel": "Grade 7"}`
   - `POST /api/v1/subjects` $\rightarrow$ `{"name": "Mathematics"}`
2. **Step 2: Create Teacher & Student Accounts**
   - `POST /api/v1/users` $\rightarrow$ Role `TEACHER`, `nationalId: "2222222222"`, `username: "teacher.math"`
   - `POST /api/v1/users` $\rightarrow$ Role `STUDENT`, `nationalId: "3333333333"`, `classId: "<class-7A-id>"`, `username: "student.alice"`
3. **Step 3: Assign Teacher to Class and Subject**
   - `POST /api/v1/assignments` $\rightarrow$ `{"teacherId": "<teacher-id>", "classId": "<class-7A-id>", "subjectId": "<math-id>"}`
   - **Expected**: `201 Created`.

---

### Scenario 3: Point Economy & Teacher Awarding
**Goal**: Verify FR-016, FR-017, FR-018, FR-020, FR-021, FR-066 (Pool transfer, task definition, award execution, and immutable audit logging).

1. **Step 1: Admin Funds Teacher Award Budget**
   - `POST /api/v1/points/pool/fund-teacher` $\rightarrow$ `{"teacherId": "<teacher-id>", "amount": 100}`
   - **Expected**: `200 OK`. Teacher balance = 100.
2. **Step 2: Admin Creates Point Transfer Task**
   - `POST /api/v1/points/tasks` $\rightarrow$ `{"name": "Homework Excellence", "options": [{"points": 10, "label": "Full Marks"}, {"points": 5, "label": "Good Effort"}]}`
   - **Expected**: `201 Created`.
3. **Step 3: Teacher Awards Points to Student**
   - Log in as Teacher (`2222222222`).
   - `POST /api/v1/points/teacher-award` $\rightarrow$ `{"studentId": "<alice-id>", "classId": "<class-7A-id>", "subjectId": "<math-id>", "taskId": "<task-id>", "optionId": "<option-10pt-id>"}`
   - **Expected**: `200 OK`. Teacher balance becomes 90; Alice's balance becomes 10; Alice's highest balance becomes 10.
4. **Step 4: Cross-Class Guard Check**
   - Teacher attempts awarding points to a student in Class 7B.
   - **Expected**: `403 Forbidden` / `400 Bad Request` with `UNAUTHORIZED_CLASS_ASSIGNMENT`.

---

### Scenario 4: Reward Catalog & Non-Approval Redemption Lifecycle
**Goal**: Verify FR-024, FR-026, FR-027, FR-028, FR-030, FR-033 (Finite inventory, immediate reservation, direct handover completion).

1. **Step 1: Admin Creates Non-Approval Reward**
   - `POST /api/v1/rewards` $\rightarrow$ `{"name": "Sticker Pack", "description": "Fun stickers", "pointPrice": 10, "requiresApproval": false, "inventoryQuantity": 1}`
   - **Expected**: `201 Created`.
2. **Step 2: Student Requests Reward**
   - Log in as Alice (balance: 10).
   - `POST /api/v1/reward-requests` $\rightarrow$ `{"rewardId": "<sticker-reward-id>"}`
   - **Expected**: `201 Created`. Status is `PENDING_TO_RECEIVE`; Alice's available balance = 0, reserved balance = 10; Reward inventory = 0.
3. **Step 3: Second Student Requests Out-of-Stock Reward**
   - Another student attempts to request the same reward.
   - **Expected**: `400 Bad Request` (`INSUFFICIENT_INVENTORY`).
4. **Step 4: Admin Completes Handover**
   - `POST /api/v1/reward-requests/<request-id>/receive`
   - **Expected**: `200 OK`. Status becomes `COMPLETED`; Alice's reserved balance cleared to 0.

---

### Scenario 5: Challenge Submission, Rejections & Temporary Ban
**Goal**: Verify FR-035, FR-037, FR-038, FR-041, FR-042, FR-043 (Verification evidence, rejection counter, 30-day ban, and admin unban).

1. **Step 1: Admin Creates Challenge**
   - `POST /api/v1/activities` $\rightarrow$ `{"type": "CHALLENGE", "title": "Science Fair Project", "description": "Submit hypothesis and photos", "pointValue": 50, "completionLimit": 1}`
2. **Step 2: Student Submits Verification Request**
   - `POST /api/v1/activities/<challenge-id>/submissions` $\rightarrow$ `{"textDescription": "My solar oven model", "fileAttachmentUrl": "/uploads/evidence/test.jpg"}`
3. **Step 3: Admin Rejects 3 Consecutive Submissions**
   - Admin rejects submission 1, 2, and 3.
   - **Expected**: Upon 3rd rejection, `banned_until` is set to $t + 30\text{ days}$.
4. **Step 4: Verify Student is Blocked**
   - Student attempts 4th submission.
   - **Expected**: `403 Forbidden` (`STUDENT_ACTIVITY_BANNED`).
5. **Step 5: Admin Unbans Student**
   - `POST /api/v1/students/<alice-id>/unban` $\rightarrow$ `{"activityId": "<challenge-id>"}`
   - **Expected**: `200 OK`. Ban cleared; student can submit again.

---

### Scenario 6: Student Task Proposals & In-Request Messaging
**Goal**: Verify FR-044, FR-045, FR-046, FR-047, FR-048, FR-049, FR-051, FR-053 (Proposal lifecycle, messaging, role isolation).

1. **Step 1: Student Submits Proposal**
   - `POST /api/v1/proposals` $\rightarrow$ `{"description": "Plant flowers in the garden"}`
   - **Expected**: `201 Created` in `PENDING_TO_APPROVE`.
2. **Step 2: Admin Approves and Sets Points**
   - `POST /api/v1/proposals/<proposal-id>/approve` $\rightarrow$ `{"assignedPointValue": 25}`
   - **Expected**: Status is `READY_TO_DO`.
3. **Step 3: In-Request Message Thread**
   - Student posts: `POST /api/v1/proposals/<proposal-id>/messages` $\rightarrow$ `{"message": "I bought the seeds"}`
   - Admin posts: `POST /api/v1/proposals/<proposal-id>/messages` $\rightarrow$ `{"message": "Great, proceed!"}`
4. **Step 4: Teacher Isolation Check**
   - Teacher attempts `GET /api/v1/proposals/<proposal-id>`
   - **Expected**: `403 Forbidden` (Teachers strictly forbidden per FR-053).
5. **Step 5: Admin Marks Proposal Completed**
   - `POST /api/v1/proposals/<proposal-id>/complete`
   - **Expected**: `200 OK`. Alice receives 25 points; proposal status becomes `COMPLETED`.

---

### Scenario 7: Standard Competition Ranking & Privacy Scoping
**Goal**: Verify FR-054, FR-055, FR-056, FR-058 (Standard competition ranking with gap, privacy top-board filtering).

1. **Step 1: Populate Scores**
   - Student A = 100 pts, Student B = 80 pts, Student C = 80 pts, Student D = 50 pts.
2. **Step 2: Retrieve Class Rankings as Student D**
   - Log in as Student D.
   - `GET /api/v1/rankings/class/<class-id>`
   - **Expected**:
     - `totalActiveStudents`: 4
     - `selfRank`: `{ rank: 4, currentPoints: 50, studentName: "Student D" }`
     - `topStudents`: `[{ rank: 1, name: "Student A", points: 100 }, { rank: 2, name: "Student B", points: 80 }, { rank: 2, name: "Student C", points: 80 }]`
     - Student D's view does not reveal details of non-top peers beyond top-board and self.

---

### Scenario 8: Audit Trail Immutability & Filtered Report Export
**Goal**: Verify FR-066, FR-068, FR-070, FR-071 (Immutable ledger and CSV/Excel/PDF export).

1. **Step 1: Admin Queries Filtered Point Audit Report**
   - `GET /api/v1/reports/point-flow?studentId=<alice-id>`
   - **Expected**: `200 OK` with JSON audit entries tracing pool funding, awards, reservations, and proposal completions.
2. **Step 2: Admin Exports CSV/Excel/PDF**
   - `GET /api/v1/reports/point-flow/export?format=csv` $\rightarrow$ `200 OK` (`text/csv` stream)
   - `GET /api/v1/reports/point-flow/export?format=xlsx` $\rightarrow$ `200 OK` (Excel binary stream)
   - `GET /api/v1/reports/point-flow/export?format=pdf` $\rightarrow$ `200 OK` (PDF binary stream)
