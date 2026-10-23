import type { Core } from '@strapi/strapi';
import { slugify } from '../utils/slug';
import { activityPoints } from '../utils/reputation';
import type { Reputation } from '../api/community/services/reputation';
import { demoEmail, FIXTURE, QUICK_DEMO } from './data';

const USER = 'plugin::users-permissions.user';
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

const COMMUNITY_UIDS = [
  'api::notification.notification', 'api::report.report', 'api::useful.useful', 'api::poll-vote.poll-vote', 'api::follow.follow',
  'api::comment.comment', 'api::post.post', 'api::reply.reply', 'api::discussion.discussion', 'api::event.event',
  'api::site-article.site-article', 'api::category.category',
] as const;

/** Removes demo content and demo accounts (seeded e-mails only); real members are untouched. */
async function reset(strapi: Core.Strapi) {
  for (const uid of COMMUNITY_UIDS) await strapi.db.query(uid).deleteMany({ where: {} });
  await strapi.db.query(USER).deleteMany({
    where: { $or: [{ email: { $endsWith: '@demo.lerevenu.local' } }, { email: QUICK_DEMO.email }] },
  });
}

/** Backdates a row so the feed shows the prototype's spread of publication dates. */
async function backdate(strapi: Core.Strapi, uid: string, id: number, at: Date, extra: Record<string, unknown> = {}) {
  await strapi.db.query(uid as never).update({ where: { id }, data: { createdAt: at, updatedAt: at, publishedAt: at, ...extra } });
}

/**
 * Idempotent demo seed. Content is matched by slug / e-mail and only created when missing.
 * With `reset`, demo content is wiped first so the data matches the prototype exactly.
 */
