# Security

**Status:** Implemented and reviewed (two independent review passes on 2026-10-23; every finding is fixed or listed below).

## Authorization model

| Actor | Can |
| --- | --- |
| Visitor (public role) | Read the community APIs, sign up, log in |
| Member (authenticated role) | All of the above, plus every community write, on their own behalf only |
| Staff (`memberRole` `redaction`/`moderator`) | Also: verify answers, choose the best answer on any question, see SEO status |

- **Permissions are code** (`apps/cms/src/bootstrap/permissions.ts`), synced at every boot. Any extra permission toggled in the admin on these APIs is revoked.
- **Ownership comes only from the token.** `requireUser(ctx.state)` gives the member's id, and services write `author: viewer.documentId`. Any ownership key in a payload (`author`, `user`, `owner`, `createdBy`…) is rejected with 400, and so is any unknown key.
- **Staff checks live in the controllers and services** (`requireStaff`, `viewer.staff`), not in the UI.
- **Sign-up:** `register.allowedFields = []`, so only username, e-mail and password are accepted and a role cannot be chosen. `PUT /profiles/me` only accepts `displayName`, `bio` and `interests`.

## Abuse controls

- **Uniqueness:** one "Utile", one vote and one follow per member and target, enforced by unique `key` indexes. A double click resolves to the current state.
- **Ownership rules:** no "Utile" on your own message, and the author cannot pick their own reply as the best answer.
- **Link policy:** only lerevenu.com and official sources are clickable.
  - Members below level 3 cannot post other links (400).
  - Hosts are parsed like a browser parses them (backslash, userinfo…), so look-alikes such as `evil-lerevenu.com` and smuggling such as `evil.xyz\.lerevenu.com` are caught.
  - Rendered `href`s are rebuilt from the parsed URL, with `rel="ugc nofollow noopener noreferrer"`.
- **Throttling:** 30 writes per member per minute (`policies/rate-limit.ts`, 429).
- **De-duplication:** notifications are de-duplicated per recipient, actor, kind and target for one hour, and mentions skip blocked accounts. Reports are de-duplicated per member and message.
- **Concurrency:** poll counts are updated under `SELECT … FOR UPDATE`, and slugs have unique indexes with a retry.

## Uploads

Profile photos are cropped and resized to 256 px in the browser. The server:
- identifies the file from its magic bytes (JPEG, PNG or WebP only), whatever Content-Type or name the client declared;
- forces the stored name to `avatar-<documentId>.<ext>` and limits the size to 2 MB;
- deletes the previous avatar.

This fixed a high-severity finding: an HTML file declared as `image/png` could previously be stored and served from the Strapi origin.

## Data exposure

- **Member data:** person objects contain username, display name, colour, photo URL, role, subscriber and expertise flags. E-mail, provider, tokens, `blocked`, interests, visit history and point baselines are never public. `/api/users` stays closed (403).
- **Native populate:** `GET /categories?populate=…` silently drops authors and replies, and the per-member collections have no routes.

## Next.js side

- **Session:** the JWT lives in an `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookie, valid for 7 days. It is never in JavaScript, URLs or logs.
- **Server-only access:** `lib/strapi/*` is `server-only`, `STRAPI_URL` is server-only, and there are no `NEXT_PUBLIC_` variables.
- **Server Actions** treat their arguments as untrusted: allow-lists for enums, and short id strings without `/` or `..` (`str()`). They only talk to `STRAPI_URL`, so they can't be used for SSRF.
- **Post-login redirects** only accept same-site paths, resolved like a browser would (tabs and newlines are stripped and `\` counts as `/`), so `next=/%09/evil.com` is refused.
- **Rendering:** member text goes through `Prose`, which builds React elements and has no HTML sink. Errors never show stack traces.

## Residual risks

| Risk | Note |
| --- | --- |
| In-memory throttle | Per Strapi instance; use Redis or a gateway limiter behind several instances |
| View counts | Any GET counts, so "Tendances" could be nudged; a production version should de-duplicate per visitor |
| Reputation farming | Puppet accounts can give each other "Utile". Production should weight by account age or distinct accounts |
| Demo credentials | `.env.example` ships demo-only passwords for local evaluation. Change them before exposing any environment |
