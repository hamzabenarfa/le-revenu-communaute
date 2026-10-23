import { errors } from '@strapi/utils';

/**
 * Business validation for community writes.
 *
 * These checks are the authoritative rules: the Next.js form mirrors them for
 * immediate feedback, but nothing the browser sends is trusted.
 */

export const DISCUSSION_TYPES = ['question', 'discussion', 'poll'] as const;
export type DiscussionType = (typeof DISCUSSION_TYPES)[number];

export const LIMITS = {
  titleMin: 10,
  titleMax: 150,
  contentMax: 10000,
  replyMax: 5000,
  pollOptionsMin: 2,
  pollOptionsMax: 6,
  pollOptionMax: 80,
  postTitleMin: 10,
  postTitleMax: 120,
  postContentMin: 60,
  postContentMax: 20000,
  displayNameMin: 3,
  displayNameMax: 24,
  bioMax: 160,
} as const;

/** Ownership is always derived from the authenticated user, never from the payload. */
const OWNERSHIP_FIELDS = ['author', 'user', 'owner', 'users_permissions_user', 'createdBy', 'updatedBy'];

export interface FieldError {
  path: string[];
  message: string;
  name: 'ValidationError';
}

export interface DiscussionInput {
  title: string;
  content: string;
  type: DiscussionType;
  category: string;
  pollOptions: string[];
}

export interface ReplyInput {
  content: string;
  discussion: string;
}

