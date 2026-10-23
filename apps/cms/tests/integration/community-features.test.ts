import type { Core } from '@strapi/strapi';
import request from 'supertest';
import { createMember, resetCommunityData, setupStrapi, teardownStrapi } from '../helpers/strapi';

type Member = Awaited<ReturnType<typeof createMember>>;

let app: Core.Strapi;
let alice: Member; // asks questions
let bob: Member; // answers
let carol: Member; // bystander
let staff: Member;
let categoryId: string;

const api = () => request(app.server.httpServer);
const auth = (jwt: string) => ({ Authorization: `Bearer ${jwt}` });

const discussionBody = (over: Record<string, unknown> = {}) => ({
  title: 'Comment bien démarrer un PEA ?',
  content: 'Je débute et je cherche des conseils.',
  type: 'question',
  category: categoryId,
  ...over,
});
const pollBody = (over: Record<string, unknown> = {}) => ({
  title: 'Quel support préférez-vous ?',
  type: 'poll',
  category: categoryId,
  pollOptions: ['PEA', 'Assurance-vie', 'CTO'],
  ...over,
});

async function createDiscussion(jwt: string, data: Record<string, unknown> = discussionBody()) {
  const res = await api().post('/api/discussions').set(auth(jwt)).send({ data });
  expect(res.status).toBe(201);
  return res.body.data as { documentId: string; slug: string };
}
async function createReply(jwt: string, discussion: string, content = 'Commencez par un ETF monde.') {
  const res = await api().post('/api/replies').set(auth(jwt)).send({ data: { content, discussion } });
  expect(res.status).toBe(201);
  return res;
}
const notificationsOf = async (member: Member) => (await api().get('/api/notifications/me').set(auth(member.jwt))).body.data as Array<{ kind: string; read: boolean; text: string }>;
const clearData = async () => {
  for (const uid of ['api::notification.notification', 'api::useful.useful', 'api::poll-vote.poll-vote', 'api::follow.follow', 'api::reply.reply', 'api::discussion.discussion'] as const) {
    await app.db.query(uid).deleteMany({ where: {} });
  }
};

beforeAll(async () => {
  app = await setupStrapi();
  await resetCommunityData(app);
  alice = await createMember(app, 'Alice_Feat');
  bob = await createMember(app, 'Bob_Feat');
  carol = await createMember(app, 'Carol_Feat');
  staff = await createMember(app, 'Staff_Feat');
  await app.db.query('plugin::users-permissions.user').update({ where: { id: staff.id }, data: { memberRole: 'redaction' } });
  categoryId = (await app.documents('api::category.category').create({ data: { name: 'Bourse', slug: 'bourse' } })).documentId;
});

afterAll(async () => {
  await resetCommunityData(app);
  await teardownStrapi(app);
});

beforeEach(clearData);

describe('"Utile" toggle', () => {
  const toggle = (jwt: string | null, targetType: string, targetId: string) => {
    const req = api().post('/api/usefuls/toggle');
    return (jwt ? req.set(auth(jwt)) : req).send({ data: { targetType, targetId } });
  };
  const countOf = async (documentId: string) => (await app.db.query('api::discussion.discussion').findOne({ where: { documentId } }))?.usefulCount;

  it('adds then removes a useful mark on another member\'s discussion', async () => {
    const d = await createDiscussion(alice.jwt);
    const on = await toggle(bob.jwt, 'discussion', d.documentId);
    expect(on.status).toBe(200);
    expect(on.body.data).toEqual({ liked: true, count: 1 });
    expect(await countOf(d.documentId)).toBe(1);

    const off = await toggle(bob.jwt, 'discussion', d.documentId);
    expect(off.body.data).toEqual({ liked: false, count: 0 });
    expect(await countOf(d.documentId)).toBe(0);
  });

  it('refuses to mark one\'s own message as useful', async () => {
    const d = await createDiscussion(alice.jwt);
    const res = await toggle(alice.jwt, 'discussion', d.documentId);
    expect(res.status).toBe(400);
    expect(await countOf(d.documentId)).toBe(0);
  });

  it('refuses anonymous visitors', async () => {
    const d = await createDiscussion(alice.jwt);
    expect((await toggle(null, 'discussion', d.documentId)).status).toBe(403);
    expect(await countOf(d.documentId)).toBe(0);
  });

  it('returns 404 for a missing target', async () => {
    expect((await toggle(bob.jwt, 'discussion', 'missing-id')).status).toBe(404);
  });

  it('notifies the author of the message', async () => {
    const d = await createDiscussion(alice.jwt);
    await toggle(bob.jwt, 'discussion', d.documentId);
    const notifications = await notificationsOf(alice);
    expect(notifications.map((n) => n.kind)).toContain('like');
  });
});

