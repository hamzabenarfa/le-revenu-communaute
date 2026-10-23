# Product: Communauté Le Revenu

**Status:** Implemented (2026-10-23).
**Sources:** the technical-test brief and the HTML prototype `maquette-communaute-le-revenu.html`. Companion documents: [ARCHITECTURE.md](ARCHITECTURE.md), [DATA-MODEL.md](DATA-MODEL.md), [API.md](API.md), [DESIGN.md](DESIGN.md), [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md).

## One-sentence product

A community space where readers of *Le Revenu* ask money questions, share experience and exchange with the editorial team, linked back to lerevenu.com.

## Audiences and jobs

| Role | Job |
| --- | --- |
| Visitor | Read discussions without an account, then join when they want to act ("Utile", reply, publish). |
| Member | Ask questions, start discussions and polls, reply, mark answers as useful, follow discussions, write blog posts, and earn recognition (points, levels, badges). |
| Question author | Choose the best answer to close a question. |
| Editorial team (`redaction`) | Reply as the newsroom, verify answers, run the weekly question and poll and the "Le Revenu répond" live sessions, and see the SEO status of every page. |
| Moderation (`moderator`) | Receive reports (stored; no review screen yet). |

## Scope versus the brief

| Brief requirement | Where |
| --- | --- |
| Home with API-driven discussions: title, author, category, reply count and date | `/`: feed tabs, server-side filter, sort and pagination |
| Filter by category, sort by publication date | `/espaces/[slug]`, the "Récentes" tab (newest first) |
| Discussion detail with replies; authenticated reply | `/discussions/[slug]` |
| Create: title ≥10, required content, category, type | Composer dialog (`question` / `discussion`, plus `poll` from the prototype) |
| Server-side validation, no anonymous writes, no author spoofing | Strapi controllers and services; see [SECURITY.md](SECURITY.md) |
| Bonuses: search, "Utile", best answer, pagination, profile | All implemented |

On top of the brief, every prototype use case is implemented with a real API:
- **Discussions:** polls, editorial verification, follow and notifications, @mentions, the trusted-links policy, report.
- **Community:** blog posts with comments, events with RSVP, gamification and leaderboard, weekly rituals, hover cards, search, charter, and the compact feed view.

## Deliberately out of scope

- **The prototype's own mockup toolbar:** the Visiteur/Membre switch, "Notes de conception", "Réinitialiser", and the scripted fake replies.
- **Real lerevenu.com SSO:** the login uses Strapi's local accounts.
- **Delivery features:** e-mail delivery (event reminders, weekly digest), and push or realtime notifications.
- **A moderation review UI:** reports are stored.
