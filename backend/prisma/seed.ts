import { PrismaClient, Role, AccountState, ActivityType, GuidanceCardStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Student Reward System database...');

  // 1. Seed 5 Tier Configurations
  const tiers = [
    {
      tierNumber: 1,
      name: 'برنز',
      minPointsThreshold: 0,
      themeId: 'bronze_ember',
      motivationalMessages: [
        'آغاز یک مسیر درخشان! به تلاشت ادامه بده...',
        'هر قدم کوچک، تو را به هدف‌های بزرگ‌تر نزدیک می‌کند.',
      ],
    },
    {
      tierNumber: 2,
      name: 'نقره‌ای',
      minPointsThreshold: 100,
      themeId: 'silver_cyber',
      motivationalMessages: [
        'پیشرفت فوق‌العاده‌ای داشتی! ادامه بده...',
        'تلاش امروزت، موفقیت فردای توست.',
      ],
    },
    {
      tierNumber: 3,
      name: 'طلایی',
      minPointsThreshold: 250,
      themeId: 'gold_aurelian',
      motivationalMessages: [
        'درخشش پادشاهی! عملکردت عالی بوده...',
        'تو جزو بهترین‌ها هستی، به اوج نزدیک شدی!',
      ],
    },
    {
      tierNumber: 4,
      name: 'پلاتین',
      minPointsThreshold: 500,
      themeId: 'platinum_bioglaze',
      motivationalMessages: [
        'مهارت و استمرار فوق‌العاده! پیش به سوی الماس!',
        'انرژی و هوش بالای تو الهام‌بخش بقیه دانش‌آموزان است.',
      ],
    },
    {
      tierNumber: 5,
      name: 'الماس',
      minPointsThreshold: 1000,
      themeId: 'diamond_aether',
      motivationalMessages: [
        'شما به بالاترین قله افتخار نوین دست یافته‌اید!',
        'اسطوره نوین! درخشش ابدی تو ستودنی است.',
      ],
    },
  ];

  for (const tier of tiers) {
    await prisma.tierConfiguration.upsert({
      where: { tierNumber: tier.tierNumber },
      update: {
        name: tier.name,
        minPointsThreshold: tier.minPointsThreshold,
        themeId: tier.themeId,
        motivationalMessages: tier.motivationalMessages,
      },
      create: tier,
    });
  }
  console.log('✓ Seeded 5 Tier Configurations');

  // 2. Seed System Point Pool
  const existingPool = await prisma.systemPointPool.findFirst();
  if (!existingPool) {
    await prisma.systemPointPool.create({
      data: { balance: 10000 },
    });
    console.log('✓ Seeded System Point Pool with 10,000 points');
  }

  // 3. Seed Initial Administrator
  const adminPasswordHash = await argon2.hash('AdminPassword123!', {
    type: argon2.argon2id,
  });

  const admin = await prisma.user.upsert({
    where: { nationalId: '1111111111' },
    update: {},
    create: {
      nationalId: '1111111111',
      firstName: 'Admin',
      lastName: 'Super',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      accountState: AccountState.ACTIVE,
    },
  });
  console.log(`✓ Seeded Initial Admin (${admin.username})`);

  // 4. Seed Classes & Subjects
  const class7A = await prisma.class.upsert({
    where: { name: 'Class 7A' },
    update: {},
    create: { name: 'Class 7A', gradeLevel: 'Grade 7', description: 'Grade 7 Section A' },
  });

  const class7B = await prisma.class.upsert({
    where: { name: 'Class 7B' },
    update: {},
    create: { name: 'Class 7B', gradeLevel: 'Grade 7', description: 'Grade 7 Section B' },
  });

  const mathSubject = await prisma.subject.upsert({
    where: { name: 'Mathematics' },
    update: {},
    create: { name: 'Mathematics', description: 'General Mathematics' },
  });

  const scienceSubject = await prisma.subject.upsert({
    where: { name: 'Science' },
    update: {},
    create: { name: 'Science', description: 'General Science' },
  });
  console.log('✓ Seeded Classes and Subjects');

  // 5. Seed Predefined Point Transfer Tasks
  await prisma.pointTransferTask.upsert({
    where: { name: 'Homework Excellence' },
    update: {},
    create: {
      name: 'Homework Excellence',
      description: 'Completing homework on time with high accuracy',
      options: {
        create: [
          { points: 5, label: 'Good Effort' },
          { points: 10, label: 'Full Marks' },
        ],
      },
    },
  });

  await prisma.pointTransferTask.upsert({
    where: { name: 'Classroom Leadership' },
    update: {},
    create: {
      name: 'Classroom Leadership',
      description: 'Helping peers, organizing activities, or leading group study',
      options: {
        create: [
          { points: 10, label: 'Peer Assistance' },
          { points: 20, label: 'Group Lead' },
        ],
      },
    },
  });
  console.log('✓ Seeded Point Transfer Tasks');

  // 6. Seed Rewards
  await prisma.reward.createMany({
    data: [
      {
        name: 'Sticker Pack',
        description: 'Set of 10 holographic stickers',
        pointPrice: 10,
        requiresApproval: false,
        inventoryQuantity: 50,
      },
      {
        name: 'School Notebook',
        description: 'A5 hardbound branded notebook',
        pointPrice: 25,
        requiresApproval: false,
        inventoryQuantity: 30,
      },
      {
        name: 'Library Book Voucher',
        description: 'Special coupon for library book borrowing bonus',
        pointPrice: 50,
        requiresApproval: true,
        inventoryQuantity: null,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Seeded Sample Rewards');

  // 7. Seed Challenges & Missions
  await prisma.activity.createMany({
    data: [
      {
        type: ActivityType.CHALLENGE,
        title: 'Science Fair Project',
        description: 'Submit hypothesis and photo of prototype',
        pointValue: 50,
        completionLimit: 1,
      },
      {
        type: ActivityType.MISSION,
        title: 'Weekly Reading Log',
        description: 'Read a book and submit a 200-word summary',
        pointValue: 15,
        completionLimit: 4,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Seeded Sample Activities');

  // 8. Seed Guidance Categories & Cards
  const academicCat = await prisma.guidanceCategory.create({
    data: {
      title: 'فعالیت‌های آموزشی',
      iconKey: 'graduation-cap',
      sortOrder: 1,
      status: GuidanceCardStatus.ACTIVE,
    },
  });

  const disciplinaryCat = await prisma.guidanceCategory.create({
    data: {
      title: 'فعالیت‌های انضباطی',
      iconKey: 'shield',
      sortOrder: 2,
      status: GuidanceCardStatus.ACTIVE,
    },
  });

  const culturalCat = await prisma.guidanceCategory.create({
    data: {
      title: 'فعالیت‌های فرهنگی و ورزشی',
      iconKey: 'trophy',
      sortOrder: 3,
      status: GuidanceCardStatus.ACTIVE,
    },
  });

  await prisma.guidanceCard.createMany({
    data: [
      {
        categoryId: academicCat.id,
        title: 'شرکت فعال در مباحث کلاس',
        description: 'مشارکت فعال و مؤثر در مباحث کلاسی و پاسخ به پرسش‌های درسی معلم',
        logoKey: 'chat-bubble-outline',
        pointRangeLabel: '۱۰ تا ۳۰ نوین',
        sortOrder: 1,
        status: GuidanceCardStatus.ACTIVE,
      },
      {
        categoryId: academicCat.id,
        title: 'کسب نمره برتر در آزمون‌های کلاسی',
        description: 'کسب نمرات عالی و پیشرفت محسوس در ارزشیابی‌های مستمر',
        logoKey: 'lightbulb-outline',
        pointRangeLabel: '۲۰ تا ۵۰ نوین',
        sortOrder: 2,
        status: GuidanceCardStatus.ACTIVE,
      },
      {
        categoryId: disciplinaryCat.id,
        title: 'حضور به موقع و نظم در ورود به کلاس',
        description: 'رعایت دقیق زمان‌بندی کلاسی و عدم تاخیر در طول هفته',
        logoKey: 'shield',
        pointRangeLabel: '۱۰ تا ۲۰ نوین',
        sortOrder: 1,
        status: GuidanceCardStatus.ACTIVE,
      },
      {
        categoryId: culturalCat.id,
        title: 'کسب رتبه در مسابقات ورزشی یا فرهنگی',
        description: 'حضور و درخشش در رویدادها، مسابقات ورزشی یا فرهنگی مدرسه‌ای و منطقه‌ای',
        logoKey: 'trophy',
        pointRangeLabel: '۵۰ تا ۱۰۰ نوین',
        sortOrder: 1,
        status: GuidanceCardStatus.ACTIVE,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Seeded Guidance Categories & Cards');

  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
