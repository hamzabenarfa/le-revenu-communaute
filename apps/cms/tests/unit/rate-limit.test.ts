import { errors } from '@strapi/utils';
import rateLimit from '../../src/policies/rate-limit';

const ctx = (id: number) => ({ state: { user: { id } }, request: { ip: '127.0.0.1' } });

describe('rate-limit policy', () => {
  it('lets a member write up to the limit, then answers 429', () => {
    for (let i = 0; i < 3; i += 1) expect(rateLimit(ctx(101), { max: 3 })).toBe(true);
    expect(() => rateLimit(ctx(101), { max: 3 })).toThrow(errors.RateLimitError);
  });

  it('counts each member separately', () => {
    for (let i = 0; i < 3; i += 1) rateLimit(ctx(202), { max: 3 });
    expect(rateLimit(ctx(203), { max: 3 })).toBe(true);
  });
});