export async function seedDemo(strapi: Core.Strapi, password: string, options: { reset?: boolean } = {}): Promise<void> {
  if (options.reset) await reset(strapi);

  const categories = new Map<string, { id: number; documentId: string }>();
  for (const c of FIXTURE.categories) {
    const existing = await strapi.db.query('api::category.category').findOne({ where: { slug: c.slug }, select: ['id', 'documentId'] });
    const row =
      existing ??
      (await strapi.documents('api::category.category').create({
        data: { slug: c.slug, name: c.name, description: c.description, icon: c.icon, color: c.color, rubrique: c.rubrique ?? null, position: c.position } as never,
      }));
    categories.set(c.slug, { id: row.id as number, documentId: row.documentId });
  }

  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const userService = strapi.plugin('users-permissions').service('user');
  const users = new Map<string, { id: number; documentId: string }>();
  for (const u of FIXTURE.users) {
    const email = demoEmail(u.username);
    let row = await strapi.db.query(USER).findOne({ where: { email }, select: ['id', 'documentId'] });
    if (!row) {
      row = await userService.add({
        username: u.username,
        email,
        password,
        provider: 'local',
        confirmed: true,
        blocked: false,
        role: role.id,
        displayName: u.name,
        avatarColor: u.color,
        memberRole: u.role,
        subscriber: u.subscriber,
        proTitle: u.pro ?? null,
        bio: u.bio,
        streak: u.streak,
        onboarded: true,
        lastVisitOn: new Date().toISOString().slice(0, 10),
        interests: u.interests.map((slug: string) => categories.get(slug)?.documentId).filter(Boolean),
      });
    }
    users.set(u.username, { id: row.id, documentId: row.documentId });
  }
  if (!(await strapi.db.query(USER).findOne({ where: { email: QUICK_DEMO.email }, select: ['id'] }))) {
    await userService.add({ ...QUICK_DEMO, displayName: 'Demo', provider: 'local', confirmed: true, blocked: false, role: role.id, onboarded: true });
  }

  const topics = new Map<number, number>();
  let created = 0;
  for (const t of FIXTURE.topics) {
    const slug = slugify(t.title);
    const existing = await strapi.db.query('api::discussion.discussion').findOne({ where: { slug }, select: ['id'] });
    if (existing) {
      topics.set(t.key, existing.id);
      continue;
    }
    const lastReply = t.replies.reduce((min: number, r: { minutesAgo: number }) => Math.min(min, r.minutesAgo), t.minutesAgo);
    const doc = await strapi.documents('api::discussion.discussion').create({
      data: {
        slug,
        title: t.title,
        content: t.content,
        type: t.type,
        pinned: t.pinned,
        featured: t.featured,
        articleTitle: t.article ?? null,
        pollOptions: t.pollOptions,
        category: categories.get(t.category)?.documentId,
        author: users.get(t.author)?.documentId,
      } as never,
    });
    const id = doc.id as number;
    topics.set(t.key, id);
    const replyIds: number[] = [];
    for (const r of t.replies) {
      const reply = await strapi.documents('api::reply.reply').create({
        data: { content: r.content, discussion: doc.documentId, author: users.get(r.author)?.documentId, verified: r.verified, usefulCount: r.useful } as never,
      });
      await backdate(strapi, 'api::reply.reply', reply.id as number, ago(r.minutesAgo));
      replyIds.push(reply.id as number);
    }
    await backdate(strapi, 'api::discussion.discussion', id, ago(t.minutesAgo), {
      views: t.views,
      usefulCount: t.useful,
      replyCount: t.replies.length,
      lastActivityAt: ago(lastReply),
      solution: t.solution != null ? replyIds[t.solution] : null,
    });
    created += 1;
  }

  for (const p of FIXTURE.posts) {
    const slug = slugify(p.title);
    if (await strapi.db.query('api::post.post').findOne({ where: { slug }, select: ['id'] })) continue;
    const doc = await strapi.documents('api::post.post').create({
      data: { slug, title: p.title, content: p.content, category: p.category ? categories.get(p.category)?.documentId : null, author: users.get(p.author)?.documentId } as never,
    });
    for (const c of p.comments) {
      const comment = await strapi.documents('api::comment.comment').create({
        data: { content: c.content, post: doc.documentId, author: users.get(c.author)?.documentId, usefulCount: c.useful } as never,
      });
      await backdate(strapi, 'api::comment.comment', comment.id as number, ago(c.minutesAgo));
    }
    await backdate(strapi, 'api::post.post', doc.id as number, ago(p.minutesAgo), { views: p.views, usefulCount: p.useful, commentCount: p.comments.length });
  }

  for (const e of FIXTURE.events) {
    if (await strapi.db.query('api::event.event').findOne({ where: { title: e.title }, select: ['id'] })) continue;
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + e.inDays);
    startsAt.setHours(e.hour, e.minute, 0, 0);
    await strapi.documents('api::event.event').create({
      data: {
        title: e.title,
        host: e.host,
        startsAt,
        goingBase: e.going,
        category: categories.get(e.category)?.documentId,
        attendees: e.attending.map((u: string) => users.get(u)?.documentId).filter(Boolean),
      } as never,
    });
  }

  for (const a of FIXTURE.siteArticles) {
    if (await strapi.db.query('api::site-article.site-article').findOne({ where: { title: a.title }, select: ['id'] })) continue;
    await strapi.documents('api::site-article.site-article').create({ data: a as never });
  }
  const charter = await strapi.db.query('api::charter.charter').findOne({ select: ['id'] });
  if (!charter) await strapi.documents('api::charter.charter').create({ data: FIXTURE.charter as never });

  if (created > 0) {
    for (const f of FIXTURE.follows) {
      const user = users.get(f.user);
      const topic = topics.get(f.topic);
      if (user && topic) await strapi.documents('api::follow.follow').create({ data: { key: `${user.id}:${topic}`, user: user.id, discussion: topic } as never });
    }
    for (const n of FIXTURE.notifications) {
      const recipient = users.get(n.recipient);
      if (!recipient) continue;
      const doc = await strapi.documents('api::notification.notification').create({
        data: {
          recipient: recipient.id,
          actor: n.actor ? users.get(n.actor)?.id : null,
          kind: n.kind,
          text: n.text,
          badge: n.badge ?? null,
          discussion: n.topic ? topics.get(n.topic) : null,
          read: n.read,
        } as never,
      });
      await backdate(strapi, 'api::notification.notification', doc.id as number, ago(n.minutesAgo));
    }
  }

  // Prototype totals include activity from before the platform: store the difference as a baseline.
  const reputation = strapi.service('api::community.reputation') as unknown as { compute: (ids: number[]) => Promise<Map<number, Reputation>> };
  const reps = await reputation.compute([...users.values()].map((u) => u.id));
  for (const u of FIXTURE.users) {
    const id = users.get(u.username)?.id;
    const rep = id ? reps.get(id) : undefined;
    if (!id || !rep || u.role !== 'member') continue;
    const activity = activityPoints(rep.stats);
    const month = rep.monthPoints - 0;
    await strapi.db.query(USER).update({
      where: { id },
      data: { basePoints: Math.max(0, u.points - activity), baseMonthPoints: Math.max(0, u.month - month) },
    });
  }

  strapi.log.info(`[seed] ${FIXTURE.categories.length} spaces, ${users.size + 1} members, ${created} new discussions, ${FIXTURE.posts.length} posts`);
}
