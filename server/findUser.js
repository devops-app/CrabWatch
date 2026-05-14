const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, firebaseUid: true, deletedAt: true, createdAt: true }
  });
  console.log('All users:', JSON.stringify(allUsers, null, 2));
  console.log('Total:', allUsers.length);
  await prisma.$disconnect();
})();
