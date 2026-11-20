const crypto = require('crypto');
const { getPrismaClient } = require('../../config/database');
const { isUploadUrl } = require('../../shared/utils/url.util');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../shared/errors/AppError');
const { requireChurch, canManageChurch, hasCargo, CARGOS } = require('../../shared/utils/church.util');
const { isMinor } = require('../../shared/utils/minor.util');
const { notifyUser } = require('../../shared/utils/notifier');

const CARGO_NAMES = { secretario: 'secretário(a)', tesoureiro: 'tesoureiro(a)', regente: 'regente' };
const FINANCE_KINDS = ['entrada', 'saida'];
const DOCUMENT_KINDS = ['ata', 'recomendacao', 'transferencia', 'batismo', 'ficha', 'outro'];
const MAX_CENTS = 1000000000;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DOCUMENT_SELECT = {
  id: true, kind: true, title: true, date: true, memberId: true, notes: true,
  mimeType: true, size: true, createdById: true, createdAt: true,
};

// Doações: moedas aceites e a configuração de quem ainda não configurou nada
const CURRENCIES = ['USD', 'BRL', 'MZN', 'EUR', 'AOA', 'CVE'];
const NO_DONATIONS = { currency: 'USD', message: null, methods: [] };

const ROLL_CALL_INCLUDE = { present: { select: { userId: true } } };
const formatRollCall = (r) => ({ id: r.id, date: r.date, title: r.title, createdById: r.createdById, presentIds: r.present.map((p) => p.userId) });

const prisma = () => getPrismaClient();

// Texto opcional (ou obrigatório) com limite de tamanho; label leva o artigo: "o título"
const text = (value, max, label, required = false) => {
  const clean = typeof value === 'string' ? value.trim() : '';
  if (!clean) {
    if (required) throw new ValidationError(`Informe ${label}`);
    return null;
  }
  if (clean.length > max) {
    const noun = label.slice(label.indexOf(' ') + 1);
    throw new ValidationError(`${noun[0].toUpperCase()}${noun.slice(1)}: no máximo ${max} caracteres`);
  }
  return clean;
};

const dateOf = (value, required = false) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError('Informe a data');
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ValidationError('Data inválida');
  return date;
};

const linkOf = (value) => {
  const link = text(value, 500, 'o link');
  if (!link) return null;
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new ValidationError('Link inválido');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new ValidationError('O link deve começar por http:// ou https://');
  return link;
};

// O painel trabalha sempre na comunidade ativa de quem o abre
const panelChurch = async (user, cargo) => {
  const church = await prisma().church.findUnique({ where: { id: requireChurch(user) } });
  if (!church) throw new NotFoundError('Comunidade não encontrada');
  if (!hasCargo(user, church, cargo)) throw new ForbiddenError('Este painel é só para a liderança e para quem tem o cargo');
  return church;
};

const memberOf = async (churchId, memberId) => {
  if (!memberId) return null;
  const member = await prisma().user.findFirst({ where: { id: String(memberId), churchId }, select: { id: true } });
  if (!member) throw new ValidationError('Membro não encontrado nesta comunidade');
  return member.id;
};

// Uma forma de doar: dados da conta, chave Pix (gera o QR com o valor) e/ou a imagem de um QR Code
const donationMethod = (m = {}) => {
  const method = {
    id: typeof m.id === 'string' && /^[\w-]{1,40}$/.test(m.id) ? m.id : crypto.randomUUID(),
    label: text(m.label, 60, 'o nome da forma de doar', true),
    details: text(m.details, 500, 'os dados da conta'),
    pixKey: text(m.pixKey, 100, 'a chave Pix'),
    pixName: text(m.pixName, 25, 'o nome do recebedor'),
    pixCity: text(m.pixCity, 15, 'a cidade'),
    qrUrl: m.qrUrl ? String(m.qrUrl) : null,
  };
  if (method.qrUrl && !isUploadUrl(method.qrUrl)) throw new ValidationError('Imagem do QR Code inválida');
  if (method.pixKey && (!method.pixName || !method.pixCity)) {
    throw new ValidationError('Para gerar o QR Pix, indique o nome do recebedor e a cidade');
  }
  if (!method.details && !method.pixKey && !method.qrUrl) {
    throw new ValidationError(`Indique os dados da conta, a chave Pix ou o QR Code de "${method.label}"`);
  }
  return method;
};

const songData = (body) => ({
  title: text(body.title, 120, 'o título', true),
  artist: text(body.artist, 120, 'o autor'),
  musicKey: text(body.musicKey, 10, 'o tom'),
  link: linkOf(body.link),
  notes: text(body.notes, 2000, 'as observações'),
});

