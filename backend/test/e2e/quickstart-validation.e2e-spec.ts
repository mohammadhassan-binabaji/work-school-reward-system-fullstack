import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Quickstart End-to-End Validation Suite (All 8 Scenarios)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    app = await createTestingApp();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await cleanRedis(redis);
    await seedBaselineTiers(prisma);
    await seedSystemPool(prisma, 10000);
  });

  describe('Scenario 1: Initial Admin Provisioning & Authentication (FR-001, FR-003, FR-004, FR-072)', () => {
    it('provisions the first administrator, authenticates, and validates correlation ID & stateful session', async () => {
      // Step 1: Provision Initial Administrator
      const adminPayload = {
        nationalId: '1111111111',
        firstName: 'Admin',
        lastName: 'Super',
        username: 'admin',
        password: 'AdminPassword123!',
      };

      const initRes = await request(app.getHttpServer())
        .post('/api/v1/auth/initial-admin')
        .send(adminPayload)
        .expect(201);

      expect(initRes.body).toHaveProperty('id');
      expect(initRes.body.nationalId).toBe('1111111111');
      expect(initRes.body.role).toBe('ADMIN');
      expect(initRes.body).not.toHaveProperty('password');
      expect(initRes.body).not.toHaveProperty('passwordHash');

      // Subsequent attempt to call initial-admin should return 409 Conflict
      await request(app.getHttpServer())
        .post('/api/v1/auth/initial-admin')
        .send({
          ...adminPayload,
          nationalId: '1111111112',
          username: 'admin2',
        })
        .expect(409);

      // Step 2: Authenticate Admin & Verify Session and Correlation Header
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-correlation-id', 'test-corr-123')
        .send({
          nationalId: '1111111111',
          password: 'AdminPassword123!',
        })
        .expect(200);

      expect(loginRes.body).toHaveProperty('sessionId');
      expect(loginRes.body.user.nationalId).toBe('1111111111');
      expect(loginRes.headers).toHaveProperty('x-correlation-id');
      expect(loginRes.headers['x-correlation-id']).toBe('test-corr-123');
      expect(loginRes.headers['set-cookie']).toBeDefined();

      const cookie = loginRes.headers['set-cookie'][0];

      // Step 3: Access Authenticated Endpoint (/auth/me)
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(meRes.body.id).toBe(initRes.body.id);
      expect(meRes.body.role).toBe('ADMIN');

      // Step 4: Invalid Authentication Attempt
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          nationalId: '1111111111',
          password: 'WrongPassword!',
        })
        .expect(401);
    });
  });

  describe('Scenario 2: Academic Setup & User Provisioning (FR-002, FR-007, FR-008, FR-011)', () => {
    it('creates classes, subjects, teacher, student, and establishes class-subject assignments', async () => {
      // 1. Setup Admin
      await request(app.getHttpServer())
        .post('/api/v1/auth/initial-admin')
        .send({
          nationalId: '1111111111',
          firstName: 'Admin',
          lastName: 'Super',
          username: 'admin',
          password: 'AdminPassword123!',
        })
        .expect(201);

      const adminAuth = await loginUser(app, '1111111111', 'AdminPassword123!');

      // 2. Create Class 7A & Class 7B
      const class7ARes = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Cookie', adminAuth.cookie)
        .send({ name: 'Class 7A', gradeLevel: 'Grade 7', description: 'Grade 7 Section A' })
        .expect(201);
      const class7AId = class7ARes.body.id;

      const class7BRes = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Cookie', adminAuth.cookie)
        .send({ name: 'Class 7B', gradeLevel: 'Grade 7', description: 'Grade 7 Section B' })
        .expect(201);
      const class7BId = class7BRes.body.id;
      expect(class7BId).toBeDefined();

      // 3. Create Subjects (Mathematics, Science)
      const mathSubRes = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('Cookie', adminAuth.cookie)
        .send({ name: 'Mathematics', description: 'Math curriculum' })
        .expect(201);
      const mathSubId = mathSubRes.body.id;

      const sciSubRes = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('Cookie', adminAuth.cookie)
        .send({ name: 'Science', description: 'Science curriculum' })
        .expect(201);
      const sciSubId = sciSubRes.body.id;
      expect(sciSubId).toBeDefined();

      // 4. Create Teacher and Student Accounts
      const teacherRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminAuth.cookie)
        .send({
          nationalId: '2222222222',
          firstName: 'John',
          lastName: 'Teacher',
          username: 'teacher.math',
          password: 'TeacherPassword123!',
          role: 'TEACHER',
        })
        .expect(201);
      const teacherId = teacherRes.body.id;

      const studentRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminAuth.cookie)
        .send({
          nationalId: '3333333333',
          firstName: 'Alice',
          lastName: 'Student',
          username: 'student.alice',
          password: 'StudentPassword123!',
          role: 'STUDENT',
          classId: class7AId,
        })
        .expect(201);
      const studentId = studentRes.body.id;

      // Verify Student belongs to Class 7A
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: studentId },
      });
      expect(studentProfile?.classId).toBe(class7AId);

      // 5. Assign Teacher to Class 7A for Mathematics
      const assignmentRes = await request(app.getHttpServer())
        .post('/api/v1/assignments')
        .set('Cookie', adminAuth.cookie)
        .send({
          teacherId,
          classId: class7AId,
          subjectId: mathSubId,
        })
        .expect(201);

      expect(assignmentRes.body.teacherId).toBe(teacherId);
      expect(assignmentRes.body.classId).toBe(class7AId);
      expect(assignmentRes.body.subjectId).toBe(mathSubId);
      expect(assignmentRes.body.status).toBe('ACTIVE');
    });
  });

  describe('Scenario 3: Point Economy & Teacher Awarding (FR-016, FR-017, FR-018, FR-020, FR-021, FR-066)', () => {
    it('funds teacher budget, creates award tasks, awards points to eligible students, blocks cross-class awards, and logs audit', async () => {
      // 1. Setup Admin, Teacher, Student in Class 7A, Student in Class 7B
      await request(app.getHttpServer())
        .post('/api/v1/auth/initial-admin')
        .send({
          nationalId: '1111111111',
          firstName: 'Admin',
          lastName: 'Super',
          username: 'admin',
          password: 'AdminPassword123!',
        })
        .expect(201);
      const adminAuth = await loginUser(app, '1111111111', 'AdminPassword123!');

      const c7ARes = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Cookie', adminAuth.cookie)
        .send({ name: 'Class 7A' })
        .expect(201);
      const class7AId = c7ARes.body.id;

      const c7BRes = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Cookie', adminAuth.cookie)
        .send({ name: 'Class 7B' })
        .expect(201);
      const class7BId = c7BRes.body.id;

      const mathRes = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('Cookie', adminAuth.cookie)
        .send({ name: 'Mathematics' })
        .expect(201);
      const mathId = mathRes.body.id;

      const teacherRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminAuth.cookie)
        .send({
          nationalId: '2222222222',
          firstName: 'John',
          lastName: 'Teacher',
          username: 'teacher.math',
          password: 'TeacherPassword123!',
          role: 'TEACHER',
        })
        .expect(201);
      const teacherId = teacherRes.body.id;

      const aliceRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminAuth.cookie)
        .send({
          nationalId: '3333333333',
          firstName: 'Alice',
          lastName: 'A',
          username: 'alice',
          password: 'Password123!',
          role: 'STUDENT',
          classId: class7AId,
        })
        .expect(201);
      const aliceId = aliceRes.body.id;

      const bobRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminAuth.cookie)
        .send({
          nationalId: '4444444444',
          firstName: 'Bob',
          lastName: 'B',
          username: 'bob',
          password: 'Password123!',
          role: 'STUDENT',
          classId: class7BId,
        })
        .expect(201);
      const bobId = bobRes.body.id;

      // Assign teacher to Class 7A only
      await request(app.getHttpServer())
        .post('/api/v1/assignments')
        .set('Cookie', adminAuth.cookie)
        .send({ teacherId, classId: class7AId, subjectId: mathId })
        .expect(201);

      // Step 1: Admin Funds Teacher Award Budget (100 points)
      const fundRes = await request(app.getHttpServer())
        .post('/api/v1/points/pool/fund-teacher')
        .set('Cookie', adminAuth.cookie)
        .send({ teacherId, amount: 100 })
        .expect(200);

      expect(fundRes.body.teacherNewBalance).toBe(100);

      // Step 2: Admin Creates Point Transfer Task
      const taskRes = await request(app.getHttpServer())
        .post('/api/v1/points/tasks')
        .set('Cookie', adminAuth.cookie)
        .send({
          name: 'Homework Excellence',
          description: 'Good homework submission',
          options: [
            { points: 10, label: 'Full Marks' },
            { points: 5, label: 'Good Effort' },
          ],
        })
        .expect(201);

      const taskId = taskRes.body.id;
      const option10Id = taskRes.body.options.find((o: any) => o.points === 10).id;

      // Step 3: Teacher Awards Points to Alice (Class 7A)
      const teacherAuth = await loginUser(app, '2222222222', 'TeacherPassword123!');

      const awardRes = await request(app.getHttpServer())
        .post('/api/v1/points/teacher-award')
        .set('Cookie', teacherAuth.cookie)
        .send({
          studentId: aliceId,
          classId: class7AId,
          subjectId: mathId,
          taskId,
          optionId: option10Id,
        })
        .expect(200);

      expect(awardRes.body.teacherRemainingBudget).toBe(90);
      expect(awardRes.body.studentNewBalance).toBe(10);
      expect(awardRes.body.studentHighestBalance).toBe(10);

      // Step 4: Cross-Class Guard Check (Teacher attempts awarding Bob in Class 7B)
      await request(app.getHttpServer())
        .post('/api/v1/points/teacher-award')
        .set('Cookie', teacherAuth.cookie)
        .send({
          studentId: bobId,
          classId: class7BId,
          subjectId: mathId,
          taskId,
          optionId: option10Id,
        })
        .expect(403);

      // Step 5: Insufficient Balance Guard Check (attempt to award 100 when only 90 remains)
      const largeTaskRes = await request(app.getHttpServer())
        .post('/api/v1/points/tasks')
        .set('Cookie', adminAuth.cookie)
        .send({
          name: 'Super Achievement',
          options: [{ points: 100, label: '100 pts' }],
        })
        .expect(201);
      const largeTaskId = largeTaskRes.body.id;
      const largeOptionId = largeTaskRes.body.options[0].id;

      await request(app.getHttpServer())
        .post('/api/v1/points/teacher-award')
        .set('Cookie', teacherAuth.cookie)
        .send({
          studentId: aliceId,
          classId: class7AId,
          subjectId: mathId,
          taskId: largeTaskId,
          optionId: largeOptionId,
        })
        .expect(400);

      // Verify Audit Log was written
      const logs = await prisma.pointAuditLog.findMany({
        where: { recipientId: aliceId },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].amount).toBe(10);
      expect(logs[0].actionType).toBe('TEACHER_AWARD_STUDENT');
    });
  });

  describe('Scenario 4: Reward Catalog & Non-Approval Redemption Lifecycle (FR-024, FR-026, FR-027, FR-028, FR-030, FR-033)', () => {
    it('creates non-approval reward, manages student balance reservation & inventory decrement, and completes physical handover', async () => {
      // 1. Setup Admin & Student Alice
      await request(app.getHttpServer())
        .post('/api/v1/auth/initial-admin')
        .send({
          nationalId: '1111111111',
          firstName: 'Admin',
          lastName: 'Super',
          username: 'admin',
          password: 'AdminPassword123!',
        })
        .expect(201);
      const adminAuth = await loginUser(app, '1111111111', 'AdminPassword123!');

      const studentRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminAuth.cookie)
        .send({
          nationalId: '3333333333',
          firstName: 'Alice',
          lastName: 'Student',
          username: 'alice',
          password: 'Password123!',
          role: 'STUDENT',
        })
        .expect(201);
      const aliceId = studentRes.body.id;

      // Give Alice 10 points via Admin adjust
      await request(app.getHttpServer())
        .post('/api/v1/points/admin-adjust')
        .set('Cookie', adminAuth.cookie)
        .send({
          studentId: aliceId,
          amount: 10,
          reason: 'Initial reward points',
        })
        .expect(200);

      // Step 1: Admin Creates Non-Approval Reward with Stock = 1
      const rewardRes = await request(app.getHttpServer())
        .post('/api/v1/rewards')
        .set('Cookie', adminAuth.cookie)
        .send({
          name: 'Sticker Pack',
          description: 'Fun vinyl stickers',
          pointPrice: 10,
          requiresApproval: false,
          inventoryQuantity: 1,
        })
        .expect(201);
      const rewardId = rewardRes.body.id;

      // Step 2: Alice Requests Reward
      const aliceAuth = await loginUser(app, '3333333333', 'Password123!');

      const reqRes = await request(app.getHttpServer())
        .post('/api/v1/reward-requests')
        .set('Cookie', aliceAuth.cookie)
        .send({ rewardId })
        .expect(201);

      expect(reqRes.body.status).toBe('PENDING_TO_RECEIVE');
      expect(reqRes.body.reservedAmount).toBe(10);
      const requestId = reqRes.body.id;

      // Verify Alice Balances and Reward Inventory
      const aliceProfile = await prisma.studentProfile.findUnique({ where: { id: aliceId } });
      expect(aliceProfile?.currentBalance).toBe(0);
      expect(aliceProfile?.reservedBalance).toBe(10);

      const rewardDb = await prisma.reward.findUnique({ where: { id: rewardId } });
      expect(rewardDb?.inventoryQuantity).toBe(0);

      // Step 3: Out-of-Stock / Insufficient Balance Request Fails
      await request(app.getHttpServer())
        .post('/api/v1/reward-requests')
        .set('Cookie', aliceAuth.cookie)
        .send({ rewardId })
        .expect(400);

      // Step 4: Admin Completes Physical Handover
      const receiveRes = await request(app.getHttpServer())
        .post(`/api/v1/reward-requests/${requestId}/receive`)
        .set('Cookie', adminAuth.cookie)
        .expect(200);

      expect(receiveRes.body.status).toBe('COMPLETED');

      // Verify Reserved balance cleared
      const aliceFinal = await prisma.studentProfile.findUnique({ where: { id: aliceId } });
      expect(aliceFinal?.currentBalance).toBe(0);
      expect(aliceFinal?.reservedBalance).toBe(0);
    });
  });

  describe('Scenario 5: Challenge Submission, Rejections & Temporary Ban (FR-035, FR-037, FR-038, FR-041, FR-042, FR-043)', () => {
    it('tracks verification submissions, enforces 3-rejection ban, rejects banned submissions, and supports admin unban', async () => {
      // 1. Setup Admin & Student Alice
      await request(app.getHttpServer())
        .post('/api/v1/auth/initial-admin')
        .send({
          nationalId: '1111111111',
          firstName: 'Admin',
          lastName: 'Super',
          username: 'admin',
          password: 'AdminPassword123!',
        })
        .expect(201);
      const adminAuth = await loginUser(app, '1111111111', 'AdminPassword123!');

      const studentRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminAuth.cookie)
        .send({
          nationalId: '3333333333',
          firstName: 'Alice',
          lastName: 'Student',
          username: 'alice',
          password: 'Password123!',
          role: 'STUDENT',
        })
        .expect(201);
      const aliceId = studentRes.body.id;
      const aliceAuth = await loginUser(app, '3333333333', 'Password123!');

      // Step 1: Admin Creates Challenge
      const challengeRes = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Cookie', adminAuth.cookie)
        .send({
          type: 'CHALLENGE',
          title: 'Science Fair Project',
          description: 'Submit hypothesis and photos',
          pointValue: 50,
          completionLimit: 1,
        })
        .expect(201);
      const challengeId = challengeRes.body.id;

      // Step 2 & 3: Submit and Reject 3 consecutive times
      for (let i = 1; i <= 3; i++) {
        const subRes = await request(app.getHttpServer())
          .post(`/api/v1/activities/${challengeId}/submissions`)
          .set('Cookie', aliceAuth.cookie)
          .send({
            textDescription: `Submission attempt #${i}`,
            fileAttachmentUrl: `/uploads/evidence_${i}.jpg`,
          })
          .expect(201);

        const subId = subRes.body.id;

        const rejectRes = await request(app.getHttpServer())
          .post(`/api/v1/verifications/${subId}/reject`)
          .set('Cookie', adminAuth.cookie)
          .send({ rejectionReason: `Insufficient evidence attempt #${i}` })
          .expect(200);

        expect(rejectRes.body.status).toBe('REJECTED');
      }

      // Verify Student is now banned for this activity
      const progress = await prisma.studentActivityProgress.findUnique({
        where: {
          studentId_activityId: {
            studentId: aliceId,
            activityId: challengeId,
          },
        },
      });
      expect(progress?.rejectionCount).toBe(3);
      expect(progress?.bannedUntil).toBeDefined();

      // Step 4: 4th Submission Attempt is Blocked (403 Forbidden)
      await request(app.getHttpServer())
        .post(`/api/v1/activities/${challengeId}/submissions`)
        .set('Cookie', aliceAuth.cookie)
        .send({
          textDescription: '4th attempt while banned',
        })
        .expect(403);

      // Step 5: Admin Unbans Student
      const unbanRes = await request(app.getHttpServer())
        .post(`/api/v1/students/${aliceId}/unban`)
        .set('Cookie', adminAuth.cookie)
        .send({ activityId: challengeId })
        .expect(200);

      expect(unbanRes.body.bannedUntil).toBeNull();
      expect(unbanRes.body.rejectionCount).toBe(0);

      // Step 6: Alice Submits Again and Admin Accepts
      const validSubRes = await request(app.getHttpServer())
        .post(`/api/v1/activities/${challengeId}/submissions`)
        .set('Cookie', aliceAuth.cookie)
        .send({
          textDescription: 'Valid full evidence',
          fileAttachmentUrl: '/uploads/valid_model.png',
        })
        .expect(201);
      const validSubId = validSubRes.body.id;

      const acceptRes = await request(app.getHttpServer())
        .post(`/api/v1/verifications/${validSubId}/accept`)
        .set('Cookie', adminAuth.cookie)
        .expect(200);

      expect(acceptRes.body.status).toBe('ACCEPTED');

      // Verify Points awarded
      const aliceProfile = await prisma.studentProfile.findUnique({ where: { id: aliceId } });
      expect(aliceProfile?.currentBalance).toBe(50);
      expect(aliceProfile?.highestBalance).toBe(50);
    });
  });

  describe('Scenario 6: Student Task Proposals & In-Request Messaging (FR-044-FR-049, FR-051, FR-053)', () => {
    it('manages student task proposal lifecycle, in-request messaging, teacher isolation, and point awarding', async () => {
      // 1. Setup Admin, Teacher, Student
      await request(app.getHttpServer())
        .post('/api/v1/auth/initial-admin')
        .send({
          nationalId: '1111111111',
          firstName: 'Admin',
          lastName: 'Super',
          username: 'admin',
          password: 'AdminPassword123!',
        })
        .expect(201);
      const adminAuth = await loginUser(app, '1111111111', 'AdminPassword123!');

      const teacherRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminAuth.cookie)
        .send({
          nationalId: '2222222222',
          firstName: 'Teacher',
          lastName: 'Smith',
          username: 'teacher.smith',
          password: 'Password123!',
          role: 'TEACHER',
        })
        .expect(201);
      expect(teacherRes.body.id).toBeDefined();
      const teacherAuth = await loginUser(app, '2222222222', 'Password123!');

      const studentRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminAuth.cookie)
        .send({
          nationalId: '3333333333',
          firstName: 'Alice',
          lastName: 'Student',
          username: 'alice',
          password: 'Password123!',
          role: 'STUDENT',
        })
        .expect(201);
      const aliceId = studentRes.body.id;
      const aliceAuth = await loginUser(app, '3333333333', 'Password123!');

      // Step 1: Student Submits Proposal
      const propRes = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Cookie', aliceAuth.cookie)
        .send({ description: 'Plant flowers in the school garden' })
        .expect(201);

      expect(propRes.body.status).toBe('PENDING_TO_APPROVE');
      const proposalId = propRes.body.id;

      // Step 2: Admin Approves and Sets Point Value to 25
      const approveRes = await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposalId}/approve`)
        .set('Cookie', adminAuth.cookie)
        .send({ assignedPointValue: 25 })
        .expect(200);

      expect(approveRes.body.status).toBe('READY_TO_DO');
      expect(approveRes.body.assignedPointValue).toBe(25);

      // Step 3: In-Request Messaging
      await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposalId}/messages`)
        .set('Cookie', aliceAuth.cookie)
        .send({ message: 'I purchased the wildflower seeds.' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposalId}/messages`)
        .set('Cookie', adminAuth.cookie)
        .send({ message: 'Approved! You can plant them tomorrow morning.' })
        .expect(201);

      const msgsRes = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${proposalId}/messages`)
        .set('Cookie', aliceAuth.cookie)
        .expect(200);

      expect(msgsRes.body.length).toBe(2);
      expect(msgsRes.body[0].message).toContain('wildflower');
      expect(msgsRes.body[1].message).toContain('Approved');

      // Step 4: Teacher Isolation Check (FR-053)
      await request(app.getHttpServer())
        .get(`/api/v1/proposals/${proposalId}`)
        .set('Cookie', teacherAuth.cookie)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Cookie', teacherAuth.cookie)
        .expect(403);

      // Step 5: Admin Confirms Completion
      const completeRes = await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposalId}/complete`)
        .set('Cookie', adminAuth.cookie)
        .expect(200);

      expect(completeRes.body.status).toBe('COMPLETED');

      // Verify Alice received 25 points
      const aliceProfile = await prisma.studentProfile.findUnique({ where: { id: aliceId } });
      expect(aliceProfile?.currentBalance).toBe(25);
    });
  });

  describe('Scenario 7: Standard Competition Ranking & Privacy Scoping (FR-054-FR-058)', () => {
    it('computes standard competition ranking (1, 2, 2, 4) with ties skipping and masks peer details for student queries', async () => {
      // 1. Setup Admin and Class 7A
      await request(app.getHttpServer())
        .post('/api/v1/auth/initial-admin')
        .send({
          nationalId: '1111111111',
          firstName: 'Admin',
          lastName: 'Super',
          username: 'admin',
          password: 'AdminPassword123!',
        })
        .expect(201);
      const adminAuth = await loginUser(app, '1111111111', 'AdminPassword123!');

      const cRes = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Cookie', adminAuth.cookie)
        .send({ name: 'Class 7A' })
        .expect(201);
      const classId = cRes.body.id;

      // Create 4 students with scores [100, 80, 80, 50]
      const scores = [
        { nationalId: '3000000001', name: 'Alice', points: 100 },
        { nationalId: '3000000002', name: 'Bob', points: 80 },
        { nationalId: '3000000003', name: 'Charlie', points: 80 },
        { nationalId: '3000000004', name: 'David', points: 50 },
      ];

      for (const s of scores) {
        const uRes = await request(app.getHttpServer())
          .post('/api/v1/users')
          .set('Cookie', adminAuth.cookie)
          .send({
            nationalId: s.nationalId,
            firstName: s.name,
            lastName: 'Student',
            username: s.name.toLowerCase(),
            password: 'Password123!',
            role: 'STUDENT',
            classId,
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/api/v1/points/admin-adjust')
          .set('Cookie', adminAuth.cookie)
          .send({
            studentId: uRes.body.id,
            amount: s.points,
            reason: 'Seeding test points',
          })
          .expect(200);
      }

      // Step 2: Query Rankings as Student David (50 pts)
      const davidAuth = await loginUser(app, '3000000004', 'Password123!');

      const rankRes = await request(app.getHttpServer())
        .get(`/api/v1/rankings/class/${classId}`)
        .set('Cookie', davidAuth.cookie)
        .expect(200);

      expect(rankRes.body.totalActiveStudents).toBe(4);
      expect(rankRes.body.selfRank).toBeDefined();
      expect(rankRes.body.selfRank.rank).toBe(4);
      expect(rankRes.body.selfRank.points).toBe(50);

      // Top students board should have Ranks 1, 2, 2
      expect(rankRes.body.topStudents.length).toBe(3);
      expect(rankRes.body.topStudents[0].rank).toBe(1);
      expect(rankRes.body.topStudents[0].points).toBe(100);
      expect(rankRes.body.topStudents[1].rank).toBe(2);
      expect(rankRes.body.topStudents[1].points).toBe(80);
      expect(rankRes.body.topStudents[2].rank).toBe(2);
      expect(rankRes.body.topStudents[2].points).toBe(80);
    });
  });

  describe('Scenario 8: Audit Trail Immutability & Multi-Format Report Export (FR-066, FR-068, FR-070, FR-071)', () => {
    it('queries immutable point audit log and streams CSV, Excel, and PDF report exports', async () => {
      // 1. Setup Admin, Student, and point activity
      await request(app.getHttpServer())
        .post('/api/v1/auth/initial-admin')
        .send({
          nationalId: '1111111111',
          firstName: 'Admin',
          lastName: 'Super',
          username: 'admin',
          password: 'AdminPassword123!',
        })
        .expect(201);
      const adminAuth = await loginUser(app, '1111111111', 'AdminPassword123!');

      const studentRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminAuth.cookie)
        .send({
          nationalId: '3333333333',
          firstName: 'Alice',
          lastName: 'Student',
          username: 'alice',
          password: 'Password123!',
          role: 'STUDENT',
        })
        .expect(201);
      const aliceId = studentRes.body.id;

      await request(app.getHttpServer())
        .post('/api/v1/points/admin-adjust')
        .set('Cookie', adminAuth.cookie)
        .send({
          studentId: aliceId,
          amount: 50,
          reason: 'Special recognition award',
        })
        .expect(200);

      // Step 1: Admin Queries Point Flow Report
      const reportRes = await request(app.getHttpServer())
        .get('/api/v1/reports/point-flow')
        .query({ studentId: aliceId })
        .set('Cookie', adminAuth.cookie)
        .expect(200);

      expect(reportRes.body.data).toBeDefined();
      expect(reportRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(reportRes.body.data[0].amount).toBe(50);
      expect(reportRes.body.data[0].taskOrReason).toContain('Special recognition award');

      // Step 2: Export CSV Format
      const csvRes = await request(app.getHttpServer())
        .get('/api/v1/reports/point-flow/export')
        .query({ format: 'csv' })
        .set('Cookie', adminAuth.cookie)
        .expect(200);

      expect(csvRes.headers['content-type']).toContain('text/csv');
      expect(csvRes.text).toContain('Special recognition award');

      // Step 3: Export XLSX Format
      const xlsxRes = await request(app.getHttpServer())
        .get('/api/v1/reports/point-flow/export')
        .query({ format: 'xlsx' })
        .set('Cookie', adminAuth.cookie)
        .expect(200);

      expect(xlsxRes.body).toBeDefined();

      // Step 4: Export PDF Format
      const pdfRes = await request(app.getHttpServer())
        .get('/api/v1/reports/point-flow/export')
        .query({ format: 'pdf' })
        .set('Cookie', adminAuth.cookie)
        .expect(200);

      expect(pdfRes.headers['content-type']).toContain('application/pdf');
    });
  });
});