describe('polls', () => {
  const vote = (jwt: string, id: string, option: unknown) => api().post(`/api/discussions/${id}/vote`).set(auth(jwt)).send({ data: { option } });

  it('creates a poll with zeroed options and no content', async () => {
    const res = await api().post('/api/discussions').set(auth(alice.jwt)).send({ data: pollBody() });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ type: 'poll' });
    const stored = await app.db.query('api::discussion.discussion').findOne({ where: { documentId: res.body.data.documentId } });
    expect(stored?.pollOptions).toEqual([
      { label: 'PEA', votes: 0 },
      { label: 'Assurance-vie', votes: 0 },
      { label: 'CTO', votes: 0 },
    ]);
  });

  it('rejects a poll with a single option', async () => {
    const res = await api().post('/api/discussions').set(auth(alice.jwt)).send({ data: pollBody({ pollOptions: ['Seule'] }) });
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors[0].path).toEqual(['pollOptions']);
  });

  it('rewards the first vote with 1 point', async () => {
    const poll = await createDiscussion(alice.jwt, pollBody());
    const res = await vote(bob.jwt, poll.documentId, 0);
    expect(res.status).toBe(200);
    expect(res.body.reward).toMatchObject({ points: 1 });
    expect(res.body.data).toMatchObject({ myVote: 0, total: 1 });
  });

  it('keeps the total constant when a member changes their vote', async () => {
    const poll = await createDiscussion(alice.jwt, pollBody());
    await vote(bob.jwt, poll.documentId, 0);
    const changed = await vote(bob.jwt, poll.documentId, 2);
    expect(changed.status).toBe(200);
    expect(changed.body.reward).toBeNull();
    expect(changed.body.data.total).toBe(1);
    expect(changed.body.data.pollOptions.map((o: { votes: number }) => o.votes)).toEqual([0, 0, 1]);
  });

  it('does not count a repeated identical vote twice', async () => {
    const poll = await createDiscussion(alice.jwt, pollBody());
    await vote(bob.jwt, poll.documentId, 1);
    const again = await vote(bob.jwt, poll.documentId, 1);
    expect(again.body.data.total).toBe(1);
  });

  it('rejects an out-of-range option', async () => {
    const poll = await createDiscussion(alice.jwt, pollBody());
    expect((await vote(bob.jwt, poll.documentId, 3)).status).toBe(400);
    expect((await vote(bob.jwt, poll.documentId, -1)).status).toBe(400);
  });

  it('rejects a vote on a discussion that is not a poll', async () => {
    const question = await createDiscussion(alice.jwt);
    expect((await vote(bob.jwt, question.documentId, 0)).status).toBe(400);
  });

  it('refuses anonymous votes', async () => {
    const poll = await createDiscussion(alice.jwt, pollBody());
    const res = await api().post(`/api/discussions/${poll.documentId}/vote`).send({ data: { option: 0 } });
    expect(res.status).toBe(403);
  });
});

