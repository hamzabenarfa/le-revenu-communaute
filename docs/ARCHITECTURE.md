# Architecture: boundaries, decisions and data flows

**Status:** Implemented 2026-10-23.
**Companion documents:** [DATA-MODEL.md](DATA-MODEL.md), [API.md](API.md), [SECURITY.md](SECURITY.md), [DESIGN.md](DESIGN.md), [TESTING.md](TESTING.md).

## 1. Stack

| Area | Choice |
| --- | --- |
| Front end | Next.js 16.4 (App Router, Cache Components, Partial Prerendering, React Compiler), React 19.3, TypeScript, Tailwind CSS 4, Biome 2.4, bun 1.4 |
| Back end | Strapi 5.59 (TypeScript, REST), Users & Permissions plugin, npm |
| Database | PostgreSQL 16 (Docker Compose); a separate `lerevenu_test` database for integration tests |
| Tests | Jest + supertest (CMS), Vitest + Testing Library (web) |

## 2. Boundaries

```text
Browser ──(HTML / RSC, Server Actions)──▶ Next.js server ──(REST + Bearer JWT)──▶ Strapi ──▶ PostgreSQL
            httpOnly session cookie          lib/strapi/* (server-only)            controllers → services → Document Service / Query Engine
```

- **Strapi owns everything with rules:** persistence, validation, authorization, authorship, counters, reputation, notifications, link policy and rate limiting.
- **Next.js renders and relays.** It never imports a database driver. Its only Strapi access is `apps/web/src/lib/strapi/*`, which is marked `server-only`.
- **The browser never sees the Strapi URL or a token.** All writes go through Server Actions (`apps/web/src/app/actions`).

## 3. Decision log

| ID | Decision | Rejected alternatives |
| --- | --- | --- |
| ADR-01 | Monorepo with `apps/web` and `apps/cms`, each with its own package manager and lockfile | Next at the root with Strapi in a sub-folder: mixes configs |
| ADR-02 | Custom controllers and services for every community endpoint, returning purpose-built read models (cards, detail, profile) | Native `find` + `populate`: it would require granting `user.find` to read authors, which exposes e-mails, and would let clients over-populate |
| ADR-03 | Denormalized counters (`replyCount`, `usefulCount`, `views`, `commentCount`, poll vote counts in JSON), plus one row per member action (`Useful`, `PollVote`, `Follow`) | Counting rows on every read means N+1 queries, and the prototype's seeded counts (e.g. 64 "Utile") would be impossible to reproduce with 19 users |
| ADR-04 | Points, levels and badges are computed from activity (`reputation.ts`), plus a seeded `basePoints` baseline | A points ledger: more writes and drift risk. Hard-coded numbers: dishonest |
| ADR-05 | Staff powers come from a `memberRole` field checked in the controllers | Extra Users & Permissions roles: those would also change Content API permissions, which is more surface to keep in sync |
| ADR-06 | Permissions are declared in code (`bootstrap/permissions.ts`) and synced at every boot | Click-configured in the admin: environments drift |
| ADR-07 | `legacy-support` JWT (7 days), stored by Next in its own httpOnly cookie | `refresh` sessions: the short-lived access token would need refresh handling inside Next |
| ADR-08 | Real PostgreSQL unique indexes created at bootstrap (`bootstrap/indexes.ts`) | Strapi's `unique`: application-level check only, which a race defeats (proven by a test) |
| ADR-09 | Port the prototype's stylesheet as the design system (`community.css`, CSS layer) and keep its class names | Re-expressing everything in Tailwind utilities: approximation, not "exact" |
| ADR-10 | Every page view is rendered per request (`connection()`); spaces are the only shared cache | Caching feeds: stale reply counts and per-member state leaking between users |
| ADR-11 | Seed data generated from the prototype's own data section (`seed/prototype.json`) | Hand-retyped fixtures |

## 4. Request flows

**Feed** (`/`):

1. The page awaits `searchParams` and calls `connection()`.
2. `listDiscussions(filters)` sends `GET /api/discussions?tab=…` with the session token, when there is one, so viewer state is included.
3. The discussion service builds the filters:
   - **`tab=foryou`** keeps the member's interests, featured discussions and their own.
   - **`tab=unanswered`** keeps discussions with no reply that aren't polls.
   - **Pinned discussions** lead in a space and in "Récentes".
4. **"Tendances"** ranks up to 300 recently active candidates with the prototype's score:
   `(1 + replies·3 + useful·2 + views/25 + pollVotes/20) / ((age + lastActivityAge)/120 + 2)^1.3`.
5. Cards are serialized with the participant avatars (one query for the page's replies), plus SEO status for staff.

**Reply** (`ReplyBox` → `publishReply` Server Action → `POST /api/replies`):

1. The controller requires a user and validates the payload; an `author` field is rejected.
2. The service resolves the discussion and checks the link policy against the author's level.
3. It creates the reply through the Document Service, increments `reply_count`, and updates `last_activity_at`.
4. It notifies the discussion author, the followers and the @mentioned members (de-duplicated, blocked members skipped), then auto-follows the replier.
5. It computes the reward (points delta, new badges, level-up) and records badge and level notifications.
6. The action calls `refresh()`, and the client shows the reward toasts and flashes the new reply.

**Vote:**

1. `SELECT … FOR UPDATE` on the discussion row.
2. Update the vote counts in `poll_options`, and the member's vote row (keyed by `user:discussion`).
3. Commit.
4. Return the new counts, plus a reward on the first vote only.

## 5. Rendering and caching (Next 16 Cache Components)

- **Root layout:** static shell (site bar, header, skeleton). `SessionBoundary` reads the session cookie and the spaces inside Suspense, then mounts the client `AppProvider` around the page.
- **Pages:** async views inside Suspense, which call `connection()` before using relative dates or member state.
- **`"use cache"`:** only `listSpaces()` (minutes lifetime, tag `spaces`). Errors crossing the cache boundary lose their class, so they are converted back to `StrapiError`.
- **Builds** do not need Strapi to be running (verified by building against an unreachable URL).
- **Stale or forged cookies:** public reads retry anonymously on 401, so they never break a page.

## 6. Repository layout

```text
apps/cms/src/
  api/<type>/{content-types,controllers,services,routes}   Category, Discussion, Reply, Post, Comment, Useful, PollVote,
                                                            Follow, Event, Notification, Report, SiteArticle, Charter
  api/community/                                            cross-cutting endpoints: profiles, leaderboard, spaces, stats,
                                                            mentions, notifications, reports; reputation + people services
  bootstrap/{permissions,indexes}.ts                        synced at every boot
  extensions/users-permissions/content-types/user           extended member profile
  policies/rate-limit.ts                                    write throttle
  utils/{validation,auth,links,reputation,slug,image}.ts    pure, unit-tested rules
  seed/{index.ts,data.ts,prototype.json}                    idempotent demo seed (--reset)
apps/web/src/
  app/                                                      routes (French URLs) + Server Actions
  components/                                               feed, rail, widgets, discussion actions, atoms, shell
  components/app/                                           client provider, modals, mentions, hover cards, header
  lib/                                                      typed Strapi client, session, formatting, link policy mirror
  app/community.css                                         ported design system
```
