export default {
  routes: [
    { method: 'GET', path: '/events', handler: 'api::event.event.find' },
    { method: 'POST', path: '/events/:id/rsvp', handler: 'api::event.event.rsvp', config: { policies: ['global::rate-limit'] } },
  ],
};