const fieldError = (field: string, message: string): FieldError => ({
  path: [field],
  message,
  name: 'ValidationError',
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function fail(issues: FieldError[]): never {
  throw new errors.ValidationError(
    issues.length === 1 ? issues[0].message : `${issues.length} erreurs de validation`,
    { errors: issues }
  );
}

function readPayload(body: unknown, allowed: readonly string[]): Record<string, unknown> {
  const data = isRecord(body) ? body.data : undefined;
  if (!isRecord(data)) {
    fail([fieldError('data', 'Le corps de la requête doit contenir un objet « data ».')]);
  }

  const issues: FieldError[] = [];
  for (const key of Object.keys(data)) {
    if (OWNERSHIP_FIELDS.includes(key)) {
      issues.push(fieldError(key, "L'auteur est déterminé par le serveur et ne peut pas être fourni."));
    } else if (!allowed.includes(key)) {
      issues.push(fieldError(key, `Champ non autorisé : ${key}.`));
    }
  }
  if (issues.length) fail(issues);
  return data;
}

const asTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' ? value.trim() : null;

export function validateDiscussionInput(body: unknown): DiscussionInput {
  const data = readPayload(body, ['title', 'content', 'type', 'category', 'pollOptions']);
  const issues: FieldError[] = [];

  const title = asTrimmedString(data.title)?.replace(/\s+/g, ' ') ?? null;
  if (!title) issues.push(fieldError('title', 'Le titre est obligatoire.'));
  else if (title.length < LIMITS.titleMin)
    issues.push(fieldError('title', `Le titre doit contenir au moins ${LIMITS.titleMin} caractères.`));
  else if (title.length > LIMITS.titleMax)
    issues.push(fieldError('title', `Le titre ne peut pas dépasser ${LIMITS.titleMax} caractères.`));

  const type = data.type;
  const isType = (v: unknown): v is DiscussionType => DISCUSSION_TYPES.includes(v as DiscussionType);
  if (!isType(type)) issues.push(fieldError('type', 'Le type doit être « question », « discussion » ou « poll ».'));

  // A poll is self-explanatory through its options; questions and discussions need a body.
  const content = asTrimmedString(data.content ?? '') ?? null;
  if (content === null) issues.push(fieldError('content', 'Le contenu doit être un texte.'));
  else if (!content && type !== 'poll') issues.push(fieldError('content', 'Le contenu est obligatoire.'));
  else if (content.length > LIMITS.contentMax)
    issues.push(fieldError('content', `Le contenu ne peut pas dépasser ${LIMITS.contentMax} caractères.`));

  const category = asTrimmedString(data.category);
  if (!category) issues.push(fieldError('category', 'La catégorie est obligatoire.'));

  let pollOptions: string[] = [];
  if (type === 'poll') {
    const raw = Array.isArray(data.pollOptions) ? data.pollOptions : [];
    pollOptions = raw.map((o) => (typeof o === 'string' ? o.trim() : '')).filter(Boolean);
    if (pollOptions.length < LIMITS.pollOptionsMin || pollOptions.length > LIMITS.pollOptionsMax)
      issues.push(fieldError('pollOptions', `Un sondage a besoin de ${LIMITS.pollOptionsMin} à ${LIMITS.pollOptionsMax} réponses.`));
    else if (pollOptions.some((o) => o.length > LIMITS.pollOptionMax))
      issues.push(fieldError('pollOptions', `Chaque réponse est limitée à ${LIMITS.pollOptionMax} caractères.`));
    else if (new Set(pollOptions.map((o) => o.toLowerCase())).size !== pollOptions.length)
      issues.push(fieldError('pollOptions', 'Les réponses du sondage doivent être différentes.'));
  } else if (data.pollOptions !== undefined && data.pollOptions !== null) {
    issues.push(fieldError('pollOptions', 'Seul un sondage peut avoir des réponses possibles.'));
  }

  if (issues.length > 0 || !title || content === null || !isType(type) || !category) fail(issues);
  return { title, content, type, category, pollOptions };
}

export function validateReplyInput(body: unknown): ReplyInput {
  const data = readPayload(body, ['content', 'discussion']);
  const issues: FieldError[] = [];

  const content = asTrimmedString(data.content);
  if (!content) issues.push(fieldError('content', 'La réponse ne peut pas être vide.'));
  else if (content.length > LIMITS.replyMax)
    issues.push(fieldError('content', `La réponse ne peut pas dépasser ${LIMITS.replyMax} caractères.`));

  const discussion = asTrimmedString(data.discussion);
  if (!discussion) issues.push(fieldError('discussion', 'La discussion est obligatoire.'));

  if (issues.length > 0 || !content || !discussion) fail(issues);
  return { content, discussion };
}

export type ListSort = 'desc' | 'asc';

export const LIST_TABS = ['new', 'hot', 'unanswered', 'foryou'] as const;
export type ListTab = (typeof LIST_TABS)[number];

export interface ListQuery {
  tab: ListTab;
  category: string | null;
  sort: ListSort;
  page: number;
  pageSize: number;
}

export const PAGE_SIZE_MAX = 50;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const toPositiveInt = (value: unknown, fallback: number): number => {
  if (value === undefined || value === '') return fallback;
  const n = typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

/** Parses `?category=<slug>&sort=desc|asc&page=1&pageSize=10` for the discussion list. */
export function parseListQuery(query: Record<string, unknown>): ListQuery {
  const issues: FieldError[] = [];

  const rawCategory = query.category;
  let category: string | null = null;
  if (rawCategory !== undefined && rawCategory !== '') {
    if (typeof rawCategory === 'string' && SLUG_RE.test(rawCategory)) category = rawCategory;
    else issues.push(fieldError('category', 'Identifiant de catégorie invalide.'));
  }

  const rawTab = query.tab ?? 'new';
  if (!LIST_TABS.includes(rawTab as ListTab)) issues.push(fieldError('tab', 'Onglet inconnu.'));

  const rawSort = query.sort ?? 'desc';
  if (rawSort !== 'desc' && rawSort !== 'asc') issues.push(fieldError('sort', 'Le tri doit être « desc » ou « asc ».'));

  const page = toPositiveInt(query.page, 1);
  if (Number.isNaN(page)) issues.push(fieldError('page', 'La page doit être un entier positif.'));

  const pageSize = toPositiveInt(query.pageSize, 10);
  if (Number.isNaN(pageSize) || pageSize > PAGE_SIZE_MAX)
    issues.push(fieldError('pageSize', `La taille de page doit être comprise entre 1 et ${PAGE_SIZE_MAX}.`));

  if (issues.length) fail(issues);
  return { tab: rawTab as ListTab, category, sort: rawSort as ListSort, page, pageSize };
}

export function assertSlug(value: unknown): string {
  if (typeof value !== 'string' || !SLUG_RE.test(value) || value.length > 200) {
    throw new errors.NotFoundError('Discussion introuvable.');
  }
  return value;
}

export interface PostInput {
  title: string;
  content: string;
  category: string | null;
}

export function validatePostInput(body: unknown): PostInput {
  const data = readPayload(body, ['title', 'content', 'category']);
  const issues: FieldError[] = [];
  const title = asTrimmedString(data.title)?.replace(/\s+/g, ' ') ?? null;
  if (!title || title.length < LIMITS.postTitleMin)
    issues.push(fieldError('title', `Donnez un titre à votre billet (${LIMITS.postTitleMin} caractères minimum).`));
  else if (title.length > LIMITS.postTitleMax)
    issues.push(fieldError('title', `Le titre ne peut pas dépasser ${LIMITS.postTitleMax} caractères.`));
  const content = asTrimmedString(data.content);
  if (!content || content.length < LIMITS.postContentMin)
    issues.push(fieldError('content', `Développez un peu votre récit : quelques phrases suffisent (${LIMITS.postContentMin} caractères minimum).`));
  else if (content.length > LIMITS.postContentMax)
    issues.push(fieldError('content', `Le billet ne peut pas dépasser ${LIMITS.postContentMax} caractères.`));
  const rawCategory = data.category;
  const category = rawCategory === undefined || rawCategory === null || rawCategory === '' ? null : asTrimmedString(rawCategory);
  if (rawCategory && !category) issues.push(fieldError('category', 'Thème invalide.'));
  if (issues.length > 0 || !title || !content) fail(issues);
  return { title, content, category };
}

export function validateCommentInput(body: unknown): { content: string; post: string } {
  const data = readPayload(body, ['content', 'post']);
  const issues: FieldError[] = [];
  const content = asTrimmedString(data.content);
  if (!content || content.length < 2) issues.push(fieldError('content', 'Le commentaire ne peut pas être vide.'));
  else if (content.length > LIMITS.replyMax)
    issues.push(fieldError('content', `Le commentaire ne peut pas dépasser ${LIMITS.replyMax} caractères.`));
  const post = asTrimmedString(data.post);
  if (!post) issues.push(fieldError('post', 'Le billet est obligatoire.'));
  if (issues.length > 0 || !content || !post) fail(issues);
  return { content, post };
}

export interface ProfileInput {
  displayName?: string;
  bio?: string;
  interests?: string[];
}

export function validateProfileInput(body: unknown): ProfileInput {
  const data = readPayload(body, ['displayName', 'bio', 'interests']);
  const issues: FieldError[] = [];
  const out: ProfileInput = {};
  if (data.displayName !== undefined) {
    const name = asTrimmedString(data.displayName)?.replace(/\s+/g, ' ') ?? '';
    if (name.length < LIMITS.displayNameMin || name.length > LIMITS.displayNameMax)
      issues.push(fieldError('displayName', `Choisissez un pseudo de ${LIMITS.displayNameMin} à ${LIMITS.displayNameMax} caractères.`));
    else out.displayName = name;
  }
  if (data.bio !== undefined) {
    const bio = asTrimmedString(data.bio ?? '') ?? null;
    if (bio === null || bio.length > LIMITS.bioMax)
      issues.push(fieldError('bio', `La présentation est limitée à ${LIMITS.bioMax} caractères.`));
    else out.bio = bio;
  }
  if (data.interests !== undefined) {
    if (!Array.isArray(data.interests) || data.interests.some((i) => typeof i !== 'string') || data.interests.length > 20)
      issues.push(fieldError('interests', 'Centres d’intérêt invalides.'));
    else out.interests = [...new Set(data.interests as string[])];
  }
  if (issues.length) fail(issues);
  return out;
}

export const REPORT_REASONS = ['disrespect', 'solicitation', 'market-rumor', 'personal-data', 'other'] as const;
export const TARGET_TYPES = ['discussion', 'reply', 'post', 'comment'] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export function validateTarget(body: unknown, extra: readonly string[] = []): { targetType: TargetType; targetId: string; data: Record<string, unknown> } {
  const data = readPayload(body, ['targetType', 'targetId', ...extra]);
  const issues: FieldError[] = [];
  const targetType = data.targetType;
  if (!TARGET_TYPES.includes(targetType as TargetType)) issues.push(fieldError('targetType', 'Type de message inconnu.'));
  const targetId = asTrimmedString(data.targetId);
  if (!targetId || targetId.length > 64) issues.push(fieldError('targetId', 'Message inconnu.'));
  if (issues.length > 0 || !targetId) fail(issues);
  return { targetType: targetType as TargetType, targetId, data };
}

export function validateReport(body: unknown) {
  const { targetType, targetId, data } = validateTarget(body, ['reason']);
  if (!REPORT_REASONS.includes(data.reason as (typeof REPORT_REASONS)[number])) {
    fail([fieldError('reason', 'Choisissez un motif de signalement.')]);
  }
  return { targetType, targetId, reason: data.reason as (typeof REPORT_REASONS)[number] };
}

export function validateVote(body: unknown): number {
  const data = readPayload(body, ['option']);
  const option = data.option;
  if (typeof option !== 'number' || !Number.isInteger(option) || option < 0) fail([fieldError('option', 'Réponse de sondage invalide.')]);
  return option as number;
}

export function validateSearch(query: Record<string, unknown>): string {
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (q.length > 100) fail([fieldError('q', 'La recherche est limitée à 100 caractères.')]);
  return q;
}

/** Throws a field error on `field` when the text holds links the author may not post. */
export function assertLinksAllowed(field: string, hosts: string[], allowed: boolean) {
  if (!hosts.length || allowed) return;
  fail([
    fieldError(
      field,
      `Les liens vers ${hosts.join(', ')} ne sont pas autorisés à votre niveau. Sont acceptés : lerevenu.com, les sites publics (.gouv.fr, service-public.fr), l'AMF, la Banque de France, l'Insee et la Cour des comptes.`
    ),
  ]);
}
