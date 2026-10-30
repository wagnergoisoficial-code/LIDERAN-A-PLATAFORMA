const { NotFoundError, ForbiddenError } = require('../../../shared/errors/AppError');

class EventService {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async createEvent(dto) {
    return this.eventRepository.create({
      title: dto.title,
      description: dto.description,
      location: dto.location,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      imageUrl: dto.imageUrl,
      churchId: dto.churchId,
      createdBy: dto.userId,
    });
  }

  async getEvents(churchId) {
    return this.eventRepository.findAll(churchId);
  }

  async getEventById(id) {
    const event = await this.eventRepository.findById(id);
    if (!event) throw new NotFoundError('Event not found');
    return event;
  }

  async updateEvent(id, userId, role, data) {
    const event = await this.getEventById(id);
    if (event.createdBy !== userId && role !== 'admin') throw new ForbiddenError('Not authorized');
    return this.eventRepository.update(id, data);
  }

  async deleteEvent(id, userId, role) {
    const event = await this.getEventById(id);
    if (event.createdBy !== userId && role !== 'admin') throw new ForbiddenError('Not authorized');
    return this.eventRepository.delete(id);
  }

  async rsvp(eventId, userId, status) {
    await this.getEventById(eventId);
    if (status === 'none') return this.eventRepository.deleteAttendance(eventId, userId);
    return this.eventRepository.upsertAttendance(eventId, userId, status);
  }
}

module.exports = EventService;
