# Demo script (about 5 minutes)

**Accounts** (local only; the password of the seeded members is `SEED_USER_PASSWORD` in `apps/cms/.env`):

| Login | Use it to see |
| --- | --- |
| `demo@demo.fr` / `demo@demo.fr` | A fresh member |
| `camille.b@demo.lerevenu.local` | The prototype's active member (interests, streak, notifications, follow, RSVP) |
| `thomas.pea@demo.lerevenu.local` | The author of a question: choose a best answer |
| `laredaction@demo.lerevenu.local` | The editorial team: SEO card, answer verification |

## As a visitor

1. **Home.** Show the hero (live figures), the tabs ("Tendances", "Récentes", "Sans réponse" with its counter), the compact view toggle, and the poll results, which only appear after voting.
2. **Open a discussion** ("Ouvrir un PEA…"):
   - The best-answer call-out jumps to the answer.
   - The answer is marked "Vérifiée par la rédaction", and the editorial reply has its own styling.
   - Hovering a name shows the member card.
3. **Click "Utile".** The login dialog opens, and after login the action resumes.

## As Camille

1. **Home.**
   - The greeting with the streak, the "Pour vous" tab, and interest dots in the sidebar.
   - The progress card, the notification counter and the dropdown.
2. **Publish a poll** ("Publier", then "Créer un sondage"):
   - Type a title and similar discussions appear.
   - Publish: you land on the poll, and toasts show the points and badges earned ("Premier pas", "Sondeur").
3. **Reply with a mention.** Type `@Vi` and pick Vincent; Ctrl+Enter publishes. Toasts show "+3" and "Vincent recevra une notification".
4. **Try a link.** Type `www.pub-crypto.com` in a reply: it is refused at this level ("Pourquoi ?" links to the charter).
5. **Profile.** Open "Mon profil": the tabs, the "Progression" tab (levels and badges) and the photo change.

## As the author and as the editorial team

- **Thomas:** "Choisir comme meilleure réponse" on a reply. The card turns green ("Résolu"), and the reply's author is notified.
- **La rédaction:**
  - The "Référencement" card on every discussion, and "Indexée" / "Non indexée" pills in the feed.
  - "Valider cette réponse" on a best answer.

## Reset

`npm run seed -- --reset` in `apps/cms`.
