import { activityPoints, BADGES, earnedBadges, emptyStats, levelFor, POINTS } from '../../src/utils/reputation';

describe('levelFor', () => {
  it('starts at the first level with 0 points', () => {
    expect(levelFor(0)).toMatchObject({ index: 0, name: 'Nouveau venu', min: 0, next: 25, nextName: 'Membre' });
  });

  it('stays on a level until the next threshold is reached', () => {
    expect(levelFor(24).index).toBe(0);
    expect(levelFor(25).index).toBe(1);
  });

  it('reaches the external-link level at 300 points', () => {
    expect(levelFor(299).index).toBe(2);
    expect(levelFor(300)).toMatchObject({ index: 3, name: 'Contributeur averti' });
  });

  it('has no next level at the top', () => {
    expect(levelFor(10_000)).toMatchObject({ index: 4, next: null, nextName: null });
  });
});

describe('activityPoints', () => {
  it('is 0 for a member without activity', () => {
    expect(activityPoints(emptyStats())).toBe(0);
  });

  it('adds the welcome bonus only once onboarded', () => {
    expect(activityPoints({ ...emptyStats(), onboarded: true })).toBe(POINTS.welcome);
  });

  it('weights each activity with its own points', () => {
    const stats = { ...emptyStats(), discussions: 1, replies: 2, solutions: 1, usefulReceived: 3, votes: 4, visitDays: 2 };
    expect(activityPoints(stats)).toBe(5 + 2 * 3 + 20 + 3 * 5 + 4 + 2);
  });
});

describe('earnedBadges', () => {
  it('only grants the welcome badge to a new member', () => {
    expect(earnedBadges(emptyStats())).toEqual(['bienvenue']);
  });

  it('grants badges as thresholds are reached', () => {
    const stats = { ...emptyStats(), discussions: 1, replies: 1, usefulReceived: 1, solutions: 1, polls: 1 };
    expect(earnedBadges(stats)).toEqual(['bienvenue', 'premier_sujet', 'premiere_reponse', 'apprecie', 'solution', 'sondeur']);
  });

  it('does not grant threshold badges one short of the threshold', () => {
    const stats = { ...emptyStats(), usefulReceived: 24, votes: 2, streak: 6, replies: 49 };
    const badges = earnedBadges(stats);
    expect(badges).not.toContain('populaire');
    expect(badges).not.toContain('citoyen');
    expect(badges).not.toContain('assidu');
    expect(badges).not.toContain('pilier');
  });

  it('grants every badge to a fully active member', () => {
    const stats = { ...emptyStats(), discussions: 1, polls: 1, replies: 50, usefulReceived: 25, solutions: 1, votes: 3, streak: 7 };
    expect(earnedBadges(stats).sort()).toEqual(Object.keys(BADGES).sort());
  });
});
