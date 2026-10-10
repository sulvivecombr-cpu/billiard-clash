import { computeRatings } from '@pool/shared';
import { pool } from '../db';

export interface RankedParticipant {
  userId: string;
  rating: number;
}

/**
 * Persists a ranked (both players signed in) match result: updates both
 * ratings via Elo and each player's win/loss counters. Returns the new ratings.
 */
export async function applyMatchResult(
  winner: RankedParticipant,
  loser: RankedParticipant
): Promise<{ winner: number; loser: number }> {
  const ratings = computeRatings(winner.rating, loser.rating);

  await pool.query(
    `UPDATE users SET rating = $1, wins = wins + 1, games_played = games_played + 1 WHERE id = $2`,
    [ratings.winner, winner.userId]
  );
  await pool.query(
    `UPDATE users SET rating = $1, losses = losses + 1, games_played = games_played + 1 WHERE id = $2`,
    [ratings.loser, loser.userId]
  );

  return ratings;
}
