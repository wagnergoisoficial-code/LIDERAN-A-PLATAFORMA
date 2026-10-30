const { getPrismaClient } = require('../../../config/database');

const LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  profileImage: true,
  title: true,
  location: true,
  age: true,
  createdAt: true,
};

class GetUserRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async findAll(churchId) {
    return this.prisma.user.findMany({
      where: { churchId },
      select: LIST_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id) {
    return this.prisma.user.findUnique({ where: { id }, select: LIST_SELECT });
  }
}

module.exports = GetUserRepository;
