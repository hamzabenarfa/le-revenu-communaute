import { errors } from '@strapi/utils';
import {
  parseListQuery,
  validateDiscussionInput,
  validatePostInput,
  validateProfileInput,
  validateReplyInput,
  validateReport,
  validateVote,
} from '../../src/utils/validation';

const valid = { title: 'Ouvrir un PEA à 30 ans ?', content: 'Bonjour à tous', type: 'question', category: 'abc123' };

/** Runs `fn`, expects a Strapi ValidationError and returns the offending field paths. */
function failingPaths(fn: () => unknown): string[] {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(errors.ValidationError);
    const details = (error as InstanceType<typeof errors.ValidationError>).details as { errors: { path: string[] }[] };
    return details.errors.map((e) => e.path.join('.'));
  }
  throw new Error('expected a ValidationError');
}

describe('validateDiscussionInput', () => {
  it('accepts a valid payload and trims strings', () => {
    expect(validateDiscussionInput({ data: { ...valid, title: `  ${valid.title}  ` } })).toEqual({ ...valid, pollOptions: [] });
  });

  it('rejects a title shorter than 10 characters, counted after trimming', () => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...valid, title: '   court    ' } }))).toEqual(['title']);
    expect(validateDiscussionInput({ data: { ...valid, title: '1234567890' } }).title).toBe('1234567890');
  });

  it.each([undefined, '', '   ', 42])('rejects missing or empty content (%p)', (content) => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...valid, content } }))).toEqual(['content']);
  });

  it.each(['QUESTION', 'sondage', '', undefined])('rejects an invalid type (%p)', (type) => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...valid, type } }))).toEqual(['type']);
  });

  it('requires a category', () => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...valid, category: '' } }))).toEqual(['category']);
  });

  it.each(['author', 'user', 'createdBy'])('rejects a client-supplied ownership field (%s)', (field) => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...valid, [field]: 1 } }))).toEqual([field]);
  });

  it('rejects unknown fields and a missing data envelope', () => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...valid, slug: 'x' } }))).toEqual(['slug']);
    expect(failingPaths(() => validateDiscussionInput({ title: valid.title }))).toEqual(['data']);
  });

  it('reports every invalid field at once', () => {
    expect(failingPaths(() => validateDiscussionInput({ data: {} }))).toEqual(['title', 'type', 'content', 'category']);
  });
});

describe('validateReplyInput', () => {
  it('accepts content and a discussion id', () => {
    expect(validateReplyInput({ data: { content: ' Merci ! ', discussion: 'd1' } })).toEqual({ content: 'Merci !', discussion: 'd1' });
  });

  it('rejects empty content and spoofed authors', () => {
    expect(failingPaths(() => validateReplyInput({ data: { content: ' ', discussion: 'd1' } }))).toEqual(['content']);
    expect(failingPaths(() => validateReplyInput({ data: { content: 'ok', discussion: 'd1', author: 2 } }))).toEqual(['author']);
  });
});

describe('parseListQuery', () => {
  it('applies defaults', () => {
    expect(parseListQuery({})).toEqual({ tab: 'new', category: null, sort: 'desc', page: 1, pageSize: 10 });
  });

  it('parses category, sort and pagination', () => {
    expect(parseListQuery({ tab: 'hot', category: 'assurance-vie', sort: 'asc', page: '2', pageSize: '20' })).toEqual({
      tab: 'hot',
      category: 'assurance-vie',
      sort: 'asc',
      page: 2,
      pageSize: 20,
    });
  });

  it('rejects malformed values instead of silently ignoring them', () => {
    expect(failingPaths(() => parseListQuery({ category: 'DROP TABLE', tab: 'trending', sort: 'random', page: '0', pageSize: '500' }))).toEqual([
      'category',
      'tab',
      'sort',
      'page',
      'pageSize',
    ]);
  });
});

describe('parseListQuery tab', () => {
  it.each(['new', 'hot', 'unanswered', 'foryou'])('accepts the %s tab', (tab) => {
    expect(parseListQuery({ tab }).tab).toBe(tab);
  });

  it('rejects an unknown tab', () => {
    expect(failingPaths(() => parseListQuery({ tab: 'popular' }))).toEqual(['tab']);
  });
});

