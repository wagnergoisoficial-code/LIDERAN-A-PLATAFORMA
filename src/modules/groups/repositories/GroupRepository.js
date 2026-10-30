const { getPrismaClient } = require('../../../config/database');

class GroupRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  include() {
    return {
      leader: { select: { id: true, name: true, profileImage: true } },
      members: {
        include: { user: { select: { id: true, name: true, profileImage: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    };
  }

  async create(data) {
    return this.prisma.group.create({ data, include: this.include() });
  }

  async findAll(churchId) {
    return this.prisma.group.findMany({
      where: { churchId },
      include: this.include(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id) {
    return this.prisma.group.findUnique({ where: { id }, include: this.include() });
  }

  async update(id, data) {
    return this.prisma.group.update({ where: { id }, data, include: this.include() });
  }

  async delete(id) {
    return this.prisma.group.delete({ where: { id } });
  }

  async join(groupId, userId) {
    return this.prisma.groupMember.create({ data: { groupId, userId } });
  }

  async leave(groupId, userId) {
    return this.prisma.groupMember.deleteMany({ where: { groupId, userId } });
  }
}

module.exports = GroupRepository;
