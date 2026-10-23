# Design

**Goal:** match the prototype exactly, in every use case.

## Approach

- **`apps/web/src/app/community.css`** is the prototype's stylesheet, ported verbatim into `@layer components`:
  - The tokens (`--rev-red #eb0f0f`, surfaces, ink, radii, shadows), the light and dark palettes, every component class and the responsive breakpoints (1180 / 1100 / 860 / 760 px).
  - Only the mockup's own annotations are removed (toolbar, design-note pins and panel).
  - Tailwind remains available for utilities.
  - A few Tailwind preflight rules the prototype doesn't expect are reverted: `svg` display and list bullets in posts.
- **Markup keeps the prototype's class names and structure**, one React component per prototype render function:

| Prototype | Component |
| --- | --- |
| `header()`, `siteBar()`, `sideNav()`, bottom bar | `components/shell.tsx`, `app/header-actions.tsx`, `app/bottom-nav.tsx` |
| `topicCard()`, `topicRow()`, `blogCard()` | `components/feed.tsx` |
| `quickComposer()`, `tabsHTML()` + density, `pollHTML()`, `eventsWidget()` | `components/widgets.tsx` |
| `progressCard()`, `joinCard()`, `questionWidget()`, `blogWidget()`, `siteWidget()`, `topWidget()` | `components/rail.tsx` |
| `viewTopic()` actions and reply box | `components/discussion-actions.tsx`, `app/discussions/[slug]/page.tsx` |
| `openLogin`, `openOnboarding`, `openComposer`, `openBlogEditor`, `openPhoto`, `openReport` | `components/app/modals.tsx` |
| Mentions, hover card, toasts | `app/mention-textarea.tsx`, `app/hovercards.tsx`, `app/toasts.tsx` |
| `formatBody()` | `components/prose.tsx` |

- **Fonts:** Playfair Display (headings) and Inter (body fallback after the system stack), loaded with `next/font`.
- **Icons:** the prototype's Lucide paths, converted to typed JSX (`components/icon.tsx`).

## Deviations (deliberate)

- **Real figures:** the hero shows real counts, not the mockup's invented ones ("4 812 membres").
- **Computed points:** points and levels come from data, so a few members rank differently from the mockup.
- **Brief over prototype:** the composer requires content for questions and discussions (the brief), whereas the prototype marked details as optional. Content stays optional for polls.
- **Editorial view:** "Vue rédaction" is a role, not a toggle.

## Accessibility

- Semantic landmarks, and a skip link to `#contenu`.
- Every dialog has `role="dialog"` and `aria-modal`. Escape closes it, and focus moves to the first field and returns to the trigger on close.
- Labelled inputs, per-field errors, `aria-pressed` on toggles, `aria-current` on navigation.
- Comprehension and spacing audits passed at 390, 1440 and 1728 px: no horizontal overflow, no undersized targets.
