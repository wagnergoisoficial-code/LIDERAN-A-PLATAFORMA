const { PrismaClient } = require('@prisma/client');

class ChurchRepository {
  constructor() {
    this.prisma = new PrismaClient();
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
      include: { users: true },
    });
  }

  async findById(id) {
    return this.prisma.church.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
            title: true,
          },
        },
        posts: true,
        devotionals: true,
        _count: {
          select: {
            users: true,
            posts: true,
          },
        },
      },
    });
  }

  async findByLeaderId(leaderID) {
    return this.prisma.church.findMany({
      where: { leaderID },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  async update(id, data) {
    return this.prisma.church.update({
      where: { id },
      data: {
        name: data.name || undefined,
        title: data.title || undefined,
        description: data.description || undefined,
        imageUrl: data.imageUrl || undefined,
        cultosDias: data.cultosDias ? JSON.stringify(data.cultosDias) : undefined,
      },
      include: { users: true },
    });
  }

  async delete(id) {
    return this.prisma.church.delete({
      where: { id },
    });
  }

  async getMembers(churchId) {
    return this.prisma.user.findMany({
      where: { churchId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImage: true,
        title: true,
        location: true,
        age: true,
        createdAt: true,
      },
    });
  }

  async addMemberToChurch(userId, churchId) {
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
      data: {
        name: data.name || undefined,
        title: data.title !== undefined ? data.title : undefined,
        location: data.location !== undefined ? data.location : undefined,
        age: data.age !== undefined ? data.age : undefined,
      },
    });
  }

  async getMemberById(userId, churchId) {
    return this.prisma.user.findFirst({
      where: { id: userId, churchId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImage: true,
        title: true,
        location: true,
        age: true,
      },
    });
  }

  async getMemberStats(churchId) {
    const members = await this.prisma.user.findMany({
      where: { churchId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            posts: { where: { churchId } },
            comments: { where: { post: { churchId } } },
            messages: { where: { churchId } },
          },
        },
      },
    });

    const withTotals = members.map(m => ({
      userId: m.id,
      name: m.name,
      posts: m._count.posts,
      comments: m._count.comments,
      messages: m._count.messages,
      total: m._count.posts + m._count.comments + m._count.messages,
    }));

    const grandTotal = withTotals.reduce((acc, m) => acc + m.total, 0);

    return withTotals.map(m => ({
      ...m,
      percentage: grandTotal > 0 ? Math.round((m.total / grandTotal) * 100) : 0,
    }));
  }
}

module.exports = new ChurchRepository();
