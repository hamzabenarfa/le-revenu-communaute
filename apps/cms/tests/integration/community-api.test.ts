import type { Core } from '@strapi/strapi';
import request from 'supertest';
import { createMember, resetCommunityData, setupStrapi, teardownStrapi } from '../helpers/strapi';

let app: Core.Strapi;
let alice: Awaited<ReturnType<typeof createMember>>;
let bob: Awaited<ReturnType<typeof createMember>>;
let categoryId: string;

const api = () => request(app.server.httpServer);
const auth = (jwt: string) => ({ Authorization: `Bearer ${jwt}` });
const validDiscussion = () => ({ title: 'Comment bien démarrer un PEA ?', content: 'Je débute et je cherche des conseils.', type: 'question', category: categoryId });

async function createDiscussion(jwt: string, data: Record<string, unknown> = validDiscussion()) {
  return api().post('/api/discussions').set(auth(jwt)).send({ data });
}

beforeAll(async () => {
  app = await setupStrapi();
  await resetCommunityData(app);
  alice = await createMember(app, 'Alice_Test');
  bob = await createMember(app, 'Bob_Test');
  const category = await app.documents('api::category.category').create({ data: { name: 'Bourse', slug: 'bourse' } });
  await app.documents('api::category.category').create({ data: { name: 'Retraite', slug: 'retraite' } });
  categoryId = category.documentId;
});

afterAll(async () => {
  await resetCommunityData(app);
  await teardownStrapi(app);
});

describe('anonymous visitors', () => {
  it('cannot create a discussion', async () => {
    const res = await api().post('/api/discussions').send({ data: validDiscussion() });
    expect(res.status).toBe(403);
    expect(await app.documents('api::discussion.discussion').count({})).toBe(0);
  });

  it('cannot create a reply', async () => {
    const created = await createDiscussion(alice.jwt);
    const res = await api().post('/api/replies').send({ data: { content: 'Bonjour', discussion: created.body.data.documentId } });
    expect(res.status).toBe(403);
    expect(await app.documents('api::reply.reply').count({})).toBe(0);
  });

  it('are rejected with 401 when the token is forged', async () => {
    const res = await api().post('/api/discussions').set(auth('forged.token.value')).send({ data: validDiscussion() });
    expect(res.status).toBe(401);
  });

  it('cannot update or delete through the Content API', async () => {
    const created = await createDiscussion(alice.jwt);
    const id = created.body.data.documentId;
    expect((await api().put(`/api/discussions/${id}`).set(auth(alice.jwt)).send({ data: { title: 'Titre modifié par un tiers' } })).status).toBe(405);
    expect((await api().delete(`/api/discussions/${id}`).set(auth(alice.jwt))).status).toBe(405);
  });

  it('cannot list users or their e-mails', async () => {
    expect((await api().get('/api/users')).status).toBe(403);
  });

  it('cannot self-assign a privileged field when registering', async () => {
    const res = await api()
      .post('/api/auth/local/register')
      .send({ username: 'Intrus', email: 'intrus@test.local', password: 'Password-123', memberRole: 'redaction' });
    expect(res.status).toBe(400);
    expect(await app.db.query('plugin::users-permissions.user').findOne({ where: { username: 'Intrus' } })).toBeNull();
  });

  it('can register normally and becomes a plain member', async () => {
    const res = await api()
      .post('/api/auth/local/register')
      .send({ username: 'Nouveau', email: 'nouveau@test.local', password: 'Password-123' });
    expect(res.status).toBe(200);
    const stored = await app.db.query('plugin::users-permissions.user').findOne({ where: { username: 'Nouveau' } });
    expect(stored?.memberRole).toBe('member');
  });
});

