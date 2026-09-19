# Quickstart Validation Guide: Student Reward System Backend

**Feature Branch**: `001-student-reward-backend`  
**Date**: 2026-09-19  
**Status**: Ready for Validation  

This guide provides step-by-step instructions and runnable scenarios to validate the Student Reward System Backend end-to-end against all 9 User Stories and constitutional requirements.

---

## 1. Prerequisites & Environment Setup

### Prerequisites
- **Node.js**: v24.x LTS (installed: `node -v`)
- **npm**: v12.x (installed: `npm -v`)
- **SQLite**: Bundled / file-based (zero-external daemon required)

### Setup Commands
From the repository root:

```bash
# 1. Navigate to backend workspace
cd backend

# 2. Install dependencies
npm install

# 3. Apply Prisma database migrations
npx prisma migrate dev --name init

# 4. Generate Prisma Client
npx prisma generate

# 5. Start the backend development server
npm run dev
```

The server starts by default at `http://localhost:3000/api/v1`.  
OpenAPI documentation is available at `http://localhost:3000/documentation`.

---

## 2. Automated Test Execution

Run the complete automated test suite covering unit algorithms, integration flows, and contract adherence:

```bash
# Run all unit, integration, and contract tests
npm test

# Run tests with code coverage report
npm run test:coverage
```

### Expected Test Outcomes
- `ranking.test.ts`: Confirms standard competition ranking (1224) with tied positions and student privacy projection.
- `point-atomic.test.ts`: Confirms concurrent point balance decrements reject negative balances and zero inventory overselling.
- `rewards-flow.test.ts`: Confirms reserved point locking, return on decline or catalog removal, and completion on handover.
- `proposals-flow.test.ts`: Confirms proposal state machine, messaging thread isolation, and teacher exclusion.
- `audit-immutability.test.ts`: Confirms audit entries are recorded atomically for every point mutation.

---

## 3. End-to-End Validation Scenarios

### Scenario 1: Initial Admin Provisioning & Authentication (User Story 1)

**Goal**: Provision first school administrator with 10-digit national ID and authenticate.

```bash
# 1. Provision initial admin
curl -X POST http://localhost:3000/api/v1/auth/provision-admin \
  -H "Content-Type: application/json" \
  -d '{
    "nationalId": "1234567890",
    "username": "superadmin",
    "password": "Password123!",
    "firstName": "Super",
    "lastName": "Admin"
  }'

# Expected: 201 Created with user object (excluding passwordHash)

# 2. Authenticate with national ID and password
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "nationalId": "1234567890",
    "password": "Password123!"
  }'

# Expected: 200 OK returning { "token": "<JWT_TOKEN>", "user": { "role": "ADMIN", ... } }
# Save token: export ADMIN_TOKEN="<JWT_TOKEN>"
```

---

### Scenario 2: Academic Setup & Class Assignment (User Story 2)

**Goal**: Create Class 7A, Subject Math, assign Teacher to 7A Math, enroll Student.

```bash
# 1. Create Class 7A
curl -X POST http://localhost:3000/api/v1/academic/classes \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "7A", "gradeLevel": "Grade 7", "description": "Section 7A" }'
# Save: export CLASS_ID="<CLASS_ID>"

# 2. Create Subject Math
curl -X POST http://localhost:3000/api/v1/academic/subjects \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Mathematics", "description": "Core Math" }'
# Save: export SUBJECT_ID="<SUBJECT_ID>"

# 3. Provision Teacher and Student accounts
curl -X POST http://localhost:3000/api/v1/auth/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "TEACHER",
    "nationalId": "2345678901",
    "username": "teacher_smith",
    "password": "Password123!",
    "firstName": "John",
    "lastName": "Smith"
  }'
# Save: export TEACHER_ID="<TEACHER_ID>"

curl -X POST http://localhost:3000/api/v1/auth/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "STUDENT",
    "nationalId": "3456789012",
    "username": "student_alice",
    "password": "Password123!",
    "firstName": "Alice",
    "lastName": "Wonder",
    "classId": "'"$CLASS_ID"'"
  }'
# Save: export STUDENT_ID="<STUDENT_ID>"

# 4. Assign Teacher to Class 7A for Math
curl -X POST http://localhost:3000/api/v1/academic/assignments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "'"$TEACHER_ID"'",
    "classId": "'"$CLASS_ID"'",
    "subjectId": "'"$SUBJECT_ID"'"
  }'
```

---

### Scenario 3: Point Pool Funding & Teacher Award Workflow (User Story 3)

**Goal**: Fund teacher's balance from system pool, define transfer task, award points to student.

```bash
# 1. Admin transfers 100 points to Teacher
curl -X POST http://localhost:3000/api/v1/points/pool/transfer \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "teacherId": "'"$TEACHER_ID"'", "amount": 100 }'
# Expected: 200 OK. Teacher balance increases to 100.

# 2. Admin creates transfer task "Doing Homework" with options [5, 10, 15]
curl -X POST http://localhost:3000/api/v1/points/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Doing Homework",
    "description": "On-time submission",
    "options": [5, 10, 15]
  }'
# Save: export TASK_ID="<TASK_ID>"

# 3. Log in as Teacher
# export TEACHER_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
#   -H "Content-Type: application/json" \
#   -d '{"nationalId": "2345678901", "password": "Password123!"}' | jq -r .token)

# 4. Teacher awards 10 points to Alice
curl -X POST http://localhost:3000/api/v1/points/award \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'"$STUDENT_ID"'",
    "taskId": "'"$TASK_ID"'",
    "pointAmount": 10
  }'
# Expected: 200 OK. Teacher balance drops to 90; Student Alice currentPoints increases to 10; highestBalance = 10.
```

