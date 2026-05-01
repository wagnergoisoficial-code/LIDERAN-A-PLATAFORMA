const { getPrismaClient } = require('../../../config/database');

// User Repository for database operations
class GetUserRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async findAll(churchId) {
    return this.prisma.user.findMany({
      where: { churchId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async findById(id) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }
}

module.exports = GetUserRepository;
