const MAX_SLUG_LENGTH = 80;

/** "Faut-il ouvrir un PER à 45 ans ?" -> "faut-il-ouvrir-un-per-a-45-ans" */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
  return slug || 'discussion';
}

/**
 * Returns the first free variant of `base` (`base`, `base-2`, `base-3`…).
 * The database unique constraint on `slug` remains the final guard against races.
 */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${root}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
