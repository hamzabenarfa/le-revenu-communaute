export default {
  routes: [{ method: 'POST', path: '/usefuls/toggle', handler: 'api::useful.useful.toggle', config: { policies: ['global::rate-limit'] } }],
};
