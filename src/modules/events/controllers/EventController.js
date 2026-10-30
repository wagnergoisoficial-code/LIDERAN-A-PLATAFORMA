class EventController {
  constructor(eventService) {
    this.eventService = eventService;
  }

  format(event, userId) {
    const myAttendance = event.attendances?.find(a => a.userId === userId);
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      imageUrl: event.imageUrl,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      goingCount: event.attendances?.filter(a => a.status === 'going').length || 0,
      maybeCount: event.attendances?.filter(a => a.status === 'maybe').length || 0,
      myStatus: myAttendance?.status || null,
      attendees: event.attendances?.filter(a => a.status === 'going').map(a => ({
        id: a.user.id, name: a.user.name, profileImage: a.user.profileImage,
      })) || [],
    };
  }

  async create(req, res, next) {
    try {
      const event = await this.eventService.createEvent({
        ...req.body,
        userId: req.user.id,
        churchId: req.user.churchId,
      });
      res.status(201).json({ success: true, data: this.format(event, req.user.id) });
    } catch (e) { next(e); }
  }

  async getAll(req, res, next) {
    try {
      const events = await this.eventService.getEvents(req.user.churchId);
      res.json({ success: true, data: events.map(e => this.format(e, req.user.id)) });
    } catch (e) { next(e); }
  }

  async getById(req, res, next) {
    try {
      const event = await this.eventService.getEventById(req.params.id);
      res.json({ success: true, data: this.format(event, req.user.id) });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const event = await this.eventService.updateEvent(req.params.id, req.user.id, req.user.role, req.body);
      res.json({ success: true, data: event });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      await this.eventService.deleteEvent(req.params.id, req.user.id, req.user.role);
      res.json({ success: true, message: 'Event deleted' });
    } catch (e) { next(e); }
  }

  async rsvp(req, res, next) {
    try {
      const { status } = req.body; // going, maybe, not_going, none
      await this.eventService.rsvp(req.params.id, req.user.id, status || 'going');
      res.json({ success: true, message: 'RSVP updated' });
    } catch (e) { next(e); }
  }
}

module.exports = EventController;
