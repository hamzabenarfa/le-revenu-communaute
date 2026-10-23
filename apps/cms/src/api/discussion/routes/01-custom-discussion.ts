export default {
  routes: [
    { method: 'GET', path: '/discussions/slug/:slug', handler: 'api::discussion.discussion.findBySlug' },
    { method: 'GET', path: '/discussions/featured', handler: 'api::discussion.discussion.featured' },
    { method: 'GET', path: '/discussions/similar', handler: 'api::discussion.discussion.similar' },
    { method: 'GET', path: '/search', handler: 'api::discussion.discussion.search' },
    { method: 'PUT', path: '/discussions/:id/solution', handler: 'api::discussion.discussion.solution', config: { policies: ['global::rate-limit'] } },
    { method: 'POST', path: '/discussions/:id/vote', handler: 'api::discussion.discussion.vote', config: { policies: ['global::rate-limit'] } },
    { method: 'POST', path: '/discussions/:id/follow', handler: 'api::discussion.discussion.follow', config: { policies: ['global::rate-limit'] } },
  ],
};