describe('best answer', () => {
  const setSolution = (jwt: string, discussion: string, reply: unknown) =>
    api().put(`/api/discussions/${discussion}/solution`).set(auth(jwt)).send({ data: { reply } });
  const solutionOf = async (documentId: string) =>
    (await app.db.query('api::discussion.discussion').findOne({ where: { documentId }, populate: ['solution'] }))?.solution?.documentId ?? null;

  it('lets the question author pick another member\'s reply and notifies its author', async () => {
    const d = await createDiscussion(alice.jwt);
    const reply = (await createReply(bob.jwt, d.documentId)).body.data;
    const res = await setSolution(alice.jwt, d.documentId, reply.documentId);
    expect(res.status).toBe(200);
    expect(await solutionOf(d.documentId)).toBe(reply.documentId);
    expect((await notificationsOf(bob)).map((n) => n.kind)).toContain('solution');
  });

  it('refuses a member who is not the question author', async () => {
    const d = await createDiscussion(alice.jwt);
    const reply = (await createReply(bob.jwt, d.documentId)).body.data;
    const res = await setSolution(carol.jwt, d.documentId, reply.documentId);
    expect(res.status).toBe(403);
    expect(await solutionOf(d.documentId)).toBeNull();
  });

  it('refuses the reply author when they are not the question author', async () => {
    const d = await createDiscussion(alice.jwt);
    const reply = (await createReply(bob.jwt, d.documentId)).body.data;
    expect((await setSolution(bob.jwt, d.documentId, reply.documentId)).status).toBe(403);
  });

  it('lets staff pick the best answer', async () => {
    const d = await createDiscussion(alice.jwt);
    const reply = (await createReply(bob.jwt, d.documentId)).body.data;
    expect((await setSolution(staff.jwt, d.documentId, reply.documentId)).status).toBe(200);
    expect(await solutionOf(d.documentId)).toBe(reply.documentId);
  });

  it('forbids the question author from choosing their own reply', async () => {
    const d = await createDiscussion(alice.jwt);
    const own = (await createReply(alice.jwt, d.documentId, 'Je complète ma question.')).body.data;
    const res = await setSolution(alice.jwt, d.documentId, own.documentId);
    expect(res.status).toBe(400);
    expect(await solutionOf(d.documentId)).toBeNull();
  });

  it('returns 404 for a reply that belongs to another discussion', async () => {
    const d1 = await createDiscussion(alice.jwt);
    const d2 = await createDiscussion(alice.jwt, discussionBody({ title: 'Une autre question sur la retraite' }));
    const foreign = (await createReply(bob.jwt, d2.documentId)).body.data;
    const res = await setSolution(alice.jwt, d1.documentId, foreign.documentId);
    expect(res.status).toBe(404);
    expect(await solutionOf(d1.documentId)).toBeNull();
  });

  it('refuses anonymous visitors', async () => {
    const d = await createDiscussion(alice.jwt);
    const res = await api().put(`/api/discussions/${d.documentId}/solution`).send({ data: { reply: null } });
    expect(res.status).toBe(403);
  });
});

describe('editorial verification', () => {
  it('forbids a plain member', async () => {
    const d = await createDiscussion(alice.jwt);
    const reply = (await createReply(bob.jwt, d.documentId)).body.data;
    const res = await api().post(`/api/replies/${reply.documentId}/verify`).set(auth(carol.jwt));
    expect(res.status).toBe(403);
    expect((await app.db.query('api::reply.reply').findOne({ where: { documentId: reply.documentId } }))?.verified).toBeFalsy();
  });

  it('toggles the verified flag for staff', async () => {
    const d = await createDiscussion(alice.jwt);
    const reply = (await createReply(bob.jwt, d.documentId)).body.data;
    const on = await api().post(`/api/replies/${reply.documentId}/verify`).set(auth(staff.jwt));
    expect(on.status).toBe(200);
    expect(on.body.data).toEqual({ verified: true });
    const off = await api().post(`/api/replies/${reply.documentId}/verify`).set(auth(staff.jwt));
    expect(off.body.data).toEqual({ verified: false });
  });

  it('refuses anonymous visitors', async () => {
    const res = await api().post('/api/replies/anything/verify');
    expect(res.status).toBe(403);
  });
});

