/** Trusted sources (see the community charter): only these links are clickable for everyone. */
export const TRUSTED_DOMAINS = [
  'lerevenu.com',
  'gouv.fr',
  'service-public.fr',
  'amf-france.org',
  'banque-france.fr',
  'insee.fr',
  'info-retraite.fr',
  'ecb.europa.eu',
  'ccomptes.fr',
];

export const LINK_RE =
  /\b(?:https?:\/\/|www\.)[^\s<]+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|fr|net|org|eu|io|info|be|ch|co)\b(?:\/[^\s<]*)?/gi;

const cleanLink = (raw: string) => raw.replace(/[.,;:!?)»]+$/, '');
/**
 * Host as a browser would resolve it (`\` counts as `/`, userinfo is dropped…),
 * so `evil.xyz\.lerevenu.com` is recognised as evil.xyz, not as lerevenu.com.
 */
export const hostOf = (raw: string) => {
  const url = cleanLink(raw);
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '\u0000invalid';
  }
};
export const isTrustedHost = (host: string) => TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));

/** Hosts of the links in `text` that are not on the trusted list. */
export function untrustedHosts(text: string): string[] {
  const hosts = [...text.matchAll(LINK_RE)].map((m) => hostOf(m[0]));
  return [...new Set(hosts.filter((h) => !isTrustedHost(h)))];
}
