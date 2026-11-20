const { NotFoundError, ValidationError } = require('../../../shared/errors/AppError');
const { requireChurch, assertSameChurch, assertLeader } = require('../../../shared/utils/church.util');
const { notifyChurch } = require('../../../shared/utils/notifier');

const text = (value) => (typeof value === 'string' ? value.trim() : '');

class SermonService {
  constructor(repo) { this.repo = repo; }

  buildData(dto, partial = false) {
    const data = {};

    if (!partial || dto.title !== undefined) {
      data.title = text(dto.title);
      if (data.title.length < 3) throw new ValidationError('O título deve ter pelo menos 3 caracteres');
    }
    if (!partial || dto.speaker !== undefined) {
      data.speaker = text(dto.speaker);
      if (data.speaker.length < 2) throw new ValidationError('Informe quem pregou');
    }
    if (!partial || dto.content !== undefined) {
      data.content = text(dto.content);
      if (data.content.length < 10) throw new ValidationError('As anotações devem ter pelo menos 10 caracteres');
    }
    if (dto.scriptureRef !== undefined) data.scriptureRef = text(dto.scriptureRef) || null;
    if (dto.date !== undefined && dto.date !== null && dto.date !== '') {
      data.date = new Date(dto.date);
      if (Number.isNaN(data.date.getTime())) throw new ValidationError('Data inválida');
    }

    return data;
  }

  async createSermon(dto, user) {
    assertLeader(user, 'Apenas líderes podem publicar pregações');
    const churchId = requireChurch(user);
    const sermon = await this.repo.create({ ...this.buildData(dto), churchId, authorId: user.id });

    await notifyChurch(churchId, user.id, {
      type: 'new_sermon',
      title: `Nova pregação: ${sermon.title}`,
      body: sermon.scriptureRef ? `${sermon.speaker} · ${sermon.scriptureRef}` : sermon.speaker,
      linkId: sermon.id,
      linkType: 'sermon',
    });

    return sermon;
  }

  async getSermons(user) {
    if (!user.churchId) return [];
    return this.repo.findAll(user.churchId);
  }

  async getSermonById(id, user) {
    const sermon = await this.repo.findById(id);
    if (!sermon) throw new NotFoundError('Pregação não encontrada');
    assertSameChurch(user, sermon.churchId, 'Pregação não encontrada');
    return sermon;
  }

  async updateSermon(id, dto, user) {
    assertLeader(user, 'Apenas líderes podem editar pregações');
    await this.getSermonById(id, user);
    return this.repo.update(id, this.buildData(dto, true));
  }

  async deleteSermon(id, user) {
    assertLeader(user, 'Apenas líderes podem excluir pregações');
    await this.getSermonById(id, user);
    return this.repo.delete(id);
  }
}

module.exports = SermonService;
