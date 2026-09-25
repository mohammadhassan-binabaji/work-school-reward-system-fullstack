# Student Reward System Backend

Modular Monolith backend service for the Student Reward System built with TypeScript, NestJS, Prisma ORM, PostgreSQL, Redis, and MinIO S3.

## Features

- **Identity & Authentication**: 10-digit National ID validation, Argon2id password hashing, Redis stateful sessions with TTL, and RBAC guards (`ADMIN`, `TEACHER`, `STUDENT`).
- **Academic Structure**: Classes and subjects management, single class enrollment constraint, safe student class reassignment, teacher-class-subject multi-assignments, and departure lifecycle cleanup.
- **Point Economy**: System point pool, teacher award budgets, predefined task options, interactive atomic transactions, non-negative balance checks (`CHECK (balance >= 0)`), and peak balance tracking.
- **Reward Catalog & Redemptions**: Immutable pricing, atomic point reservation, finite inventory decrement for non-approval rewards, admin review, physical handover completion, and automatic refunds on catalog removal.
- **Challenges, Missions & Abuse Prevention**: Immutable fixed-value rewards, verification submissions with text and file attachments, 3-rejection dynamic temporary submission ban (`ACTIVITY_BAN_DURATION_DAYS`, default 30 days), and admin unban overrides.
- **Student Voluntary Task Proposals**: Private lifecycle (`PENDING_TO_APPROVE` -> `READY_TO_DO` -> `COMPLETED`), points editable in `READY_TO_DO`, student cancellation strictly in `READY_TO_DO`, and private in-request message threads (teachers strictly excluded).
- **Rankings & Tiers**: Standard competition ranking (1, 2, 2, 4) with ties and rank gaps, student privacy masking (top 3 + self rank only), 5 admin-configured student tiers with dynamic evaluation, and automated midnight daily balance snapshots.
- **Point Earning Guidance Cards**: Administrator CRUD and student display-only cards with logo keys and point range hints.
- **Immutable Audit Ledger & Reporting**: Write-only immutable point audit logs, multi-tenant role filtering, and streaming exports to CSV, Excel (XLSX), and PDF.

## Getting Started

### 1. Start Infrastructure Services
```bash
docker compose up -d
```

### 2. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Seed Database
```bash
npm run prisma:seed
```

### 4. Run Service in Development Mode
```bash
npm run start:dev
```

Swagger API documentation is available at `http://localhost:3000/docs`.

## Running Tests

```bash
# Unit & integration tests
npm run test

# End-to-End tests
npm run test:e2e
```
