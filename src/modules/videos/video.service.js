const { getPrismaClient } = require('../../config/database');
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require('../../shared/errors/AppError');
const { requireChurch, canManageChurch, isLeaderOrAdmin } = require('../../shared/utils/church.util');
const { notifyUsers, notifyUser } = require('../../shared/utils/notifier');

const CATEGORIES = ['pregacao', 'hino', 'membro'];
const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtube-nocookie.com', 'youtube-nocookie.com'];
const VIDEO_ID = /^[\w-]{11}$/;
const INCLUDE = {
  user: { select: { id: true, name: true, profileImage: true } },
  church: { select: { id: true, name: true, leaderID: true } },
};

// Identificador do vídeo a partir dos formatos de link do YouTube (watch, youtu.be, shorts, embed, live)
const youtubeId = (link) => {
  let url;
  try {
    url = new URL(String(link || '').trim());
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || !YOUTUBE_HOSTS.includes(url.hostname)) return null;
  const id = url.hostname === 'youtu.be'
    ? url.pathname.slice(1)
    : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1];
  return VIDEO_ID.test(id || '') ? id : null;
};

const format = (video) => ({
  id: video.id,
  title: video.title,
  description: video.description,
  category: video.category,
  provider: video.provider,
  sourceId: video.sourceId,
  status: video.status,
  reason: video.reason,
  createdAt: video.createdAt,
  author: video.user ? { id: video.user.id, name: video.user.name, profileImage: video.user.profileImage } : null,
  church: video.church ? { id: video.church.id, name: video.church.name } : null,
});

// Vídeos: quem é da comunidade envia; o líder aprova; aprovados aparecem para todas as comunidades
class VideoService {
  get prisma() {
    return getPrismaClient();
  }

  async list(user) {
    const approved = await this.prisma.video.findMany({
      where: { status: 'approved' },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    // Líderes veem o que espera aprovação na comunidade deles; os outros, o que enviaram
    const waiting = !user.churchId && user.role !== 'admin' ? [] : await this.prisma.video.findMany({
      where: isLeaderOrAdmin(user)
        ? { status: 'pending', ...(user.role !== 'admin' && { churchId: user.churchId }) }
        : { userId: user.id, status: { in: ['pending', 'rejected'] } },
      include: INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return { videos: approved.map(format), waiting: waiting.map(format) };
  }

  async create(user, { url, title, description, category }) {
    const churchId = requireChurch(user);
    const sourceId = youtubeId(url);
    if (!sourceId) throw new ValidationError('Cole o link de um vídeo do YouTube');
    const name = typeof title === 'string' ? title.trim() : '';
    if (name.length < 3 || name.length > 120) throw new ValidationError('O título deve ter entre 3 e 120 caracteres');
    if (!CATEGORIES.includes(category)) throw new ValidationError('Escolha o tipo do vídeo');
    const about = typeof description === 'string' ? description.trim().slice(0, 1000) : '';

    const repeated = await this.prisma.video.findFirst({
      where: { churchId, sourceId, status: { in: ['pending', 'approved'] } },
    });
    if (repeated) throw new ConflictError('Este vídeo já foi enviado nesta comunidade');

    // O vídeo do líder não espera por ninguém: é ele quem aprova
    const leader = isLeaderOrAdmin(user);
    const video = await this.prisma.video.create({
      data: {
        title: name,
        description: about || null,
        category,
        sourceId,
        churchId,
        userId: user.id,
        status: leader ? 'approved' : 'pending',
        ...(leader && { reviewedById: user.id, reviewedAt: new Date() }),
      },
      include: INCLUDE,
    });

    if (!leader) {
      const leaders = await this.prisma.user.findMany({
        where: { OR: [{ id: video.church.leaderID || undefined }, { churchId, role: 'leader' }] },
        select: { id: true },
      });
      await notifyUsers(leaders.map((l) => l.id).filter((id) => id !== user.id), {
        type: 'video_pending',
        title: 'Vídeo para aprovar',
        body: `${user.name}: ${name}`,
        linkId: video.id,
        linkType: 'video',
      });
    }
    return format(video);
  }

  async findManageable(user, id) {
    const video = await this.prisma.video.findUnique({ where: { id }, include: INCLUDE });
    if (!video) throw new NotFoundError('Vídeo não encontrado');
    if (!canManageChurch(user, video.church)) throw new ForbiddenError('Só os líderes da comunidade de quem enviou podem decidir sobre este vídeo');
    return video;
  }

  async review(user, id, { status, reason }) {
    if (!['approved', 'rejected'].includes(status)) throw new ValidationError('Decisão inválida');
    const video = await this.findManageable(user, id);
    const note = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';

    const updated = await this.prisma.video.update({
      where: { id },
      data: { status, reason: status === 'rejected' ? note || null : null, reviewedById: user.id, reviewedAt: new Date() },
      include: INCLUDE,
    });
    if (video.userId !== user.id) {
      await notifyUser(video.userId, status === 'approved'
        ? { type: 'video_approved', title: 'Vídeo aprovado', body: `${video.title} já aparece para todas as comunidades`, linkId: id, linkType: 'video' }
        : { type: 'video_rejected', title: 'Vídeo recusado', body: note || video.title, linkId: id, linkType: 'video' });
    }
    return format(updated);
  }

  async remove(user, id) {
    const video = await this.prisma.video.findUnique({ where: { id }, include: INCLUDE });
    if (!video) throw new NotFoundError('Vídeo não encontrado');
    if (video.userId !== user.id && !canManageChurch(user, video.church)) {
      throw new ForbiddenError('Só quem enviou o vídeo ou os líderes da comunidade o podem apagar');
    }
    await this.prisma.video.delete({ where: { id } });
  }
}

module.exports = new VideoService();
module.exports.youtubeId = youtubeId;
