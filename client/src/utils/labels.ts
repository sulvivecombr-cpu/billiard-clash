import { tierForRating, type BallGroup, type Difficulty } from '@pool/shared';

/** pt-BR labels for AI difficulty levels. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  insane: 'Insano',
};

/** pt-BR label for a ball group (solids/stripes). */
export function groupLabel(group: BallGroup): string {
  return group === 'solids' ? 'LISAS' : 'LISTRADAS';
}

/** pt-BR tier name for a rating (Bronze, Prata, Ouro…). */
export function rankLabel(rating: number): string {
  return tierForRating(rating).label;
}
