import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Denim Crafts EYE Production Monitoring database...');

  const adminEmail = process.env.FIRST_ADMIN_EMAIL || 'admin@denimcrafts.com';
  const adminName = process.env.FIRST_ADMIN_NAME || 'Usman Tariq';
  const adminId = 'usr-admin-seed-01';

  // 1. Seed Profiles
  const adminUser = await prisma.profile.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      id: adminId,
      fullName: adminName,
      email: adminEmail,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const managerUser = await prisma.profile.upsert({
    where: { email: 'manager@denimcrafts.com' },
    update: {},
    create: {
      id: 'usr-manager-seed-02',
      fullName: 'Rashid Khan',
      email: 'manager@denimcrafts.com',
      role: 'MANAGER',
      isActive: true,
    },
  });

  const merchUser = await prisma.profile.upsert({
    where: { email: 'merch@denimcrafts.com' },
    update: {},
    create: {
      id: 'usr-merch-seed-03',
      fullName: 'Bilal Ahmed',
      email: 'merch@denimcrafts.com',
      role: 'MERCHANDISER',
      isActive: true,
    },
  });

  // 2. Settings
  await prisma.setting.upsert({
    where: { key: 'staleDays' },
    update: { value: '5' },
    create: { key: 'staleDays', value: '5' },
  });

  await prisma.setting.upsert({
    where: { key: 'companyName' },
    update: { value: 'Denim Crafts' },
    create: { key: 'companyName', value: 'Denim Crafts' },
  });

  // 3. Seed Sample DCs for Denim Crafts Stitching Lines
  const today = new Date();
  const getOffsetDate = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return d;
  };

  // Sample DC 1: Active Stitching Line 1
  const dc1 = await prisma.challan.upsert({
    where: { dcNo: 'DC-ST-9041' },
    update: {},
    create: {
      dcNo: 'DC-ST-9041',
      openDate: getOffsetDate(8),
      openingQty: 5000,
      party: 'Artistic Milliners / Unit 4',
      article: 'Indigo Selvedge 13.5oz Jeans',
      remarks: 'Cutting to Stitching Line 1 - Front & Back Assembly',
      status: 'OPEN',
      createdById: adminUser.id,
      entries: {
        create: [
          {
            entryDate: getOffsetDate(7),
            type: 'OUT',
            qty: 300,
            note: 'Sent to Line 1 front panel stitching',
            createdById: merchUser.id,
          },
          {
            entryDate: getOffsetDate(5),
            type: 'OUT',
            qty: 800,
            note: 'Sent to back pocket attach unit',
            createdById: merchUser.id,
          },
          {
            entryDate: getOffsetDate(2),
            type: 'IN',
            qty: 200,
            note: 'Recut replacement pieces received from cutting room',
            createdById: managerUser.id,
          },
          {
            entryDate: getOffsetDate(1),
            type: 'OUT',
            qty: 2000,
            note: 'Dispatched to bar-tack and waistband assembly',
            createdById: adminUser.id,
          },
        ],
      },
    },
  });

  // Sample DC 2: Closed Stitching Line 2 (Balance hit exactly 0)
  const dc2 = await prisma.challan.upsert({
    where: { dcNo: 'DC-ST-9020' },
    update: {},
    create: {
      dcNo: 'DC-ST-9020',
      openDate: getOffsetDate(14),
      openingQty: 3200,
      party: 'Soorty Enterprises / Line 2',
      article: 'Stretch Denim Chino 10.5oz',
      remarks: 'Stitching Line 2 - Pocket Attach & Overlock',
      status: 'CLOSED',
      closedDate: getOffsetDate(3),
      createdById: managerUser.id,
      entries: {
        create: [
          {
            entryDate: getOffsetDate(12),
            type: 'OUT',
            qty: 1200,
            note: 'Batch 1 stitching overlock',
            createdById: managerUser.id,
          },
          {
            entryDate: getOffsetDate(10),
            type: 'OUT',
            qty: 1000,
            note: 'Batch 2 pocket attach complete',
            createdById: merchUser.id,
          },
          {
            entryDate: getOffsetDate(3),
            type: 'OUT',
            qty: 1000,
            note: 'Final batch stitching complete - lot cleared to washing',
            createdById: managerUser.id,
          },
        ],
      },
    },
  });

  // Sample DC 3: Stale Challan (> 5 days without entry)
  const dc3 = await prisma.challan.upsert({
    where: { dcNo: 'DC-ST-9005' },
    update: {},
    create: {
      dcNo: 'DC-ST-9005',
      openDate: getOffsetDate(12),
      openingQty: 4500,
      party: 'Al-Karam Textile Mills',
      article: 'Vintage Wash Heavy Twill 14oz',
      remarks: 'Stitching Line 3 - Waistband & Hemming',
      status: 'OPEN',
      createdById: merchUser.id,
      entries: {
        create: [
          {
            entryDate: getOffsetDate(10),
            type: 'OUT',
            qty: 1500,
            note: 'Line 3 side seam run',
            createdById: merchUser.id,
          },
          {
            entryDate: getOffsetDate(7),
            type: 'OUT',
            qty: 1000,
            note: 'Hemming section partial dispatch',
            createdById: merchUser.id,
          },
        ],
      },
    },
  });

  console.log(`Seeded 3 sample stitching line DCs: ${dc1.dcNo}, ${dc2.dcNo}, ${dc3.dcNo}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
