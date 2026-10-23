import { type DiscussionRow, seoStatus } from '../../src/api/discussion/services/discussion';

const discussion = (extra: Partial<DiscussionRow> = {}): DiscussionRow =>
  ({ id: 1, documentId: 'd1', title: 'Faut-il ouvrir un PER ?', slug: 'per', category: { id: 1, documentId: 'c1', name: 'Retraite', slug: 'retraite' }, ...extra }) as DiscussionRow;
const reply = (id: number, extra: Record<string, unknown> = {}) =>
  ({ id, documentId: `r${id}`, content: 'Réponse', usefulCount: 0, ...extra }) as Parameters<typeof seoStatus>[1][number];

describe('seoStatus', () => {
  it('keeps unanswered discussions out of the index', () => {
    expect(seoStatus(discussion(), [])).toMatchObject({ indexed: false, reason: 'Pas encore de réponse' });
  });

  it('never indexes the Café du Revenu, even with a best answer', () => {
    const d = discussion({ category: { id: 2, documentId: 'c2', name: 'Café', slug: 'cafe' }, solution: { id: 7, documentId: 'r7' } });
    expect(seoStatus(d, [reply(7)]).indexed).toBe(false);
  });

  it('indexes a question once a best answer is chosen', () => {
    const d = discussion({ solution: { id: 7, documentId: 'r7' } });
    expect(seoStatus(d, [reply(7, { verified: true })])).toMatchObject({ indexed: true, reason: 'Meilleure réponse vérifiée par la rédaction' });
  });

  it('indexes a discussion with enough useful signals and two replies', () => {
    expect(seoStatus(discussion({ usefulCount: 20 }), [reply(1, { usefulCount: 5 }), reply(2)]).indexed).toBe(true);
    expect(seoStatus(discussion({ usefulCount: 20 }), [reply(1, { usefulCount: 4 }), reply(2)]).indexed).toBe(false);
  });
});