---

### Scenario 4: Reward Redemption Lifecycle (User Story 4)

**Goal**: Student requests reward; verify reserved points and handover completion.

```bash
# 1. Admin creates Reward (requires approval = false, inventory = 5, price = 10)
curl -X POST http://localhost:3000/api/v1/rewards \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "School Pen Set",
    "description": "Premium pen set",
    "pointPrice": 10,
    "requiresApproval": false,
    "inventory": 5
  }'
# Save: export REWARD_ID="<REWARD_ID>"

# 2. Student logs in & requests reward
# export STUDENT_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
#   -H "Content-Type: application/json" \
#   -d '{"nationalId": "3456789012", "password": "Password123!"}' | jq -r .token)

curl -X POST http://localhost:3000/api/v1/rewards/requests \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "rewardId": "'"$REWARD_ID"'" }'
# Expected: 201 Created. Status is "Pending to Receive".
# Student currentPoints = 0, reservedPoints = 10. Reward inventory = 4.

# 3. Admin marks reward as received after handover
curl -X PUT http://localhost:3000/api/v1/rewards/requests/<REQUEST_ID>/receive \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 200 OK. Status is "Completed". Reserved points finalized (0).
```

---

### Scenario 5: Challenges & 3-Rejection Abuse Ban (User Story 5)

**Goal**: Verify 3 rejections apply 30-day ban and admin unban clears the ban.

```bash
# 1. Admin creates Challenge with fixed point value 20, limit 1
curl -X POST http://localhost:3000/api/v1/activities \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Challenge",
    "name": "Science Fair Participation",
    "description": "Present project at fair",
    "pointValue": 20,
    "completionLimit": 1
  }'
# Save: export ACTIVITY_ID="<ACTIVITY_ID>"

# 2. Student submits verification requests and Admin rejects 3 times
# Upon the 3rd rejection, student is automatically banned for 30 days on this activity.

# 3. Subsequent verification submission by student
# Expected: 403 Forbidden ("Submission blocked due to active abuse ban")

# 4. Admin overrides and unblocks student
curl -X PUT http://localhost:3000/api/v1/activities/bans/$STUDENT_ID/$ACTIVITY_ID/unban \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 200 OK. Student is unbanned immediately.
```

---

### Scenario 6: Voluntary Task Proposals & Messaging (User Story 6)

**Goal**: Student proposes task; Admin reviews & prices; Student/Admin exchange messages; Admin completes.

```bash
# 1. Student submits proposal
curl -X POST http://localhost:3000/api/v1/proposals \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "description": "Organize classroom library books by genre" }'
# Save: export PROPOSAL_ID="<PROPOSAL_ID>"

# 2. Admin approves and assigns 25 points
curl -X PUT http://localhost:3000/api/v1/proposals/$PROPOSAL_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "assignedPointValue": 25 }'
# Expected: 200 OK. Status is "Ready to Do".

# 3. Post message in thread
curl -X POST http://localhost:3000/api/v1/proposals/$PROPOSAL_ID/messages \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "messageBody": "Completed organizing section A through D!" }'

# 4. Admin confirms completion
curl -X PUT http://localhost:3000/api/v1/proposals/$PROPOSAL_ID/complete \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 200 OK. Status is "Completed". Student receives 25 points.
```

---

### Scenario 7: Rankings (1224) & Top Board Privacy (User Story 7)

**Goal**: Verify standard competition ranking with position skipping and privacy projection for students.

```bash
# Query ranking as Student
curl -X GET "http://localhost:3000/api/v1/analytics/rankings?scope=school" \
  -H "Authorization: Bearer $STUDENT_TOKEN"

# Expected Response:
# {
#   "scope": "school",
#   "ownRank": 1,
#   "ownPoints": 25,
#   "totalActiveCount": 1,
#   "topStudents": [
#     { "rank": 1, "studentName": "Alice Wonder", "currentPoints": 25 }
#   ]
# }
# NOTE: Non-top student names and point balances are strictly excluded.
```

---

### Scenario 8: Role-Filtered Point Reports & Exports (User Story 9)

**Goal**: Query on-demand parameterized report and export to CSV, Excel, and PDF.

```bash
# 1. Parameterized report query
curl -X GET "http://localhost:3000/api/v1/reports/point-flow?startDate=2026-09-01&endDate=2026-09-30" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 200 OK with array of immutable audit records.

# 2. Export to CSV
curl -X GET "http://localhost:3000/api/v1/reports/point-flow/export?format=csv" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --output report.csv

# 3. Export to Excel
curl -X GET "http://localhost:3000/api/v1/reports/point-flow/export?format=excel" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --output report.xlsx

# 4. Export to PDF
curl -X GET "http://localhost:3000/api/v1/reports/point-flow/export?format=pdf" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --output report.pdf
```

---

### Scenario 9: Observability & Correlation ID Verification (FR-072..075)

**Goal**: Confirm request correlation ID propagation and structured completion logging.

```bash
curl -i -X GET http://localhost:3000/api/v1/guidance/cards \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "X-Correlation-ID: test-corr-id-12345"

# Expected Response Headers:
# X-Correlation-ID: test-corr-id-12345

# Expected Server Console Output (Structured JSON log):
# {
#   "level": "info",
#   "time": 1792411200000,
#   "correlationId": "test-corr-id-12345",
#   "req": { "method": "GET", "url": "/api/v1/guidance/cards" },
#   "res": { "statusCode": 200 },
#   "responseTime": 2.4,
#   "msg": "request completed"
# }
```
