# Domain glossary

| Term (UI) | Meaning | In code |
| --- | --- | --- |
| Espace | Thematic space (Bourse & actions, Retraite…) | `Category` (`api::category.category`) |
| Discussion | A thread. Its type is a question, a discussion or a poll ("sondage") | `Discussion`, `type` |
| Réponse | Reply in a discussion | `Reply` |
| Meilleure réponse | Reply chosen by the question author (or the editorial team) | `Discussion.solution` |
| Vérifiée par la rédaction | Editorial stamp on an answer | `Reply.verified` |
| Utile | Positive vote on a message. There is no downvote, and members cannot mark their own messages | `Useful` row + `usefulCount` counters |
| Suivre | Follow a discussion to be notified of new replies (automatic when you publish or reply) | `Follow` |
| Billet | Member blog post | `Post`, `Comment` |
| Question / Sondage de la semaine | Editorial ritual shown in the right rail | `Discussion.featured` |
| Le Revenu répond | Live Q&A session with journalists, with RSVP | `Event` |
| Points / Niveau / Badge | Recognition computed from activity | `utils/reputation.ts` |
| Pour vous / Tendances / Récentes / Sans réponse | Feed tabs: interests, engagement-and-freshness ranking, newest, unanswered | `tab=foryou\|hot\|new\|unanswered` |
| Rédaction / Modération | Staff roles | `User.memberRole` |
| Expertise vérifiée | Professional (financial advisor, notary…) whose title was checked | `User.proTitle` |
| Abonné | Magazine subscriber | `User.subscriber` |
| Sources de confiance | Domains whose links are clickable for everyone | `utils/links.ts` |

## Levels

| Points | Level |
| --- | --- |
| 0 | Nouveau venu |
| 25 | Membre |
| 100 | Contributeur |
| 300 | Contributeur averti (may post links to non-trusted sites; they are held for moderation) |
| 750 | Pilier de la communauté |

## Points

| Action | Points |
| --- | --- |
| Reply | +3 |
| Discussion or blog post | +5 |
| "Utile" received | +5 |
| Best answer | +20 |
| Poll vote | +1 |
| Daily visit | +1 |
| Onboarding | +5 |

## Badges

Bienvenue, Premier pas, Entraide, Apprécié, Populaire (25 "Utile" received), Bonne réponse, Sondeur, Votre avis compte (3 votes), Assidu (7-day streak), Pilier des échanges (50 replies).