describe('link policy', () => {
  it('rejects an untrusted link in a discussion from a new member', async () => {
    const res = await api().post('/api/discussions').set(auth(bob.jwt)).send({ data: discussionBody({ content: 'Gagnez gros sur https://pub-crypto.com maintenant' }) });
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors[0].path).toEqual(['content']);
    expect(await app.documents('api::discussion.discussion').count({})).toBe(0);
  });

  it('rejects an untrusted link in a reply from a new member', async () => {
    const d = await createDiscussion(alice.jwt);
    const res = await api().post('/api/replies').set(auth(bob.jwt)).send({ data: { content: 'Allez voir pub-crypto.com', discussion: d.documentId } });
    expect(res.status).toBe(400);
    expect(await app.documents('api::reply.reply').count({})).toBe(0);
  });

  it('accepts a link to a trusted public site', async () => {
    const res = await api()
      .post('/api/discussions')
      .set(auth(bob.jwt))
      .send({ data: discussionBody({ content: 'Voir https://www.service-public.fr/particuliers/vosdroits/F123 pour les démarches.' }) });
    expect(res.status).toBe(201);
  });

  it('accepts a trusted link in a reply', async () => {
    const d = await createDiscussion(alice.jwt);
    const res = await api().post('/api/replies').set(auth(bob.jwt)).send({ data: { content: 'Détails sur https://www.amf-france.org/fr', discussion: d.documentId } });
    expect(res.status).toBe(201);
  });

  it('lets staff post any link', async () => {
    const res = await api().post('/api/discussions').set(auth(staff.jwt)).send({ data: discussionBody({ content: 'Source : https://example.org/etude' }) });
    expect(res.status).toBe(201);
  });
});

describe('notifications on reply', () => {
  it('notifies the discussion author and its followers', async () => {
    const d = await createDiscussion(alice.jwt);
    expect((await api().post(`/api/discussions/${d.documentId}/follow`).set(auth(carol.jwt))).body.data).toEqual({ followed: true });
    await createReply(bob.jwt, d.documentId);

    expect((await notificationsOf(alice)).map((n) => n.kind)).toContain('reply');
    expect((await notificationsOf(carol)).map((n) => n.kind)).toContain('reply');
    expect((await notificationsOf(bob)).map((n) => n.kind)).not.toContain('reply');
  });

  it('notifies a member mentioned with @username', async () => {
    const d = await createDiscussion(alice.jwt);
    const res = await createReply(bob.jwt, d.documentId, `Bonjour @${carol.username}, qu'en pensez-vous ?`);
    expect(res.body.meta.mentioned).toHaveLength(1);
    expect((await notificationsOf(carol)).map((n) => n.kind)).toContain('mention');
  });

  it('marks every notification read with read-all', async () => {
    const d = await createDiscussion(alice.jwt);
    await createReply(bob.jwt, d.documentId);
    expect((await notificationsOf(alice)).some((n) => !n.read)).toBe(true);

    const res = await api().post('/api/notifications/read-all').set(auth(alice.jwt));
    expect(res.status).toBe(200);
    const after = await notificationsOf(alice);
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((n) => n.read)).toBe(true);
  });

  it('does not mark someone else\'s notifications as read', async () => {
    const d = await createDiscussion(alice.jwt);
    await createReply(bob.jwt, d.documentId, `Salut @${carol.username}`);
    await api().post('/api/notifications/read-all').set(auth(alice.jwt));
    expect((await notificationsOf(carol)).some((n) => !n.read)).toBe(true);
  });

  it('refuses anonymous access to notifications', async () => {
    expect((await api().get('/api/notifications/me')).status).toBe(403);
    expect((await api().post('/api/notifications/read-all')).status).toBe(403);
  });
});

describe('feed tabs', () => {
  it('unanswered returns only discussions without replies and no polls', async () => {
    const answered = await createDiscussion(alice.jwt, discussionBody({ title: 'Question avec une réponse' }));
    await createDiscussion(alice.jwt, discussionBody({ title: 'Question sans aucune réponse' }));
    await createDiscussion(alice.jwt, pollBody());
    await createReply(bob.jwt, answered.documentId);

    const res = await api().get('/api/discussions?tab=unanswered');
    expect(res.status).toBe(200);
    expect(res.body.data.map((d: { title: string }) => d.title)).toEqual(['Question sans aucune réponse']);
    expect(res.body.data.every((d: { replyCount: number; type: string }) => d.replyCount === 0 && d.type !== 'poll')).toBe(true);
    expect(res.body.meta.tab).toBe('unanswered');
  });

  it('hot responds with the tab echoed in meta', async () => {
    await createDiscussion(alice.jwt);
    const res = await api().get('/api/discussions?tab=hot');
    expect(res.status).toBe(200);
    expect(res.body.meta.tab).toBe('hot');
    expect(res.body.data).toHaveLength(1);
  });

  it('rejects a malformed tab', async () => {
    const res = await api().get('/api/discussions?tab=trending');
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors[0].path).toEqual(['tab']);
  });
});

