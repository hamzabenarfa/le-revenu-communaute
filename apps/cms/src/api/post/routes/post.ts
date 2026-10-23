export default {
  routes: [
    { method: 'GET', path: '/posts', handler: 'api::post.post.find' },
    { method: 'GET', path: '/posts/slug/:slug', handler: 'api::post.post.findBySlug' },
    { method: 'POST', path: '/posts', handler: 'api::post.post.create', config: { policies: ['global::rate-limit'] } },
    { method: 'POST', path: '/comments', handler: 'api::post.post.comment', config: { policies: ['global::rate-limit'] } },
  ],
};
