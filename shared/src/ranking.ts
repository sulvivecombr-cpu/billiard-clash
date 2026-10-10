/**
 * Ranking (rating + tier) helpers shared by the server (which awards points)
 * and the client (which displays them). Kept dependency-free so both sides
 * agree on the exact same thresholds and Elo maths.
 */

/** Rating every new player starts with. */
export const STARTING_RATING = 1000;

/** Rating never drops below this. */
export const MIN_RATING = 100;

/** Elo K-factor — how many points a single match can move a player. */
export const RATING_K_FACTOR = 32;

export interface RankTier {
  id: string;
  /** pt-BR display name. */
  label: string;
  /** Minimum rating required to reach this tier. */
  min: number;
}

/** Ordered from lowest to highest. */
export const RANK_TIERS: RankTier[] = [
  { id: 'bronze', label: 'Bronze', min: 0 },
  { id: 'prata', label: 'Prata', min: 1100 },
  { id: 'ouro', label: 'Ouro', min: 1250 },
  { id: 'platina', label: 'Platina', min: 1400 },
  { id: 'diamante', label: 'Diamante', min: 1600 },
  { id: 'mestre', label: 'Mestre', min: 1800 },
];

/** The tier a rating currently belongs to. */
export function tierForRating(rating: number): RankTier {
  let tier = RANK_TIERS[0];
  for (const candidate of RANK_TIERS) {
    if (rating >= candidate.min) tier = candidate;
  }
  return tier;
}

/** Standard Elo expected score of player A against player B. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * New ratings for the winner and the loser of a match. The winner takes the
 * points the loser gives up (a single delta keeps the pool balanced), with a
 * minimum of 1 point so upsets against much stronger players always count.
 */
export function computeRatings(
  winnerRating: number,
  loserRating: number
): { winner: number; loser: number } {
  const expectedWinner = expectedScore(winnerRating, loserRating);
  const delta = Math.max(1, Math.round(RATING_K_FACTOR * (1 - expectedWinner)));
  return {
    winner: winnerRating + delta,
    loser: Math.max(MIN_RATING, loserRating - delta),
  };
}