describe('profiles', () => {
  it('exposes points, level and badges but never the e-mail', async () => {
    const res = await api().get(`/api/profiles/${alice.username}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ username: alice.username });
    expect(res.body.data).toHaveProperty('points');
    expect(res.body.data).toHaveProperty('level');
    expect(res.body.data).toHaveProperty('badges');
    expect(JSON.stringify(res.body)).not.toMatch(/@test\.local|password/i);
  });

  it('returns 404 for an unknown member', async () => {
    expect((await api().get('/api/profiles/nobody_here')).status).toBe(404);
  });

  it('lets a member set a display name and bio', async () => {
    const res = await api().put('/api/profiles/me').set(auth(carol.jwt)).send({ data: { displayName: 'Carolina', bio: 'Investisseuse prudente' } });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Carolina', bio: 'Investisseuse prudente' });
  });

  it('rejects a 2-character display name', async () => {
    const res = await api().put('/api/profiles/me').set(auth(bob.jwt)).send({ data: { displayName: 'Bo' } });
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors[0].path).toEqual(['displayName']);
  });

  it('refuses a member trying to escalate their role through the profile', async () => {
    const res = await api().put('/api/profiles/me').set(auth(bob.jwt)).send({ data: { memberRole: 'redaction' } });
    expect(res.status).toBe(400);
    expect((await app.db.query('plugin::users-permissions.user').findOne({ where: { id: bob.id } }))?.memberRole).toBe('member');
  });

  it('refuses anonymous profile updates', async () => {
    const res = await api().put('/api/profiles/me').send({ data: { bio: 'hack' } });
    expect(res.status).toBe(403);
  });
});

describe('follow and event RSVP toggles', () => {
  it('toggles a follow on and off for a member', async () => {
    const d = await createDiscussion(alice.jwt);
    const on = await api().post(`/api/discussions/${d.documentId}/follow`).set(auth(bob.jwt));
    expect(on.body.data).toEqual({ followed: true });
    const off = await api().post(`/api/discussions/${d.documentId}/follow`).set(auth(bob.jwt));
    expect(off.body.data).toEqual({ followed: false });
  });

  it('refuses an anonymous follow', async () => {
    const d = await createDiscussion(alice.jwt);
    expect((await api().post(`/api/discussions/${d.documentId}/follow`)).status).toBe(403);
  });

  describe('event RSVP', () => {
    let eventId: string;
    beforeEach(async () => {
      await app.db.query('api::event.event').deleteMany({ where: {} });
      eventId = (
        await app.documents('api::event.event').create({
          data: { title: 'Le Revenu répond : PEA', host: 'La rédaction', startsAt: new Date(Date.now() + 7 * 86_400_000), goingBase: 10 },
        })
      ).documentId;
    });

    it('toggles attendance for a member', async () => {
      const on = await api().post(`/api/events/${eventId}/rsvp`).set(auth(bob.jwt));
      expect(on.status).toBe(200);
      expect(on.body.data).toMatchObject({ attending: true, going: 11 });
      const off = await api().post(`/api/events/${eventId}/rsvp`).set(auth(bob.jwt));
      expect(off.body.data).toMatchObject({ attending: false, going: 10 });
    });

    it('refuses an anonymous RSVP', async () => {
      expect((await api().post(`/api/events/${eventId}/rsvp`)).status).toBe(403);
    });

    it('returns 404 for an unknown event', async () => {
      expect((await api().post('/api/events/missing/rsvp').set(auth(bob.jwt))).status).toBe(404);
    });
  });
});
