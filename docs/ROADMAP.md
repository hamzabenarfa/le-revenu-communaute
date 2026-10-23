# Roadmap

## Done (2026-10-23)

- **Core scope of the brief:** feed with category filter and date sort, discussion detail, authenticated replies, a create form with server-side validation, Users & Permissions authorship, permissions in code, tests, seed and docs.
- **Every prototype use case:**
  - Polls, "Utile", best answer, editorial verification, follow and notifications, @mentions, the link policy, reports.
  - Blog posts and comments, events and RSVP, points, levels, badges and the leaderboard, weekly rituals, search, the charter, hover cards, the compact view, onboarding, profile photo.
- **Hardening after two reviews:**
  - An open-redirect guard on login.
  - Real unique indexes, a slug race retry, a poll row lock.
  - Upload sniffing, a host check that resists backslash tricks.
  - A write throttle, and notification and report de-duplication.

## Next candidates

| Priority | Item |
| --- | --- |
| High | lerevenu.com SSO (OIDC) instead of local accounts; password reset and e-mail confirmation |
| High | Moderation workspace: the report queue, hiding a message after N reports, editorial review of held links |
| Medium | Realtime or push notifications, the weekly e-mail digest, event reminders |
| Medium | A shared rate-limit store (Redis), view de-duplication per visitor, reputation weighting by account age |
| Medium | Playwright end-to-end tests (visitor → login → publish → reply), plus an accessibility scan |
| Medium | Real 404 status codes for unknown slugs (resolve them outside the streamed boundary) |
| Low | Editing and deleting your own messages within a time window; link-article picker ("Lier un article du Revenu") |
| Low | Docker images and Compose services for both apps; CI pipeline |
