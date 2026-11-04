const config = require('../src/config/environment');
const { getPrismaClient } = require('../src/config/database');
const bcrypt = require('bcrypt');

// As contas do seed usam senhas de teste conhecidas: nunca em produção
if (config.isProduction()) {
  console.error('❌ O seed cria contas com senhas de teste e não pode correr em produção.');
  process.exit(1);
}

const prisma = getPrismaClient();

// Seed database with initial data
async function main() {
  console.log('🌱 Starting database seed...');

  const hashedPassword = await bcrypt.hash('Password123', 10);

  // Admin e líder são criados com upsert para o seed também poder ser
  // executado novamente sem falhar por e-mail duplicado.
  const admin = await prisma.user.upsert({
    where: { email: 'admin@system.com' },
    update: { name: 'System Admin', password: hashedPassword, role: 'admin' },
    create: {
      email: 'admin@system.com',
      name: 'System Admin',
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log(`✅ Admin user ready: ${admin.email}`);

  // O líder só recebe a comunidade do seed se ainda não tiver uma:
  // numa base já em uso, não sai da comunidade onde está
  const existing = await prisma.user.findUnique({ where: { email: 'leader@church.com' }, select: { churchId: true } });
  const churchId = existing?.churchId || (await prisma.church.upsert({
    where: { id: 'seed_church_lidera' },
    update: { name: 'Comunidade Lidera', title: 'Comunidade Lidera' },
    create: {
      id: 'seed_church_lidera',
      name: 'Comunidade Lidera',
      title: 'Comunidade Lidera',
      description: 'Comunidade principal criada para testes da plataforma.',
    },
  })).id;

  const leader = await prisma.user.upsert({
    where: { email: 'leader@church.com' },
    update: { name: 'Church Leader', password: hashedPassword, role: 'leader', churchId },
    create: {
      email: 'leader@church.com',
      name: 'Church Leader',
      password: hashedPassword,
      role: 'leader',
      churchId,
    },
  });
  if (!existing?.churchId) {
    await prisma.church.update({ where: { id: churchId }, data: { leaderID: leader.id } });
  }
  console.log(`✅ Leader user ready: ${leader.email}`);

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
