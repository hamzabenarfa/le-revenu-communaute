export default {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/community/stats', handler: 'api::community.community.stats' },
    { method: 'GET', path: '/spaces', handler: 'api::community.community.spaces' },
    { method: 'GET', path: '/profiles/me', handler: 'api::community.community.me' },
    { method: 'PUT', path: '/profiles/me', handler: 'api::community.community.updateMe', config: { policies: ['global::rate-limit'] } },
    { method: 'POST', path: '/profiles/me/photo', handler: 'api::community.community.setPhoto', config: { policies: ['global::rate-limit'] } },
    { method: 'DELETE', path: '/profiles/me/photo', handler: 'api::community.community.deletePhoto', config: { policies: ['global::rate-limit'] } },
    { method: 'GET', path: '/profiles/:username', handler: 'api::community.community.profile' },
    { method: 'GET', path: '/profiles/:username/card', handler: 'api::community.community.card' },
    { method: 'GET', path: '/leaderboard', handler: 'api::community.community.leaderboard' },
    { method: 'GET', path: '/members/mentions', handler: 'api::community.community.mentions' },
    { method: 'GET', path: '/notifications/me', handler: 'api::community.community.notifications' },
    { method: 'POST', path: '/notifications/read-all', handler: 'api::community.community.readAll', config: { policies: ['global::rate-limit'] } },
    { method: 'POST', path: '/notifications/:id/read', handler: 'api::community.community.readOne', config: { policies: ['global::rate-limit'] } },
    { method: 'POST', path: '/reports', handler: 'api::community.community.report', config: { policies: ['global::rate-limit'] } },
  ],
};
