const { getPrismaClient } = require('../src/config/database');
const bcrypt = require('bcrypt');

const prisma = getPrismaClient();

// Seed database with initial data
async function main() {
  console.log('🌱 Starting database seed...');

  // Create users only
  const hashedPassword = await bcrypt.hash('Password123', 10);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@system.com',
      name: 'System Admin',
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create leader user
  const leader = await prisma.user.create({
    data: {
      email: 'leader@church.com',
      name: 'Church Leader',
      password: hashedPassword,
      role: 'leader',
    },
  });
  console.log(`✅ Leader user created: ${leader.email}`);

  console.log('\n✨ Database seed completed successfully!');
  console.log('\n📝 Initial Users:');
  console.log('   Admin:  admin@system.com / Password123');
  console.log('   Leader: leader@church.com / Password123');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
