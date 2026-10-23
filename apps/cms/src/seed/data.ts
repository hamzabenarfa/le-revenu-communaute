/**
 * Demo fixtures. `prototype.json` is generated from the data section of the HTML
 * prototype (pseudonymous members, no real personal data) — local evaluation only.
 */
import fixture from './prototype.json';

export const FIXTURE = fixture;

/** Quick-access demo login: the password is the e-mail itself. Local demo only. */
export const QUICK_DEMO = { username: 'Demo', email: 'demo@demo.fr', password: 'demo@demo.fr' } as const;

export const demoEmail = (username: string) => `${username.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@demo.lerevenu.local`;
