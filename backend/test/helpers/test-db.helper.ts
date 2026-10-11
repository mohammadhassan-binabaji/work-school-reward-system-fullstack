import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  const tableNames = [
    'notifications',
    'point_audit_logs',
    'reward_requests',
    'verification_requests',
    'student_activity_progress',
    'task_proposal_messages',
    'student_task_proposals',
    'daily_student_snapshots',
    'teacher_class_subject_assignments',
    'student_profiles',
    'teacher_profiles',
    'users',
    'classes',
    'subjects',
    'point_task_options',
    'point_transfer_tasks',
    'rewards',
    'activities',
    'guidance_cards',
    'tier_configurations',
    'system_point_pools',
  ];

  try {
    for (const table of tableNames) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  } catch (error) {
    // Fallback deletion if TRUNCATE CASCADE hits permission issues
    await prisma.notification.deleteMany();
    await prisma.pointAuditLog.deleteMany();
    await prisma.rewardRequest.deleteMany();
    await prisma.verificationRequest.deleteMany();
    await prisma.studentActivityProgress.deleteMany();
    await prisma.taskProposalMessage.deleteMany();
    await prisma.studentTaskProposal.deleteMany();
    await prisma.dailyStudentSnapshot.deleteMany();
    await prisma.teacherClassSubjectAssignment.deleteMany();
    await prisma.studentProfile.deleteMany();
    await prisma.teacherProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.class.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.pointTaskOption.deleteMany();
    await prisma.pointTransferTask.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.guidanceCard.deleteMany();
    await prisma.tierConfiguration.deleteMany();
    await prisma.systemPointPool.deleteMany();
  }
}

export async function cleanRedis(redis: RedisService): Promise<void> {
  try {
    const client = redis.getClient();
    if (client) {
      await client.flushdb();
    }
  } catch {
    // Ignore if redis is unavailable in mock tests
  }
}

export async function seedBaselineTiers(prisma: PrismaService): Promise<void> {
  const tiers = [
    { tierNumber: 1, name: 'Bronze', minPointsThreshold: 0 },
    { tierNumber: 2, name: 'Silver', minPointsThreshold: 100 },
    { tierNumber: 3, name: 'Gold', minPointsThreshold: 250 },
    { tierNumber: 4, name: 'Platinum', minPointsThreshold: 500 },
    { tierNumber: 5, name: 'Diamond', minPointsThreshold: 1000 },
  ];

  for (const tier of tiers) {
    await prisma.tierConfiguration.upsert({
      where: { tierNumber: tier.tierNumber },
      update: { name: tier.name, minPointsThreshold: tier.minPointsThreshold },
      create: tier,
    });
  }
}

export async function seedSystemPool(
  prisma: PrismaService,
  initialBalance = 10000,
): Promise<{ id: string; balance: number }> {
  const existing = await prisma.systemPointPool.findFirst();
  if (existing) {
    return prisma.systemPointPool.update({
      where: { id: existing.id },
      data: { balance: initialBalance },
    });
  }
  return prisma.systemPointPool.create({
    data: { balance: initialBalance },
  });
}