describe('discussion validation (server-side)', () => {
  it('rejects a title shorter than 10 characters', async () => {
    const res = await createDiscussion(alice.jwt, { ...validDiscussion(), title: 'Trop court'.slice(0, 9) });
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors).toEqual([expect.objectContaining({ path: ['title'] })]);
  });

  it('rejects empty content and an invalid type', async () => {
    const res = await createDiscussion(alice.jwt, { ...validDiscussion(), content: '   ', type: 'sondage' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors.map((e: { path: string[] }) => e.path[0])).toEqual(['type', 'content']);
  });

  it('rejects an unknown category', async () => {
    const res = await createDiscussion(alice.jwt, { ...validDiscussion(), category: 'does-not-exist' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors[0].path).toEqual(['category']);
  });
});

describe('authorship', () => {
  it('assigns the authenticated user as author of a discussion', async () => {
    const res = await createDiscussion(alice.jwt);
    expect(res.status).toBe(201);
    expect(res.body.data.author).toMatchObject({ username: 'Alice_Test' });

    const stored = await app.documents('api::discussion.discussion').findOne({ documentId: res.body.data.documentId, populate: ['author'] });
    expect(stored?.author?.documentId).toBe(alice.documentId);
  });

  it('refuses a payload that tries to set another author', async () => {
    const before = await app.documents('api::discussion.discussion').count({});
    const res = await createDiscussion(alice.jwt, { ...validDiscussion(), author: bob.id });
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors[0].path).toEqual(['author']);
    expect(await app.documents('api::discussion.discussion').count({})).toBe(before);
  });

  it('links a reply to its discussion and to the authenticated author', async () => {
    const discussion = (await createDiscussion(alice.jwt)).body.data;
    const res = await api()
      .post('/api/replies')
      .set(auth(bob.jwt))
      .send({ data: { content: 'Commencez par un ETF monde.', discussion: discussion.documentId } });

    expect(res.status).toBe(201);
    expect(res.body.data.author).toMatchObject({ username: 'Bob_Test' });
    const stored = await app.documents('api::reply.reply').findOne({ documentId: res.body.data.documentId, populate: ['author', 'discussion'] });
    expect(stored?.author?.documentId).toBe(bob.documentId);
    expect(stored?.discussion?.documentId).toBe(discussion.documentId);
  });

  it('refuses a reply that impersonates someone else', async () => {
    const discussion = (await createDiscussion(alice.jwt)).body.data;
    const res = await api()
      .post('/api/replies')
      .set(auth(bob.jwt))
      .send({ data: { content: 'Je parle au nom d’Alice', discussion: discussion.documentId, author: alice.id } });
    expect(res.status).toBe(400);
  });

  it('gives distinct slugs to identical titles posted at the same time', async () => {
    const data = { ...validDiscussion(), title: 'Titre publié deux fois en même temps' };
    const [first, second] = await Promise.all([createDiscussion(alice.jwt, data), createDiscussion(bob.jwt, data)]);
    expect([first.status, second.status]).toEqual([201, 201]);
    expect(first.body.data.slug).not.toBe(second.body.data.slug);
  });

  it('returns 404 when replying to a missing discussion', async () => {
    const res = await api().post('/api/replies').set(auth(bob.jwt)).send({ data: { content: 'Bonjour', discussion: 'missing-id' } });
    expect(res.status).toBe(404);
  });
});

describe('reading discussions', () => {
  beforeAll(async () => {
    await app.db.query('api::reply.reply').deleteMany({ where: {} });
    await app.db.query('api::discussion.discussion').deleteMany({ where: {} });
    const retraite = await app.documents('api::category.category').findFirst({ filters: { slug: 'retraite' } });
    const first = (await createDiscussion(alice.jwt, { ...validDiscussion(), title: 'Première discussion bourse' })).body.data;
    await createDiscussion(bob.jwt, { ...validDiscussion(), title: 'Deuxième discussion retraite', category: retraite?.documentId });
    for (const content of ['Réponse 1', 'Réponse 2']) {
      await api().post('/api/replies').set(auth(bob.jwt)).send({ data: { content, discussion: first.documentId } });
    }
  });

  it('lists summaries with author, category and reply count, newest first', async () => {
    const res = await api().get('/api/discussions');
    expect(res.status).toBe(200);
    expect(res.body.data.map((d: { title: string }) => d.title)).toEqual(['Deuxième discussion retraite', 'Première discussion bourse']);
    expect(res.body.data[1]).toMatchObject({ replyCount: 2, author: { username: 'Alice_Test' }, category: { slug: 'bourse' } });
    expect(res.body.data[1]).not.toHaveProperty('content');
    expect(JSON.stringify(res.body)).not.toMatch(/@test\.local|password/);
    expect(res.body.meta.pagination).toEqual({ page: 1, pageSize: 10, pageCount: 1, total: 2 });
  });

  it('filters by category and sorts ascending on the server', async () => {
    const filtered = await api().get('/api/discussions?category=retraite');
    expect(filtered.body.data.map((d: { title: string }) => d.title)).toEqual(['Deuxième discussion retraite']);
    const asc = await api().get('/api/discussions?sort=asc&pageSize=1');
    expect(asc.body.data.map((d: { title: string }) => d.title)).toEqual(['Première discussion bourse']);
    expect(asc.body.meta.pagination.pageCount).toBe(2);
  });

  it('returns 404 for an unknown category and 400 for malformed parameters', async () => {
    expect((await api().get('/api/discussions?category=inconnue')).status).toBe(404);
    expect((await api().get('/api/discussions?sort=random')).status).toBe(400);
  });

  it('returns a discussion by slug with its replies in chronological order', async () => {
    const res = await api().get('/api/discussions/slug/premiere-discussion-bourse');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: 'Première discussion bourse', replyCount: 2 });
    expect(res.body.data.replies.map((r: { content: string }) => r.content)).toEqual(['Réponse 1', 'Réponse 2']);
    expect((await api().get('/api/discussions/slug/inexistante')).status).toBe(404);
  });
});
