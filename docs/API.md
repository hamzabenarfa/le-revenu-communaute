# REST API (Strapi, `http://localhost:1337/api`)

Every response uses the Strapi v5 envelope. A success is `{ data, meta? }`. An error is `{ data: null, error: { status, name, message, details: { errors: [{ path, message }] } } }`.

**Authentication:** `Authorization: Bearer <jwt>` (from `POST /auth/local`).
- Public reads accept a token and then personalise the answer: already "Utile", my vote, follow state, staff fields.
- Every write in the tables below is throttled per member (30 per minute → 429). `POST /auth/local` itself is rate-limited by Users & Permissions.

## Discussions

| Method & path | Auth | Body / query | Response |
| --- | --- | --- | --- |
| `GET /discussions` | public | `tab=new\|hot\|unanswered\|foryou` (`foryou` falls back to `hot` for visitors or members without interests), `category=<slug>`, `sort=desc\|asc` (`new`/`unanswered`), `page`, `pageSize` (≤50) | Cards + `meta: { tab, unanswered, pagination }`. 404 for an unknown category, 400 for malformed parameters |
| `GET /discussions/slug/:slug` | public | | Detail: content, poll, `replies[]` (author with level, `usefulCount`, `verified`, `isSolution`, `liked`, `mine`), `related[]`, `participants[]`, `usefulTotal`, `viewer { liked, followed, myVote, isAuthor, canSolve, staff }`, `seo` (staff only). Counts a view |
| `GET /discussions/featured` | public | | `{ question, poll }` of the week (poll with options and `myVote`) |
| `GET /discussions/similar?q=` | public | | Up to 3 `{ title, slug, replyCount, solved }` |
| `GET /search?q=` | public | `q` ≤100 | Cards (title, content or reply match) |
| `POST /discussions` | member | `{ data: { title, content, type, category: <documentId>, pollOptions?: string[] } }` | 201 `{ data: <detail>, reward }` |
| `PUT /discussions/:documentId/solution` | question author or staff | `{ data: { reply: <documentId> \| null } }` | `{ data: { solution }, meta: { author } }`. 403 for other members, 400 for your own reply or a non-question, 404 for a reply from another discussion |
| `POST /discussions/:documentId/vote` | member | `{ data: { option: <index> } }` | `{ data: { pollOptions, myVote, total }, reward }` (reward on the first vote only) |
| `POST /discussions/:documentId/follow` | member | | `{ data: { followed } }` (toggle) |

## Replies, "Utile", reports

| Method & path | Auth | Body | Response |
| --- | --- | --- | --- |
| `POST /replies` | member | `{ data: { content, discussion: <documentId> } }` | 201 `{ data, reward, meta: { mentioned } }`. 404 for an unknown discussion |
| `POST /replies/:documentId/verify` | staff | | `{ data: { verified } }` (toggle). 403 for members |
| `POST /usefuls/toggle` | member | `{ data: { targetType: discussion\|reply\|post\|comment, targetId } }` | `{ data: { liked, count } }`. 400 on your own message |
| `POST /reports` | member | `{ data: { targetType, targetId, reason } }` | 201 (one open report per member and message) |

## Blog

| Method & path | Auth | Notes |
| --- | --- | --- |
| `GET /posts?author=<username>&limit=` | public | Summaries (excerpt, read time, counters) |
| `GET /posts/slug/:slug` | public | Post, comments, author card (level, points, bio), `moreFromAuthor`. Counts a view |
| `POST /posts` | member | `{ data: { title, content, category? } }` → `{ data: { slug }, reward }` |
| `POST /comments` | member | `{ data: { content, post: <documentId> } }` → `{ data, reward, meta }` |

## Community

| Method & path | Auth | Notes |
| --- | --- | --- |
| `GET /spaces` | public | Categories + `discussionCount`, `replyCount`, `activeMembers` |
| `GET /community/stats` | public | `{ members, discussions, replies, resolvedRate }` |
| `GET /leaderboard?period=month\|all` | public | Rows `{ person, points, monthPoints, level, me }`. `meta` holds the points rules, levels and badges |
| `GET /events?category=` | public | Upcoming sessions `{ title, host, startsAt, going, attending }` |
| `POST /events/:documentId/rsvp` | member | Toggle → event |
| `GET /profiles/:username` | public | Person, bio, since, streak, points, level, badges, stats, discussions, posts, replies (never e-mail or visit history) |
| `GET /profiles/:username/card` | public | Hover card |
| `GET /profiles/me` | member | Own account (e-mail, interests, unread count, progression). Records the daily visit and streak |
| `PUT /profiles/me` | member | `{ data: { displayName?, bio?, interests?: <documentId[]> } }`. The first call is the onboarding (sets the @handle, +5 points) |
| `POST /profiles/me/photo` | member | multipart `photo` (JPEG/PNG/WebP identified by content, ≤2 MB) |
| `DELETE /profiles/me/photo` | member | Removes the photo and deletes the file |
| `GET /members/mentions?q=&context=u1,u2` | member | 6 suggestions (people on the page, then the editorial team, then active members) |
| `GET /notifications/me` | member | Latest 30 with actor, text and link |
| `POST /notifications/read-all`, `POST /notifications/:documentId/read` | member | Mark as read |

## Native endpoints kept

`GET /categories` (and `/:id`), `GET /site-articles`, `GET /charter`, `POST /auth/local`, `POST /auth/local/register` (username, e-mail and password only).

There are no update or delete routes for community content (405).

## Example

```bash
JWT=$(curl -s -X POST localhost:1337/api/auth/local -H 'content-type: application/json' \
  -d '{"identifier":"demo@demo.fr","password":"demo@demo.fr"}' | jq -r .jwt)
curl -s -X POST localhost:1337/api/discussions -H "Authorization: Bearer $JWT" -H 'content-type: application/json' \
  -d '{"data":{"title":"Faut-il ouvrir un PER à 45 ans ?","content":"Salariée, TMI 30 %.","type":"question","category":"<documentId>"}}'
```
