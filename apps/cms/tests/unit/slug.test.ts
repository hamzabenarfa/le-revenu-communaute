import { slugify, uniqueSlug } from '../../src/utils/slug';

describe('slugify', () => {
  it('produces readable ASCII slugs from French titles', () => {
    expect(slugify('Faut-il ouvrir un PER à 45 ans ?')).toBe('faut-il-ouvrir-un-per-a-45-ans');
    expect(slugify("L'épargne : ça rapporte ?")).toBe('l-epargne-ca-rapporte');
  });

  it('falls back when nothing usable remains', () => {
    expect(slugify('?!…')).toBe('discussion');
  });
});

describe('uniqueSlug', () => {
  it('suffixes the slug until it is free', async () => {
    const taken = new Set(['mon-titre', 'mon-titre-2']);
    await expect(uniqueSlug('Mon titre', async (s) => taken.has(s))).resolves.toBe('mon-titre-3');
  });
});
