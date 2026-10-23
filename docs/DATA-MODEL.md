# Data model

**Status:** Implemented. Schemas live in `apps/cms/src/api/*/content-types/*/schema.json` and `apps/cms/src/extensions/users-permissions/content-types/user/schema.json`. Strapi creates the tables at boot. Draft & Publish is disabled everywhere: content is public on creation, and `publishedAt` is the date shown and sorted on.

## Entities

```text
User 1─* Discussion *─1 Category
User 1─* Reply *─1 Discussion        Discussion 1─0..1 Reply (solution)
User 1─* Post *─0..1 Category        Post 1─* Comment *─1 User
User *─* Category (interests)        Event *─* User (attendees)
Useful(user, targetAuthor, targetType, targetId)   PollVote(user, discussion, option)   Follow(user, discussion)
Notification(recipient, actor, kind, discussion?, post?)   Report(reporter, targetType, targetId, reason)
SiteArticle   Charter (single type)
```

| Type | Fields |
| --- | --- |
| **User** | `username`, `email` (private), `password` (private), `displayName` (≤24), `bio` (≤160), `avatarColor`, `photo` (image), `memberRole` (`member`/`redaction`/`moderator`), `subscriber`, `proTitle`, `interests`, `onboarded`, `streak`, `visitDays`, `lastVisitOn`, `basePoints`, `baseMonthPoints` |
| **Category** | `name` (unique), `slug` (unique), `description`, `color`, `icon`, `rubrique`, `position` |
| **Discussion** | `title` (10–150), `slug` (unique index), `content` (≤10 000; optional for polls), `type`, `pollOptions` JSON `[{label, votes}]` (2–6), `pinned`, `featured` (`none`/`question`/`poll`), `articleTitle`, `solution`, `views`, `replyCount`, `usefulCount`, `lastActivityAt`, `author`, `category` |
| **Reply** | `content` (≤5 000), `verified`, `usefulCount`, `author`, `discussion` |
| **Post** | `title` (10–120), `slug` (unique index), `content` (60–20 000), `category?`, `author`, `views`, `usefulCount`, `commentCount` |
| **Comment** | `content`, `usefulCount`, `author`, `post` |
| **Useful** / **PollVote** / **Follow** | `key` (private, unique index: `user:target`), relations, `option` for votes |
| **Event** | `title`, `host`, `startsAt`, `category`, `attendees`, `goingBase` |
| **Notification** | `kind` (`reply`/`like`/`mention`/`badge`/`solution`/`level`/`event`), `text`, `badge`, `read`, `recipient`, `actor`, `discussion?`, `post?` |
| **Report** | `reason` (`disrespect`/`solicitation`/`market-rumor`/`personal-data`/`other`), `targetType`, `targetId`, `status`, `reporter` |
| **SiteArticle** | `kicker`, `title`, `url`, `paid`, `position` |
| **Charter** | `title`, `intro`, `rules` JSON `[[title, text]]` |

## Indexes created at boot

`discussions.slug`, `categories.slug`, `posts.slug`, `usefuls.key`, `poll_votes.key`, `follows.key` (all unique).

## Counters

| Counter | Maintained by |
| --- | --- |
| `Discussion.replyCount`, `lastActivityAt` | Reply creation |
| `*.usefulCount` | "Utile" toggle (the `Useful` row and the counter change together) |
| `Post.commentCount` | Comment creation |
| `Discussion.views`, `Post.views` | Detail reads |
| Poll vote counts (`pollOptions`) | Vote, under a row lock |

The seed writes the prototype's counts directly, as a baseline.

## Seed

`npm run seed` reads `src/seed/prototype.json`, which is generated from the prototype's data section (spaces, members, discussions with replies and counts, posts with comments, events, site articles, notifications, the charter). It is idempotent, matching rows by slug or e-mail. `-- --reset` deletes the demo content and the demo accounts (`@demo.lerevenu.local`, `demo@demo.fr`) first. After seeding it stores `basePoints = max(0, prototypePoints − computedActivity)`.
