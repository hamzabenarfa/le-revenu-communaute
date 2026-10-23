/** Trusted sources from the community charter; mirrors apps/cms/src/utils/links.ts (the server enforces it). */
export const TRUSTED_DOMAINS = [
  "lerevenu.com",
  "gouv.fr",
  "service-public.fr",
  "amf-france.org",
  "banque-france.fr",
  "insee.fr",
  "info-retraite.fr",
  "ecb.europa.eu",
  "ccomptes.fr",
];

export const LINK_RE =
  /\b(?:https?:\/\/|www\.)[^\s<]+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|fr|net|org|eu|io|info|be|ch|co)\b(?:\/[^\s<]*)?/gi;

export const cleanLink = (raw: string) => raw.replace(/[.,;:!?)»]+$/, "");

/** Parsed like a browser would (`\` counts as `/`): the server applies the same rule. */
export function parseLink(raw: string): URL | null {
  const url = cleanLink(raw);
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return null;
  }
}

export const hostOf = (raw: string) =>
  parseLink(raw)
    ?.hostname.toLowerCase()
    .replace(/^www\./, "") ?? "\u0000invalid";
export const isTrusted = (host: string) =>
  TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));

export function untrustedHosts(text: string): string[] {
  const hosts = [...text.matchAll(LINK_RE)].map((m) => hostOf(m[0]));
  return [...new Set(hosts.filter((h) => !isTrusted(h)))];
}
