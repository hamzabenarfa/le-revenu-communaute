# Testing

**Status:** Implemented. On 2026-10-23: **CMS 156/156** and **web 28/28** passing; typecheck and lint clean on both apps; the production build passes.

## Layers

| Layer | Tool | Where | Scope |
| --- | --- | --- | --- |
| CMS unit | Jest + ts-jest | `apps/cms/tests/unit/` | Validation of every write type, slugs, link policy (including look-alike and backslash hosts), reputation (levels, points, badge thresholds), image sniffing, rate-limit policy |
| CMS integration | Jest + supertest, real Strapi booted without a port, PostgreSQL `lerevenu_test` | `apps/cms/tests/integration/` | Authorization, ownership and the HTTP contract, end to end |
| Web unit/component | Vitest + Testing Library (jsdom) | `apps/web/tests/` | Rendering, safety, URL mapping, the composer's client validation |

## What the integration tests prove

- **Anonymous visitors:**
  - Cannot create discussions, replies, "Utile", votes, follows or RSVPs (403, and nothing is written).
  - Forged tokens get 401, and there are no update or delete routes (405).
  - `/users` is closed.
  - Sign-up with `memberRole` is rejected, and a normal sign-up yields `member`.
- **Validation:**
  - The title needs at least 10 characters after trimming.
  - Content is required, except for polls.
  - Type is an enum; polls need 2–6 distinct options.
  - The category must exist.
  - Errors are reported per field.
- **Authorship:**
  - The author is always the token's user.
  - An `author` field is rejected, including on replies.
  - A reply is linked to the right discussion and author.
  - Concurrent identical titles get distinct slugs.
- **"Utile":** +1 / −1, never on your own message, and the target's author is notified.
- **Polls:** first vote gives +1 point, changing a vote keeps the total, an out-of-range option or a non-poll gives 400.
- **Best answer:**
  - The author or staff can set it; another member gets 403.
  - The author can't pick their own reply (400), and a foreign reply gives 404.
  - The reply's author is notified.
- **Verification:** staff only.
- **Link policy:** untrusted links are refused for new members, accepted for staff and for trusted sources.
- **Notifications:** the author, followers and mentioned members are notified (not the actor), and read-all is scoped to the caller.
- **Feed tabs:** "unanswered" excludes replied discussions and polls, and a malformed tab gives 400.
- **Profiles:** no e-mail, and points, level and badges are present. A 2-character pseudo gives 400, and `memberRole` cannot be changed.
- **Follow and RSVP:** they toggle for members.

## What the web tests prove

- Feed cards and compact rows show the title (linked), author, category, reply count, date and views, plus the zero, solved, poll, pinned and editorial states. HTML in titles stays text.
- `Prose`: bold and lists, trusted links with `ugc nofollow`, untrusted links held for moderation, backslash smuggling blocked, mentions linking to profiles, no HTML.
- Feed URL ↔ API query mapping: defaults per audience, "Pour vous" only for members on the home page, canonical URLs.
- **Composer:**
  - Validation messages appear and the server isn't called.
  - The poll needs two answers.
  - Focus stays in the form, never on the close button and never stolen mid-typing (two real bugs found by these tests).
  - The payload never contains an author.
- Strapi error mapping, and the open-redirect guard (tab, newline and backslash tricks).

## Run

```bash
docker compose up -d db
cd apps/cms && npm test          # boots Strapi against lerevenu_test (sets COMMUNITY_WRITE_LIMIT high)
cd apps/web && bun run test
```

`strapi develop` and the CMS tests share `dist/`. If a run fails with "Unknown error" from `load-config-file`, a rebuild was in progress: rerun it.

## Manual checks done

All in Chrome against the dev servers, side by side with the prototype:
- **Desktop and 390 px mobile:** home, discussion and profile.
- **Flows:** login dialog (wrong password, then success); composer with similar-question suggestions; poll creation with badge toasts; reply with the @mention popup and toasts; notifications dropdown.
- **Strapi down:** error cards with retry, and the build still succeeds.

Not automated: browser end-to-end tests (Playwright).
