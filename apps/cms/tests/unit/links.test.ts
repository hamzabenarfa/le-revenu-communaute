import { isTrustedHost, untrustedHosts } from '../../src/utils/links';

describe('isTrustedHost', () => {
  it.each(['lerevenu.com', 'www.service-public.fr', 'impots.gouv.fr', 'amf-france.org'])('trusts %s', (host) => {
    expect(isTrustedHost(host)).toBe(true);
  });

  it.each(['pub-crypto.com', 'evil-lerevenu.com', 'lerevenu.com.evil.io', 'gouv.fr.attacker.net'])('does not trust %s', (host) => {
    expect(isTrustedHost(host)).toBe(false);
  });
});

describe('untrustedHosts', () => {
  it('returns an empty list when the text has no link', () => {
    expect(untrustedHosts('Bonjour, voici mon avis sur le PEA.')).toEqual([]);
  });

  it('ignores trusted links', () => {
    expect(untrustedHosts('Voir https://www.service-public.fr/particuliers/vosdroits/F1')).toEqual([]);
  });

  it('reports untrusted hosts once, lowercased and without trailing punctuation', () => {
    expect(untrustedHosts('Allez sur https://Pub-Crypto.com/x, puis www.pub-crypto.com. Merci')).toEqual(['pub-crypto.com']);
  });

  it('detects bare domains without a scheme', () => {
    expect(untrustedHosts('Rendez-vous sur pub-crypto.com pour gagner')).toEqual(['pub-crypto.com']);
  });

  it('only reports the untrusted hosts of a mixed text', () => {
    expect(untrustedHosts('https://lerevenu.com/a et https://spam.io/b')).toEqual(['spam.io']);
  });

  it('resolves hosts like a browser: a backslash cannot smuggle an untrusted host', () => {
    expect(untrustedHosts('https://evil.xyz\\.lerevenu.com/a')).toEqual(['evil.xyz']);
    expect(untrustedHosts('www.evil.xyz\\.gouv.fr')).toEqual(['evil.xyz']);
  });
});
