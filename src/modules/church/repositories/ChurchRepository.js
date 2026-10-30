const { getPrismaClient } = require('../../../config/database');

const MEMBER_SELECT = {
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

class ChurchRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data) {
    return this.prisma.church.create({
      data: {
        name: data.name,
        title: data.title || null,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        cultosDias: data.cultosDias ? JSON.stringify(data.cultosDias) : null,
        leaderID: data.leaderID || null,
      },
    });
  }

  async findById(id) {
    return this.prisma.church.findUnique({
      where: { id },
      include: {
        users: { select: MEMBER_SELECT },
        _count: { select: { users: true, posts: true, events: true, devotionals: true } },
      },
    });
  }

  async findBasic(id) {
    return this.prisma.church.findUnique({ where: { id } });
  }

  async findByLeaderId(leaderID) {
    return this.prisma.church.findMany({
      where: leaderID ? { leaderID } : {},
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Campos ausentes ficam como estão; null ou texto vazio limpam o valor
  async update(id, data) {
    const clean = (value) => (value === undefined ? undefined : value || null);

    return this.prisma.church.update({
      where: { id },
      data: {
        name: data.name || undefined,
        title: clean(data.title),
        description: clean(data.description),
        imageUrl: clean(data.imageUrl),
        cultosDias: data.cultosDias === undefined ? undefined : JSON.stringify(data.cultosDias || []),
      },
    });
  }

  async delete(id) {
    return this.prisma.church.delete({ where: { id } });
  }

  async getMembers(churchId) {
    return this.prisma.user.findMany({
      where: { churchId },
      select: MEMBER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findUser(userId) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async setUserChurch(userId, churchId) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { churchId },
    });
  }

  async removeMemberFromChurch(userId, churchId) {
    return this.prisma.user.updateMany({
      where: { id: userId, churchId },
      data: { churchId: null },
    });
  }

  async updateMember(userId, churchId, data) {
    return this.prisma.user.updateMany({
      where: { id: userId, churchId },
      data,
    });
  }

  async getMemberById(userId, churchId) {
    return this.prisma.user.findFirst({
      where: { id: userId, churchId },
      select: MEMBER_SELECT,
    });
  }

  async getMemberStats(churchId) {
    const members = await this.prisma.user.findMany({
      where: { churchId },
      select: {
        id: true,
        name: true,
        profileImage: true,
        _count: {
          select: {
            posts: { where: { churchId } },
            comments: { where: { post: { churchId } } },
            messages: { where: { churchId } },
          },
        },
      },
    });

    const withTotals = members.map((m) => ({
      userId: m.id,
      name: m.name,
      profileImage: m.profileImage,
      posts: m._count.posts,
      comments: m._count.comments,
      messages: m._count.messages,
      total: m._count.posts + m._count.comments + m._count.messages,
    }));

    const grandTotal = withTotals.reduce((acc, m) => acc + m.total, 0);

    return withTotals
      .map((m) => ({
        ...m,
        percentage: grandTotal > 0 ? Math.round((m.total / grandTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }
}

module.exports = new ChurchRepository();
