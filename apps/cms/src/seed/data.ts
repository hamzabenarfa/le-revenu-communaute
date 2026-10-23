/**
 * Demo fixtures. `prototype.json` is generated from the data section of the HTML
 * prototype (pseudonymous members, no real personal data) — local evaluation only.
 */
import { EXTRA_POSTS, EXTRA_TOPICS, EXTRA_USERS } from './extra';
import fixture from './prototype.json';

/** Prototype data first (its keys and notifications stay valid), then the extra volume. */
export const FIXTURE = {
  ...fixture,
  users: [...fixture.users, ...EXTRA_USERS],
  topics: [...fixture.topics, ...EXTRA_TOPICS],
  posts: [...fixture.posts, ...EXTRA_POSTS],
};

/** Quick-access demo login: the password is the e-mail itself. Local demo only. */
export const QUICK_DEMO = { username: 'Demo', email: 'demo@demo.fr', password: 'demo@demo.fr' } as const;

export const demoEmail = (username: string) => `${username.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@demo.lerevenu.local`;
