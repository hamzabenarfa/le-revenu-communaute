/**
 * Points, levels and badges. Everything is derived from stored activity, so a
 * member's reputation can always be recomputed and never drifts from the data.
 */

export const POINTS = {
  reply: 3,
  discussion: 5,
  post: 5,
  comment: 3,
  usefulReceived: 5,
  solution: 20,
  vote: 1,
  visit: 1,
  welcome: 5,
} as const;

export const POINT_RULES: Array<[string, number]> = [
  ['Publier une réponse', POINTS.reply],
  ['Lancer une discussion', POINTS.discussion],
  ['Publier un billet de blog', POINTS.post],
  ['Recevoir un « Utile »', POINTS.usefulReceived],
  ['Meilleure réponse', POINTS.solution],
  ['Voter à un sondage', POINTS.vote],
  ['Visite quotidienne', POINTS.visit],
];

export const LEVELS: Array<[number, string]> = [
  [0, 'Nouveau venu'],
  [25, 'Membre'],
  [100, 'Contributeur'],
  [300, 'Contributeur averti'],
  [750, 'Pilier de la communauté'],
];

/** Level index from which members may post links to non-trusted sites (held for moderation). */
export const EXTERNAL_LINK_LEVEL = 3;

export interface Level {
  index: number;
  name: string;
  min: number;
  next: number | null;
  nextName: string | null;
}

export function levelFor(points: number): Level {
  let index = 0;
  LEVELS.forEach(([min], i) => {
    if (points >= min) index = i;
  });
  const next = LEVELS[index + 1];
  return { index, name: LEVELS[index][1], min: LEVELS[index][0], next: next ? next[0] : null, nextName: next ? next[1] : null };
}

export interface ActivityStats {
  discussions: number;
  polls: number;
  replies: number;
  posts: number;
  comments: number;
  usefulReceived: number;
  solutions: number;
  votes: number;
  visitDays: number;
  streak: number;
  onboarded: boolean;
}

export const emptyStats = (): ActivityStats => ({
  discussions: 0,
  polls: 0,
  replies: 0,
  posts: 0,
  comments: 0,
  usefulReceived: 0,
  solutions: 0,
  votes: 0,
  visitDays: 0,
  streak: 0,
  onboarded: false,
});

export function activityPoints(s: ActivityStats): number {
  return (
    s.discussions * POINTS.discussion +
    s.replies * POINTS.reply +
    s.posts * POINTS.post +
    s.comments * POINTS.comment +
    s.usefulReceived * POINTS.usefulReceived +
    s.solutions * POINTS.solution +
    s.votes * POINTS.vote +
    s.visitDays * POINTS.visit +
    (s.onboarded ? POINTS.welcome : 0)
  );
}

export const BADGES: Record<string, { name: string; description: string; icon: string; earned: (s: ActivityStats) => boolean }> = {
  bienvenue: { name: 'Bienvenue', description: 'A rejoint la communauté', icon: 'hand', earned: () => true },
  premier_sujet: { name: 'Premier pas', description: 'A lancé sa première discussion', icon: 'pen', earned: (s) => s.discussions >= 1 },
  premiere_reponse: { name: 'Entraide', description: 'A publié sa première réponse', icon: 'msg', earned: (s) => s.replies >= 1 },
  apprecie: { name: 'Apprécié', description: 'A reçu son premier « Utile »', icon: 'thumb', earned: (s) => s.usefulReceived >= 1 },
  populaire: { name: 'Populaire', description: 'A reçu 25 « Utile »', icon: 'star', earned: (s) => s.usefulReceived >= 25 },
  solution: { name: 'Bonne réponse', description: 'Réponse choisie comme meilleure réponse', icon: 'check', earned: (s) => s.solutions >= 1 },
  sondeur: { name: 'Sondeur', description: 'A lancé un sondage', icon: 'chart', earned: (s) => s.polls >= 1 },
  citoyen: { name: 'Votre avis compte', description: 'A voté à 3 sondages', icon: 'vote', earned: (s) => s.votes >= 3 },
  assidu: { name: 'Assidu', description: "7 jours de visite d'affilée", icon: 'flame', earned: (s) => s.streak >= 7 },
  pilier: { name: 'Pilier des échanges', description: 'A publié 50 réponses', icon: 'columns', earned: (s) => s.replies >= 50 },
};

export const earnedBadges = (s: ActivityStats) => Object.keys(BADGES).filter((code) => BADGES[code].earned(s));