module.exports = {
  panelChurch,

  /* ─── Cargos (só a liderança atribui) ─── */
  async setCargo(user, memberId, value) {
    const church = await prisma().church.findUnique({ where: { id: requireChurch(user) } });
    if (!church || !canManageChurch(user, church)) throw new ForbiddenError('Apenas a liderança desta comunidade atribui cargos');
    const cargo = value === undefined || value === null || value === '' ? null : value;
    if (cargo !== null && !CARGOS.includes(cargo)) throw new ValidationError('Cargo inválido');

    const member = await prisma().user.findFirst({
      where: { id: memberId, churchId: church.id },
      select: { id: true, birthDate: true, age: true, status: true, cargo: true },
    });
    if (!member) throw new NotFoundError('Membro não encontrado nesta comunidade');
    if (cargo && (member.status !== 'active' || isMinor(member))) {
      throw new ValidationError('Só membros adultos e ativos podem ter um cargo');
    }
    if (member.cargo === cargo) return { id: member.id, cargo };

    await prisma().user.update({ where: { id: member.id }, data: { cargo } });
    await notifyUser(member.id, cargo
      ? { type: 'cargo', title: `Você agora é ${CARGO_NAMES[cargo]} de ${church.name}`, body: 'Acesse o seu painel pelo menu da sua conta.', linkType: 'panel' }
      : { type: 'cargo', title: `Você deixou de ter cargo em ${church.name}`, body: 'Continua sendo membro da comunidade.' });
    return { id: member.id, cargo };
  },

  /* ─── Tesouraria ─── */
  // Lançamentos (de um mês, se pedido) e o saldo de sempre
  async listFinance(user, { month } = {}) {
    const church = await panelChurch(user, 'tesoureiro');
    const where = { churchId: church.id };
    if (month) {
      if (!MONTH.test(month)) throw new ValidationError('Mês inválido');
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      where.date = { gte: start, lt: end };
    }
    const [entries, totals] = await Promise.all([
      prisma().financeEntry.findMany({ where, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 2000 }),
      prisma().financeEntry.groupBy({ by: ['kind'], where: { churchId: church.id }, _sum: { amountCents: true } }),
    ]);
    const sum = (kind) => totals.find((t) => t.kind === kind)?._sum.amountCents || 0;
    return { entries, balanceCents: sum('entrada') - sum('saida') };
  },

  async createFinance(user, body = {}) {
    const church = await panelChurch(user, 'tesoureiro');
    if (!FINANCE_KINDS.includes(body.kind)) throw new ValidationError('Escolha entrada ou saída');
    const amountCents = Math.round(Number(String(body.amount ?? '').replace(',', '.')) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > MAX_CENTS) throw new ValidationError('Valor inválido');
    return prisma().financeEntry.create({
      data: {
        kind: body.kind,
        category: text(body.category, 60, 'a categoria', true),
        amountCents,
        date: dateOf(body.date, true),
        description: text(body.description, 300, 'a descrição'),
        memberId: await memberOf(church.id, body.memberId),
        createdById: user.id,
        churchId: church.id,
      },
    });
  },

  async removeFinance(user, id) {
    const church = await panelChurch(user, 'tesoureiro');
    const { count } = await prisma().financeEntry.deleteMany({ where: { id, churchId: church.id } });
    if (!count) throw new NotFoundError('Lançamento não encontrado');
  },

  /* ─── Secretaria: documentos ─── */
  async listDocuments(user) {
    const church = await panelChurch(user, 'secretario');
    return prisma().churchDocument.findMany({ where: { churchId: church.id }, select: DOCUMENT_SELECT, orderBy: { createdAt: 'desc' }, take: 1000 });
  },

  // O livro de atas: sem tipo, o documento é uma ata
  async createDocument(user, body = {}, file = null) {
    const church = await panelChurch(user, 'secretario');
    const kind = body.kind || 'ata';
    if (!DOCUMENT_KINDS.includes(kind)) throw new ValidationError('Escolha o tipo de documento');
    return prisma().churchDocument.create({
      data: {
        kind,
        title: text(body.title, 120, 'o título', true),
        date: dateOf(body.date),
        memberId: await memberOf(church.id, body.memberId),
        // O texto de uma ata (presentes, assuntos e decisões) pode ser longo
        notes: text(body.notes, 20000, 'o texto'),
        mimeType: file?.mimeType || null,
        size: file ? file.data.length : null,
        data: file?.data || null,
        createdById: user.id,
        churchId: church.id,
      },
      select: DOCUMENT_SELECT,
    });
  },

  async documentFile(user, id) {
    const church = await panelChurch(user, 'secretario');
    const document = await prisma().churchDocument.findFirst({ where: { id, churchId: church.id }, select: { mimeType: true, data: true } });
    if (!document?.data) throw new NotFoundError('Arquivo não encontrado');
    return document;
  },

  async removeDocument(user, id) {
    const church = await panelChurch(user, 'secretario');
    const { count } = await prisma().churchDocument.deleteMany({ where: { id, churchId: church.id } });
    if (!count) throw new NotFoundError('Documento não encontrado');
  },

  /* ─── Doações pela app ─── */
  // Todos os membros veem as formas de doar da comunidade
  async getDonations(user) {
    const church = await prisma().church.findUnique({ where: { id: requireChurch(user) }, select: { donationConfig: true } });
    if (!church) throw new NotFoundError('Comunidade não encontrada');
    try {
      return { ...NO_DONATIONS, ...JSON.parse(church.donationConfig || '{}') };
    } catch {
      return NO_DONATIONS;
    }
  },

  // A tesouraria e a liderança escolhem a moeda e as formas de doar
  async saveDonations(user, body = {}) {
    const church = await panelChurch(user, 'tesoureiro');
    if (!CURRENCIES.includes(body.currency)) throw new ValidationError('Escolha a moeda');
    const methods = Array.isArray(body.methods) ? body.methods : [];
    if (methods.length > 8) throw new ValidationError('No máximo 8 formas de doar');
    const config = { currency: body.currency, message: text(body.message, 300, 'a mensagem'), methods: methods.map(donationMethod) };
    await prisma().church.update({ where: { id: church.id }, data: { donationConfig: JSON.stringify(config) } });
    return config;
  },

  /* ─── Secretaria: controle de presença ─── */
  async listRollCalls(user) {
    const church = await panelChurch(user, 'secretario');
    const rows = await prisma().rollCall.findMany({
      where: { churchId: church.id },
      include: ROLL_CALL_INCLUDE,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
    return rows.map(formatRollCall);
  },

  // Cria ou corrige uma chamada; a lista de presentes substitui a anterior
  async saveRollCall(user, body = {}, id = null) {
    const church = await panelChurch(user, 'secretario');
    const data = { date: dateOf(body.date, true), title: text(body.title, 80, 'o encontro', true) };
    const ids = [...new Set((Array.isArray(body.presentIds) ? body.presentIds : []).map(String))];
    const members = ids.length
      ? await prisma().user.findMany({ where: { id: { in: ids }, churchId: church.id }, select: { id: true } })
      : [];
    if (members.length !== ids.length) throw new ValidationError('Há pessoas na chamada que não são desta comunidade');

    return prisma().$transaction(async (tx) => {
      let rollCallId = id;
      if (id) {
        const { count } = await tx.rollCall.updateMany({ where: { id, churchId: church.id }, data });
        if (!count) throw new NotFoundError('Chamada não encontrada');
        await tx.rollCallPresence.deleteMany({ where: { rollCallId: id } });
      } else {
        rollCallId = (await tx.rollCall.create({ data: { ...data, createdById: user.id, churchId: church.id } })).id;
      }
      if (members.length) await tx.rollCallPresence.createMany({ data: members.map((m) => ({ rollCallId, userId: m.id })) });
      return formatRollCall(await tx.rollCall.findUnique({ where: { id: rollCallId }, include: ROLL_CALL_INCLUDE }));
    });
  },

  async removeRollCall(user, id) {
    const church = await panelChurch(user, 'secretario');
    const { count } = await prisma().rollCall.deleteMany({ where: { id, churchId: church.id } });
    if (!count) throw new NotFoundError('Chamada não encontrada');
  },

  /* ─── Regência: repertório ─── */
  async listSongs(user) {
    const church = await panelChurch(user, 'regente');
    return prisma().song.findMany({ where: { churchId: church.id }, orderBy: { title: 'asc' }, take: 2000 });
  },

  async createSong(user, body = {}) {
    const church = await panelChurch(user, 'regente');
    return prisma().song.create({ data: { ...songData(body), createdById: user.id, churchId: church.id } });
  },

  async updateSong(user, id, body = {}) {
    const church = await panelChurch(user, 'regente');
    const { count } = await prisma().song.updateMany({ where: { id, churchId: church.id }, data: songData(body) });
    if (!count) throw new NotFoundError('Música não encontrada');
    return prisma().song.findUnique({ where: { id } });
  },

  async removeSong(user, id) {
    const church = await panelChurch(user, 'regente');
    const { count } = await prisma().song.deleteMany({ where: { id, churchId: church.id } });
    if (!count) throw new NotFoundError('Música não encontrada');
  },
};
