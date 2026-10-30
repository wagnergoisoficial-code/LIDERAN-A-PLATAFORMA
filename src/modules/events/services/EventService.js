const { NotFoundError, ValidationError } = require('../../../shared/errors/AppError');
const {
  requireChurch,
  assertSameChurch,
  assertOwnerOrLeader,
  assertLeader,
} = require('../../../shared/utils/church.util');
const { notifyChurch } = require('../../../shared/utils/notifier');

const RSVP_STATUSES = ['going', 'maybe', 'not_going', 'none'];

const toDate = (value, label) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new ValidationError(`${label} inválida`);
  return date;
};

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

class EventService {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  // Valida e normaliza os campos editáveis (partial = edição)
  buildData(dto, partial = false) {
    const data = {};

    if (!partial || dto.title !== undefined) {
      const title = text(dto.title);
      if (!title || title.length < 3) throw new ValidationError('O título deve ter pelo menos 3 caracteres');
      data.title = title;
    }
    if (!partial || dto.startDate !== undefined) data.startDate = toDate(dto.startDate, 'Data de início');
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? toDate(dto.endDate, 'Data de término') : null;
    if (dto.description !== undefined) data.description = text(dto.description);
    if (dto.location !== undefined) data.location = text(dto.location);
    if (dto.imageUrl !== undefined) data.imageUrl = text(dto.imageUrl);

    return data;
  }

  assertDates(startDate, endDate) {
    if (startDate && endDate && endDate < startDate) {
      throw new ValidationError('O término não pode ser antes do início');
    }
  }

  async createEvent(dto, user) {
    assertLeader(user, 'Apenas líderes podem criar eventos');
    const churchId = requireChurch(user);
    const data = this.buildData(dto);
    this.assertDates(data.startDate, data.endDate);

    const event = await this.eventRepository.create({ ...data, churchId, createdBy: user.id });

    await notifyChurch(churchId, user.id, {
      type: 'new_event',
      title: `Novo evento: ${event.title}`,
      body: event.startDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
        + (event.location ? ` · ${event.location}` : ''),
      linkId: event.id,
      linkType: 'event',
    });

    return event;
  }

  async getEvents(user) {
    if (!user.churchId) return [];
    return this.eventRepository.findAll(user.churchId);
  }

  async getEventById(id, user) {
    const event = await this.eventRepository.findById(id);
    if (!event) throw new NotFoundError('Evento não encontrado');
    assertSameChurch(user, event.churchId, 'Evento não encontrado');
    return event;
  }

  async updateEvent(id, dto, user) {
    const event = await this.getEventById(id, user);
    assertOwnerOrLeader(user, event.createdBy, 'Você só pode editar os eventos que criou');

    const data = this.buildData(dto, true);
    this.assertDates(data.startDate || event.startDate, data.endDate === undefined ? event.endDate : data.endDate);

    await this.eventRepository.update(id, data);
    return this.eventRepository.findById(id);
  }

  async deleteEvent(id, user) {
    const event = await this.getEventById(id, user);
    assertOwnerOrLeader(user, event.createdBy, 'Você só pode excluir os eventos que criou');
    return this.eventRepository.delete(id);
  }

  async rsvp(eventId, user, status) {
    if (!RSVP_STATUSES.includes(status)) throw new ValidationError('Resposta de presença inválida');
    await this.getEventById(eventId, user);
    if (status === 'none') return this.eventRepository.deleteAttendance(eventId, user.id);
    return this.eventRepository.upsertAttendance(eventId, user.id, status);
  }
}

module.exports = EventService;
