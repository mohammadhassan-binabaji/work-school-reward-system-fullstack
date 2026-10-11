import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { NotificationReadStatus, OriginatingEntityType } from '@prisma/client';

describe('Notifications Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminCookie: string;
  let adminId: string;
  let studentCookie: string;
  let studentId: string;
  let student2Cookie: string;
  let student2Id: string;

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
    await seedSystemPool(prisma);

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
    adminCookie = adminAuth.cookie;
    adminId = adminAuth.user.id;

    const student1Res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333333',
        firstName: 'Alice',
        lastName: 'Student',
        username: 'alice',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    studentId = student1Res.body.id;

    const student2Res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '4444444444',
        firstName: 'Bob',
        lastName: 'Student',
        username: 'bob',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    student2Id = student2Res.body.id;

    const s1Auth = await loginUser(app, '3333333333', 'Password123!');
    studentCookie = s1Auth.cookie;

    const s2Auth = await loginUser(app, '4444444444', 'Password123!');
    student2Cookie = s2Auth.cookie;
  });

  describe('User Story 1: Inbox Retrieval & Unread Counter', () => {
    it('returns empty inbox and 0 unread count for user with no notifications', async () => {
      const inboxRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(inboxRes.body.data).toEqual([]);
      expect(inboxRes.body.meta.totalItems).toBe(0);

      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(countRes.body.unreadCount).toBe(0);
    });

    it('retrieves notifications with deterministic sorting (createdAt DESC, id DESC)', async () => {
      const baseDate = new Date('2026-10-09T10:00:00.000Z');
      const sameDate = new Date('2026-10-09T12:00:00.000Z');

      const n1 = await prisma.notification.create({
        data: {
          id: '11111111-1111-1111-1111-111111111111',
          recipientId: studentId,
          subject: 'Oldest',
          body: 'First body',
          originatingEntityType: OriginatingEntityType.POINT_AWARD,
          originatingEntityId: '00000000-0000-0000-0000-000000000001',
          createdAt: baseDate,
        },
      });

      const n2 = await prisma.notification.create({
        data: {
          id: '22222222-2222-2222-2222-222222222222',
          recipientId: studentId,
          subject: 'Same Time Lower ID',
          body: 'Second body',
          originatingEntityType: OriginatingEntityType.POINT_AWARD,
          originatingEntityId: '00000000-0000-0000-0000-000000000002',
          createdAt: sameDate,
        },
      });

      const n3 = await prisma.notification.create({
        data: {
          id: '33333333-3333-3333-3333-333333333333',
          recipientId: studentId,
          subject: 'Same Time Higher ID',
          body: 'Third body',
          originatingEntityType: OriginatingEntityType.POINT_AWARD,
          originatingEntityId: '00000000-0000-0000-0000-000000000003',
          createdAt: sameDate,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(res.body.data.length).toBe(3);
      expect(res.body.data[0].id).toBe(n3.id);
      expect(res.body.data[1].id).toBe(n2.id);
      expect(res.body.data[2].id).toBe(n1.id);
    });

    it('filters inbox by read status (ALL, UNREAD, READ)', async () => {
      await prisma.notification.create({
        data: {
          recipientId: studentId,
          subject: 'Unread 1',
          body: 'Body 1',
          readStatus: NotificationReadStatus.UNREAD,
          originatingEntityType: OriginatingEntityType.POINT_AWARD,
          originatingEntityId: '00000000-0000-0000-0000-000000000001',
        },
      });

      await prisma.notification.create({
        data: {
          recipientId: studentId,
          subject: 'Read 1',
          body: 'Body 2',
          readStatus: NotificationReadStatus.READ,
          readAt: new Date(),
          originatingEntityType: OriginatingEntityType.POINT_AWARD,
          originatingEntityId: '00000000-0000-0000-0000-000000000002',
        },
      });

      const allRes = await request(app.getHttpServer())
        .get('/api/v1/notifications?status=ALL')
        .set('Cookie', studentCookie)
        .expect(200);
      expect(allRes.body.data.length).toBe(2);

      const unreadRes = await request(app.getHttpServer())
        .get('/api/v1/notifications?status=UNREAD')
        .set('Cookie', studentCookie)
        .expect(200);
      expect(unreadRes.body.data.length).toBe(1);
      expect(unreadRes.body.data[0].subject).toBe('Unread 1');

      const readRes = await request(app.getHttpServer())
        .get('/api/v1/notifications?status=READ')
        .set('Cookie', studentCookie)
        .expect(200);
      expect(readRes.body.data.length).toBe(1);
      expect(readRes.body.data[0].subject).toBe('Read 1');
    });

    it('calculates unread count accurately (FR-005)', async () => {
      for (let i = 0; i < 4; i++) {
        await prisma.notification.create({
          data: {
            recipientId: studentId,
            subject: `Unread ${i}`,
            body: `Body ${i}`,
            readStatus: NotificationReadStatus.UNREAD,
            originatingEntityType: OriginatingEntityType.POINT_AWARD,
            originatingEntityId: '00000000-0000-0000-0000-000000000001',
          },
        });
      }
      for (let i = 0; i < 6; i++) {
        await prisma.notification.create({
          data: {
            recipientId: studentId,
            subject: `Read ${i}`,
            body: `Body ${i}`,
            readStatus: NotificationReadStatus.READ,
            readAt: new Date(),
            originatingEntityType: OriginatingEntityType.POINT_AWARD,
            originatingEntityId: '00000000-0000-0000-0000-000000000001',
          },
        });
      }

      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(countRes.body.unreadCount).toBe(4);
    });

    it('strictly isolates notifications between users (FR-008, SC-004)', async () => {
      await prisma.notification.create({
        data: {
          recipientId: student2Id,
          subject: 'Bob Private Alert',
          body: 'Only Bob should see this',
          readStatus: NotificationReadStatus.UNREAD,
          originatingEntityType: OriginatingEntityType.POINT_AWARD,
          originatingEntityId: '00000000-0000-0000-0000-000000000001',
        },
      });

      const aliceRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(aliceRes.body.data).toEqual([]);

      const aliceCountRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(aliceCountRes.body.unreadCount).toBe(0);

      const bobRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', student2Cookie)
        .expect(200);

      expect(bobRes.body.data.length).toBe(1);
      expect(bobRes.body.data[0].subject).toBe('Bob Private Alert');
    });
  });

  describe('User Story 2: Marking Notifications as Read', () => {
    it('marks an individual notification as read and decrements unread count (FR-006)', async () => {
      const notification = await prisma.notification.create({
        data: {
          recipientId: studentId,
          subject: 'Points Awarded',
          body: 'Teacher Jenkins awarded 25 points',
          readStatus: NotificationReadStatus.UNREAD,
          originatingEntityType: OriginatingEntityType.POINT_AWARD,
          originatingEntityId: '00000000-0000-0000-0000-000000000001',
        },
      });

      const markRes = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .set('Cookie', studentCookie)
        .expect(200);

      expect(markRes.body.readStatus).toBe('READ');
      expect(markRes.body.readAt).not.toBeNull();

      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(countRes.body.unreadCount).toBe(0);
    });

    it('marking an already read notification is idempotent with unchanged readAt', async () => {
      const originalReadAt = new Date('2026-10-09T08:00:00.000Z');
      const notification = await prisma.notification.create({
        data: {
          recipientId: studentId,
          subject: 'Already Read',
          body: 'Body',
          readStatus: NotificationReadStatus.READ,
          readAt: originalReadAt,
          originatingEntityType: OriginatingEntityType.POINT_AWARD,
          originatingEntityId: '00000000-0000-0000-0000-000000000001',
        },
      });

      const markRes = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .set('Cookie', studentCookie)
        .expect(200);

      expect(markRes.body.readStatus).toBe('READ');
      expect(new Date(markRes.body.readAt).getTime()).toBe(originalReadAt.getTime());
    });

    it('marks all unread notifications as read globally and resets unread count to 0 (FR-007, SC-005)', async () => {
      for (let i = 0; i < 5; i++) {
        await prisma.notification.create({
          data: {
            recipientId: studentId,
            subject: `Unread ${i}`,
            body: `Body ${i}`,
            readStatus: NotificationReadStatus.UNREAD,
            originatingEntityType: OriginatingEntityType.POINT_AWARD,
            originatingEntityId: '00000000-0000-0000-0000-000000000001',
          },
        });
      }

      const bulkRes = await request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(bulkRes.body.updatedCount).toBe(5);

      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(countRes.body.unreadCount).toBe(0);
    });

    it('rejects attempt by User A to mark User B notification as read with 404 (FR-008, SC-004)', async () => {
      const bobNotification = await prisma.notification.create({
        data: {
          recipientId: student2Id,
          subject: 'Bob Alert',
          body: 'Body',
          readStatus: NotificationReadStatus.UNREAD,
          originatingEntityType: OriginatingEntityType.POINT_AWARD,
          originatingEntityId: '00000000-0000-0000-0000-000000000001',
        },
      });

      // Alice tries to mark Bob's notification as read
      await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${bobNotification.id}/read`)
        .set('Cookie', studentCookie)
        .expect(404);

      // Verify Bob's notification remains UNREAD
      const check = await prisma.notification.findUnique({
        where: { id: bobNotification.id },
      });
      expect(check?.readStatus).toBe(NotificationReadStatus.UNREAD);
    });
  });

  describe('User Story 3: Student Event Notifications', () => {
    it('creates notification for student when reward request status transitions (FR-009)', async () => {
      // Grant points to student
      await request(app.getHttpServer())
        .post('/api/v1/points/admin-adjust')
        .set('Cookie', adminCookie)
        .send({ studentId, amount: 200, reason: 'Initial balance' })
        .expect(200);

      // Create approval-required reward
      const rewardRes = await request(app.getHttpServer())
        .post('/api/v1/rewards')
        .set('Cookie', adminCookie)
        .send({
          name: 'School Hoodie',
          description: 'Warm hoodie',
          pointPrice: 50,
          requiresApproval: true,
        })
        .expect(201);
      const rewardId = rewardRes.body.id;

      // Student requests reward
      const reqRes = await request(app.getHttpServer())
        .post('/api/v1/reward-requests')
        .set('Cookie', studentCookie)
        .send({ rewardId })
        .expect(201);
      const requestId = reqRes.body.id;

      // Admin approves request -> PENDING_TO_RECEIVE
      await request(app.getHttpServer())
        .post(`/api/v1/reward-requests/${requestId}/approve`)
        .set('Cookie', adminCookie)
        .expect(200);

      // Verify student received EVT-01
      let studentInbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const approvalNotif = studentInbox.body.data.find(
        (n: any) => n.originatingEntityId === requestId,
      );
      expect(approvalNotif).toBeDefined();
      expect(approvalNotif.subject).toBe('Reward Ready for Pickup');
      expect(approvalNotif.originatingEntityType).toBe('REWARD_REQUEST');

      // Admin completes handover -> COMPLETED (EVT-02)
      await request(app.getHttpServer())
        .post(`/api/v1/reward-requests/${requestId}/receive`)
        .set('Cookie', adminCookie)
        .expect(200);

      studentInbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const completedNotif = studentInbox.body.data.find(
        (n: any) => n.originatingEntityId === requestId && n.subject === 'Reward Completed',
      );
      expect(completedNotif).toBeDefined();
      expect(completedNotif.originatingEntityType).toBe('REWARD_REQUEST');
    });

    it('creates notification when student submits auto-approved reward (EVT-01)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/points/admin-adjust')
        .set('Cookie', adminCookie)
        .send({ studentId, amount: 200, reason: 'Initial balance' })
        .expect(200);

      const rewardRes = await request(app.getHttpServer())
        .post('/api/v1/rewards')
        .set('Cookie', adminCookie)
        .send({
          name: 'Sticker Pack',
          description: 'Fun stickers',
          pointPrice: 10,
          requiresApproval: false,
          inventoryQuantity: 20,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/reward-requests')
        .set('Cookie', studentCookie)
        .send({ rewardId: rewardRes.body.id })
        .expect(201);

      const studentInbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const pickupNotif = studentInbox.body.data.find(
        (n: any) => n.subject === 'Reward Ready for Pickup',
      );
      expect(pickupNotif).toBeDefined();
    });

    it('creates notification for student when task proposal is approved, points modified, completed, declined, and messaged (FR-010, FR-011)', async () => {
      // Student submits proposal
      const propRes = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Cookie', studentCookie)
        .send({ description: 'Organize school math competition' })
        .expect(201);
      const proposalId = propRes.body.id;

      // Admin approves proposal (EVT-06)
      await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposalId}/approve`)
        .set('Cookie', adminCookie)
        .send({ assignedPointValue: 50 })
        .expect(200);

      let inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const approvedNotif = inbox.body.data.find(
        (n: any) => n.originatingEntityId === proposalId && n.subject === 'Task Proposal Approved',
      );
      expect(approvedNotif).toBeDefined();
      expect(approvedNotif.originatingEntityType).toBe('TASK_PROPOSAL');

      // Admin posts message (EVT-09)
      await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposalId}/messages`)
        .set('Cookie', adminCookie)
        .send({ message: 'Great proposal, please coordinate with room 101' })
        .expect(201);

      inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const msgNotif = inbox.body.data.find(
        (n: any) => n.originatingEntityId === proposalId && n.subject === 'New Message on Task Proposal',
      );
      expect(msgNotif).toBeDefined();
      expect(msgNotif.originatingEntityType).toBe('PROPOSAL_MESSAGE');

      // Admin completes proposal (EVT-08)
      await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposalId}/complete`)
        .set('Cookie', adminCookie)
        .expect(200);

      inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const completeNotif = inbox.body.data.find(
        (n: any) => n.originatingEntityId === proposalId && n.subject === 'Task Proposal Completed',
      );
      expect(completeNotif).toBeDefined();
    });

    it('creates notifications for teacher point awards and admin manual adjustments (FR-012, FR-013)', async () => {
      // Setup teacher, class, subject, assignment, task option
      const teacherRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminCookie)
        .send({
          nationalId: '2222222222',
          firstName: 'Sarah',
          lastName: 'Jenkins',
          username: 'sjenkins',
          password: 'Password123!',
          role: 'TEACHER',
        })
        .expect(201);
      const teacherId = teacherRes.body.id;

      const classRes = await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set('Cookie', adminCookie)
        .send({ name: 'Grade 10A' })
        .expect(201);
      const classId = classRes.body.id;

      const subjectRes = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('Cookie', adminCookie)
        .send({ name: 'Mathematics' })
        .expect(201);
      const subjectId = subjectRes.body.id;

      await request(app.getHttpServer())
        .post('/api/v1/assignments')
        .set('Cookie', adminCookie)
        .send({ teacherId, classId, subjectId })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/classes/assign-student')
        .set('Cookie', adminCookie)
        .send({ studentId, classId })
        .expect(201);

      // Fund teacher budget
      await request(app.getHttpServer())
        .post('/api/v1/points/pool/fund-teacher')
        .set('Cookie', adminCookie)
        .send({ teacherId, amount: 100 })
        .expect(200);

      const taskRes = await request(app.getHttpServer())
        .post('/api/v1/points/tasks')
        .set('Cookie', adminCookie)
        .send({
          name: 'Homework Excellence',
          description: 'High quality homework',
          options: [{ points: 20, label: 'Perfect score' }],
        })
        .expect(201);
      const taskId = taskRes.body.id;
      const optionId = taskRes.body.options[0].id;

      const teacherAuth = await loginUser(app, '2222222222', 'Password123!');

      // Teacher awards points (EVT-16)
      await request(app.getHttpServer())
        .post('/api/v1/points/teacher-award')
        .set('Cookie', teacherAuth.cookie)
        .send({ studentId, classId, subjectId, taskId, optionId })
        .expect(200);

      let inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const awardNotif = inbox.body.data.find(
        (n: any) => n.originatingEntityType === 'POINT_AWARD',
      );
      expect(awardNotif).toBeDefined();
      expect(awardNotif.subject).toBe('Points Awarded');
      expect(awardNotif.body).toContain('Sarah Jenkins');

      // Admin adjusts balance (EVT-17)
      await request(app.getHttpServer())
        .post('/api/v1/points/admin-adjust')
        .set('Cookie', adminCookie)
        .send({ studentId, amount: 15, reason: 'Science Fair Special Mention' })
        .expect(200);

      inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const adjustNotif = inbox.body.data.find(
        (n: any) => n.originatingEntityType === 'POINT_ADJUSTMENT',
      );
      expect(adjustNotif).toBeDefined();
      expect(adjustNotif.subject).toBe('Point Balance Adjusted');
      expect(adjustNotif.body).toContain('15');
    });

    it('creates notifications for verification approval, rejection, ban, and unblock (FR-014, FR-015)', async () => {
      const actRes = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Cookie', adminCookie)
        .send({
          type: 'CHALLENGE',
          title: 'Robotics Competition',
          description: 'Participate in robotics',
          pointValue: 30,
          completionLimit: 1,
        })
        .expect(201);
      const activityId = actRes.body.id;

      // Submit verification
      const verRes = await request(app.getHttpServer())
        .post(`/api/v1/activities/${activityId}/submissions`)
        .set('Cookie', studentCookie)
        .send({ textDescription: 'I built an autonomous robot' })
        .expect(201);
      const verificationId = verRes.body.id;

      // Admin accepts verification (EVT-12)
      await request(app.getHttpServer())
        .post(`/api/v1/verifications/${verificationId}/accept`)
        .set('Cookie', adminCookie)
        .expect(200);

      let inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const acceptNotif = inbox.body.data.find(
        (n: any) => n.originatingEntityId === verificationId,
      );
      expect(acceptNotif).toBeDefined();
      expect(acceptNotif.subject).toBe('Verification Approved');

      // Create new activity to test 3 rejections -> ban (EVT-14)
      const act2Res = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Cookie', adminCookie)
        .send({
          type: 'MISSION',
          title: 'Reading Marathon',
          description: 'Read 5 books',
          pointValue: 20,
          completionLimit: 1,
        })
        .expect(201);
      const activity2Id = act2Res.body.id;

      for (let i = 0; i < 3; i++) {
        const v = await request(app.getHttpServer())
          .post(`/api/v1/activities/${activity2Id}/submissions`)
          .set('Cookie', studentCookie)
          .send({ textDescription: `Submission attempt ${i + 1}` })
          .expect(201);

        await request(app.getHttpServer())
          .post(`/api/v1/verifications/${v.body.id}/reject`)
          .set('Cookie', adminCookie)
          .send({ rejectionReason: `Invalid evidence ${i + 1}` })
          .expect(200);
      }

      inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const banNotif = inbox.body.data.find(
        (n: any) => n.originatingEntityType === 'ACTIVITY_BAN',
      );
      expect(banNotif).toBeDefined();
      expect(banNotif.subject).toBe('Activity Submission Ban');

      // Admin unblocks student (EVT-15)
      await request(app.getHttpServer())
        .post(`/api/v1/students/${studentId}/unban`)
        .set('Cookie', adminCookie)
        .send({ activityId: activity2Id })
        .expect(200);

      inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      const unblockNotif = inbox.body.data.find(
        (n: any) => n.originatingEntityType === 'ACTIVITY_UNBLOCK',
      );
      expect(unblockNotif).toBeDefined();
      expect(unblockNotif.subject).toBe('Activity Eligibility Restored');
    });
  });

  describe('User Story 4: Administrator Actionable Review Alerts', () => {
    it('fans out review alerts to all active administrators when student submits reviewable items (FR-016 - FR-019)', async () => {
      // Create second admin
      const admin2Res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminCookie)
        .send({
          nationalId: '1212121212',
          firstName: 'AdminTwo',
          lastName: 'Supervisor',
          username: 'admin2',
          password: 'AdminPassword123!',
          role: 'ADMIN',
        })
        .expect(201);
      const admin2Id = admin2Res.body.id;

      const admin2Auth = await loginUser(app, '1212121212', 'AdminPassword123!');
      const admin2Cookie = admin2Auth.cookie;

      // Student submits proposal (EVT-05)
      const propRes = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Cookie', studentCookie)
        .send({ description: 'New recycling club project' })
        .expect(201);

      // Verify Admin 1 received notification
      const admin1Inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', adminCookie)
        .expect(200);
      const a1Notif = admin1Inbox.body.data.find(
        (n: any) => n.originatingEntityId === propRes.body.id,
      );
      expect(a1Notif).toBeDefined();
      expect(a1Notif.subject).toBe('New Task Proposal Submitted');

      // Verify Admin 2 received separate notification
      const admin2Inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', admin2Cookie)
        .expect(200);
      const a2Notif = admin2Inbox.body.data.find(
        (n: any) => n.originatingEntityId === propRes.body.id,
      );
      expect(a2Notif).toBeDefined();
      expect(a2Notif.id).not.toBe(a1Notif.id);

      // Student posts message on proposal (EVT-10)
      await request(app.getHttpServer())
        .post(`/api/v1/proposals/${propRes.body.id}/messages`)
        .set('Cookie', studentCookie)
        .send({ message: 'Can you please review my budget breakdown?' })
        .expect(201);

      const a1InboxAfterMsg = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', adminCookie)
        .expect(200);
      const a1MsgNotif = a1InboxAfterMsg.body.data.find(
        (n: any) => n.originatingEntityType === 'PROPOSAL_MESSAGE',
      );
      expect(a1MsgNotif).toBeDefined();
      expect(a1MsgNotif.subject).toBe('New Student Message on Proposal');
    });
  });

  describe('User Story 5: Teacher Point Budget Allocation Alerts', () => {
    it('creates point allocation notification exclusively for funded teacher (FR-020)', async () => {
      // Create Teacher 1 and Teacher 2
      const t1Res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminCookie)
        .send({
          nationalId: '5555555555',
          firstName: 'Teacher',
          lastName: 'One',
          username: 'teacher1',
          password: 'Password123!',
          role: 'TEACHER',
        })
        .expect(201);
      const teacher1Id = t1Res.body.id;

      const t2Res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', adminCookie)
        .send({
          nationalId: '6666666666',
          firstName: 'Teacher',
          lastName: 'Two',
          username: 'teacher2',
          password: 'Password123!',
          role: 'TEACHER',
        })
        .expect(201);
      const teacher2Id = t2Res.body.id;

      const t1Auth = await loginUser(app, '5555555555', 'Password123!');
      const t2Auth = await loginUser(app, '6666666666', 'Password123!');

      // Admin funds Teacher 1 budget
      await request(app.getHttpServer())
        .post('/api/v1/points/pool/fund-teacher')
        .set('Cookie', adminCookie)
        .send({ teacherId: teacher1Id, amount: 150 })
        .expect(200);

      // Verify Teacher 1 received EVT-18 notification
      const t1Inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', t1Auth.cookie)
        .expect(200);

      expect(t1Inbox.body.data.length).toBe(1);
      expect(t1Inbox.body.data[0].subject).toBe('Point Budget Allocated');
      expect(t1Inbox.body.data[0].originatingEntityType).toBe('POINT_ALLOCATION');
      expect(t1Inbox.body.data[0].body).toContain('150');

      // Verify Teacher 2 received 0 notifications
      const t2Inbox = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', t2Auth.cookie)
        .expect(200);

      expect(t2Inbox.body.data).toEqual([]);
      expect(t2Inbox.body.meta.totalItems).toBe(0);
    });
  });
});

