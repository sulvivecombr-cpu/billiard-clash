import { describe, expect, it } from 'vitest';
import { MIN_RATING, STARTING_RATING, computeRatings, tierForRating } from './ranking';

describe('tierForRating', () => {
  it('maps a new player to the lowest tier', () => {
    expect(tierForRating(STARTING_RATING).id).toBe('bronze');
  });

  it('picks the highest tier whose minimum is met', () => {
    expect(tierForRating(1100).id).toBe('prata');
    expect(tierForRating(1249).id).toBe('prata');
    expect(tierForRating(1250).id).toBe('ouro');
    expect(tierForRating(5000).id).toBe('mestre');
  });
});

describe('computeRatings', () => {
  it('moves the winner up and the loser down by the same amount', () => {
    const { winner, loser } = computeRatings(1000, 1000);
    expect(winner).toBeGreaterThan(1000);
    expect(loser).toBeLessThan(1000);
    expect(winner - 1000).toBe(1000 - loser);
  });

  it('awards fewer points for beating a much weaker player', () => {
    const even = computeRatings(1000, 1000);
    const upset = computeRatings(1000, 1600);
    expect(upset.winner - 1000).toBeGreaterThan(even.winner - 1000);
  });

  it('never drops a player below the floor', () => {
    const { loser } = computeRatings(2000, MIN_RATING);
    expect(loser).toBe(MIN_RATING);
  });
});
