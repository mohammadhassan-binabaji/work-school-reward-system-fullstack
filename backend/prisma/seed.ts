import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('Seeding baseline database state...');

  // 1. System Point Pool (singleton)
  const pool = await prisma.systemPointPool.findFirst();
  if (!pool) {
    await prisma.systemPointPool.create({
      data: {
        totalAllocated: 10000,
        availableBalance: 10000
      }
    });
    console.log('Created initial SystemPointPool with 10,000 points');
  }

  // 2. Default 5 Tiers
  const defaultTiers = [
    { tierIndex: 1, tierName: 'Bronze', minPoints: 0, displayColor: '#CD7F32' },
    { tierIndex: 2, tierName: 'Silver', minPoints: 100, displayColor: '#C0C0C0' },
    { tierIndex: 3, tierName: 'Gold', minPoints: 300, displayColor: '#FFD700' },
    { tierIndex: 4, tierName: 'Platinum', minPoints: 600, displayColor: '#E5E4E2' },
    { tierIndex: 5, tierName: 'Diamond', minPoints: 1000, displayColor: '#B9F2FF' }
  ];

  for (const t of defaultTiers) {
    await prisma.studentTier.upsert({
      where: { tierIndex: t.tierIndex },
      update: {},
      create: t
    });
  }
  console.log('Provisioned 5 default student tiers (Bronze to Diamond)');

  // 3. Baseline Administrator
  const existingAdmin = await prisma.administrator.findFirst({
    where: {
      OR: [
        { nationalId: '1234567890' },
        { username: 'admin' }
      ]
    }
  });

  if (!existingAdmin) {
    const passwordHash = await hash('Password123!');
    await prisma.administrator.create({
      data: {
        nationalId: '1234567890',
        username: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        passwordHash,
        accountState: 'Active'
      }
    });
    console.log('Provisioned baseline administrator (admin / 1234567890)');
  }

  console.log('Database seeding complete.');
}

if (process.argv[1] && process.argv[1].includes('seed')) {
  seedDatabase()
    .catch((err) => {
      console.error('Error during seeding:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
