const { PrismaClient } = require('@prisma/client');

let prisma;

// Singleton pattern for Prisma Client
const getPrismaClient = () => {
  if (!prisma) {
    prisma = new PrismaClient();

    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query', (e) => {
        console.log('Query: ' + e.query);
        console.log('Params: ' + e.params);
        console.log('Duration: ' + e.duration + 'ms');
      });
    }
  }

  return prisma;
};

// Graceful shutdown
const disconnectPrisma = async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
};

module.exports = {
  getPrismaClient,
  disconnectPrisma,
};
