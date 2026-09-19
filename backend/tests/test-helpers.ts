import { prisma } from '../src/core/prisma.js';

export async function cleanDatabase() {
  await prisma.auditRecord.deleteMany();
  await prisma.pointEarningGuidanceCard.deleteMany();
  await prisma.taskProposalMessage.deleteMany();
  await prisma.studentTaskProposal.deleteMany();
  await prisma.verificationAttachment.deleteMany();
  await prisma.activityVerificationRequest.deleteMany();
  await prisma.studentActivityBan.deleteMany();
  await prisma.rewardRequest.deleteMany();
  await prisma.dailyStudentBalanceSnapshot.deleteMany();
  await prisma.teacherClassSubject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.challengeMission.deleteMany();
  await prisma.pointTransferTaskOption.deleteMany();
  await prisma.pointTransferTask.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.administrator.deleteMany();
}
