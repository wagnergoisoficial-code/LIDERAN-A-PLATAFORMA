const { getPrismaClient } = require('../../config/database');
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require('../../shared/errors/AppError');
const { notifyUsers, notifyUser } = require('../../shared/utils/notifier');

// Campos obrigatórios do pedido e como pedi-los ao líder
const FIELDS = {
  churchName: 'a igreja onde é líder',
  position: 'o seu cargo na igreja',
  city: 'a cidade',
  region: 'a província ou o estado',
  country: 'o país',
  phone: 'um telefone de contacto',
};
const STATUSES = ['pending', 'approved', 'rejected'];
const DOCUMENT_SELECT = { id: true, kind: true, mimeType: true, size: true, createdAt: true };
const clean = (value, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Verificação de líderes: o líder envia os dados da igreja e documentos; o administrador decide
class LeaderVerificationService {
  get prisma() {
    return getPrismaClient();
  }

  async mine(user) {
    const verification = await this.prisma.leaderVerification.findUnique({
      where: { userId: user.id },
      include: { documents: { select: DOCUMENT_SELECT } },
    });
    return { verified: user.role === 'admin' || !!user.leaderVerifiedAt, verification };
  }

  async submit(user, body, documents) {
    if (user.role !== 'leader') throw new ForbiddenError('Só contas de líder pedem verificação');
    if (user.leaderVerifiedAt) throw new ConflictError('A sua conta de líder já está verificada');

    const data = {};
    for (const [key, label] of Object.entries(FIELDS)) {
      data[key] = clean(body[key]);
      if (data[key].length < 2) throw new ValidationError(`Indique ${label}`);
    }
    data.address = clean(body.address) || null;

    const kinds = new Set(documents.map((d) => d.kind));
    if (!kinds.has('identity')) throw new ValidationError('Anexe um documento de identificação');
    if (!kinds.has('leadership')) throw new ValidationError('Anexe um documento que comprove a liderança (carta ou credencial da igreja)');

    const existing = await this.prisma.leaderVerification.findUnique({ where: { userId: user.id } });
    if (existing?.status === 'pending') throw new ConflictError('O seu pedido de verificação já está em análise');

    // Um pedido recusado é substituído pelo novo (os documentos antigos saem em cascata)
    const verification = await this.prisma.$transaction(async (tx) => {
      if (existing) await tx.leaderVerification.delete({ where: { id: existing.id } });
      return tx.leaderVerification.create({
        data: {
          ...data,
          userId: user.id,
          documents: { create: documents.map((d) => ({ kind: d.kind, mimeType: d.mimeType, size: d.data.length, data: d.data })) },
        },
        include: { documents: { select: DOCUMENT_SELECT } },
      });
    });

    const admins = await this.prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
    await notifyUsers(admins.map((a) => a.id), {
      type: 'leader_verification',
      title: 'Novo pedido de verificação de líder',
      body: `${user.name} · ${data.churchName}`,
      linkId: verification.id,
      linkType: 'verification',
    });
    return verification;
  }

  // Só o próprio líder e os administradores abrem os documentos
  async document(user, documentId) {
    const document = await this.prisma.leaderDocument.findUnique({
      where: { id: documentId },
      include: { verification: { select: { userId: true } } },
    });
    if (!document || (user.role !== 'admin' && document.verification.userId !== user.id)) {
      throw new NotFoundError('Documento não encontrado');
    }
    return document;
  }

  async list(status) {
    return this.prisma.leaderVerification.findMany({
      where: STATUSES.includes(status) ? { status } : {},
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        documents: { select: DOCUMENT_SELECT },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async review(admin, id, { status, reason }) {
    if (!['approved', 'rejected'].includes(status)) throw new ValidationError('Decisão inválida');
    const note = clean(reason, 500) || null;
    if (status === 'rejected' && !note) throw new ValidationError('Indique o motivo da recusa');

    const verification = await this.prisma.leaderVerification.findUnique({ where: { id } });
    if (!verification) throw new NotFoundError('Pedido de verificação não encontrado');

    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.leaderVerification.update({
        where: { id },
        data: { status, reason: status === 'rejected' ? note : null, reviewedAt: now, reviewedById: admin.id },
        include: { user: { select: { id: true, name: true, email: true, createdAt: true } }, documents: { select: DOCUMENT_SELECT } },
      }),
      this.prisma.user.update({ where: { id: verification.userId }, data: { leaderVerifiedAt: status === 'approved' ? now : null } }),
    ]);

    await notifyUser(verification.userId, status === 'approved'
      ? { type: 'verification_approved', title: 'Conta de líder verificada', body: 'Já pode criar a sua comunidade.', linkId: id, linkType: 'verification' }
      : { type: 'verification_rejected', title: 'Verificação recusada', body: note, linkId: id, linkType: 'verification' });
    return updated;
  }
}

module.exports = new LeaderVerificationService();