describe('validateDiscussionInput polls', () => {
  const poll = { title: 'Quel support préférez-vous ?', type: 'poll', category: 'abc123', pollOptions: ['PEA', 'Assurance-vie'] };

  it('accepts a poll without content and trims its options', () => {
    const out = validateDiscussionInput({ data: { ...poll, pollOptions: [' PEA ', 'Assurance-vie'] } });
    expect(out).toMatchObject({ type: 'poll', content: '', pollOptions: ['PEA', 'Assurance-vie'] });
  });

  it('rejects a poll with fewer than 2 options', () => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...poll, pollOptions: ['PEA', '  '] } }))).toEqual(['pollOptions']);
  });

  it('rejects a poll with more than 6 options', () => {
    const pollOptions = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(failingPaths(() => validateDiscussionInput({ data: { ...poll, pollOptions } }))).toEqual(['pollOptions']);
  });

  it('accepts exactly 6 options', () => {
    const pollOptions = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(validateDiscussionInput({ data: { ...poll, pollOptions } }).pollOptions).toEqual(pollOptions);
  });

  it('rejects duplicate options regardless of case', () => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...poll, pollOptions: ['PEA', 'pea'] } }))).toEqual(['pollOptions']);
  });

  it('rejects an option longer than 80 characters', () => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...poll, pollOptions: ['x'.repeat(81), 'ok'] } }))).toEqual(['pollOptions']);
  });

  it('rejects poll options on a non-poll discussion', () => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...valid, pollOptions: ['a', 'b'] } }))).toEqual(['pollOptions']);
  });

  it('still requires content for a question', () => {
    expect(failingPaths(() => validateDiscussionInput({ data: { ...valid, content: '' } }))).toEqual(['content']);
  });
});

describe('validatePostInput', () => {
  const post = { title: 'Mon premier PEA, un an après', content: 'x'.repeat(60) };

  it('accepts a valid post with no category', () => {
    expect(validatePostInput({ data: post })).toEqual({ ...post, category: null });
  });

  it('rejects a title shorter than 10 characters', () => {
    expect(failingPaths(() => validatePostInput({ data: { ...post, title: 'Trop court' .slice(0, 9) } }))).toEqual(['title']);
  });

  it('rejects content shorter than 60 characters, counted after trimming', () => {
    expect(failingPaths(() => validatePostInput({ data: { ...post, content: `  ${'x'.repeat(59)}  ` } }))).toEqual(['content']);
  });

  it('rejects a client-supplied author', () => {
    expect(failingPaths(() => validatePostInput({ data: { ...post, author: 3 } }))).toEqual(['author']);
  });
});

describe('validateProfileInput', () => {
  it('accepts a partial update and only returns provided fields', () => {
    expect(validateProfileInput({ data: { bio: '  Investisseur  ' } })).toEqual({ bio: 'Investisseur' });
  });

  it.each(['ab', 'x'.repeat(25), '   '])('rejects an invalid displayName (%p)', (displayName) => {
    expect(failingPaths(() => validateProfileInput({ data: { displayName } }))).toEqual(['displayName']);
  });

  it('rejects a bio longer than 160 characters', () => {
    expect(failingPaths(() => validateProfileInput({ data: { bio: 'x'.repeat(161) } }))).toEqual(['bio']);
  });

  it('deduplicates interests and rejects non-string ones', () => {
    expect(validateProfileInput({ data: { interests: ['a', 'a', 'b'] } }).interests).toEqual(['a', 'b']);
    expect(failingPaths(() => validateProfileInput({ data: { interests: [1] } }))).toEqual(['interests']);
  });

  it.each(['memberRole', 'subscriber', 'username'])('rejects privileged field %s', (field) => {
    expect(failingPaths(() => validateProfileInput({ data: { [field]: 'redaction' } }))).toEqual([field]);
  });
});

describe('validateVote', () => {
  it.each([0, 3])('accepts option index %p', (option) => {
    expect(validateVote({ data: { option } })).toBe(option);
  });

  it.each([-1, 1.5, '1', null, undefined])('rejects invalid option %p', (option) => {
    expect(failingPaths(() => validateVote({ data: { option } }))).toEqual(['option']);
  });
});

describe('validateReport', () => {
  it('accepts a known target and reason', () => {
    expect(validateReport({ data: { targetType: 'reply', targetId: 'r1', reason: 'disrespect' } })).toEqual({
      targetType: 'reply',
      targetId: 'r1',
      reason: 'disrespect',
    });
  });

  it('rejects an unknown reason', () => {
    expect(failingPaths(() => validateReport({ data: { targetType: 'reply', targetId: 'r1', reason: 'boring' } }))).toEqual(['reason']);
  });

  it('rejects an unknown target type', () => {
    expect(failingPaths(() => validateReport({ data: { targetType: 'user', targetId: 'r1', reason: 'other' } }))).toEqual(['targetType']);
  });
});
