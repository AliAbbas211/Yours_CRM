const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function seed() {
  const count = await prisma.user.count();
  if (count === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@yourscrm.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      }
    });
    console.log('Admin created');
  } else {
    console.log('Admin already exists');
  }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
