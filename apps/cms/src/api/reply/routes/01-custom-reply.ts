export default {
  routes: [{ method: 'POST', path: '/replies/:id/verify', handler: 'api::reply.reply.verify', config: { policies: ['global::rate-limit'] } }],
};
