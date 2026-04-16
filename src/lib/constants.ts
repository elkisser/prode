import { ScoreMode } from '@/types';

export const POINTS = {
  SIMPLE: {
    WINNER: 3,
    EXACT: 5,
  },
  EXACT: {
    EXACT_SCORE: 5,
    WINNER: 3,
  },
} as const;

export function calculatePoints(
  prediction: { home_score: number; away_score: number },
  match: { home_score: number | null; away_score: number | null },
  scoreMode: ScoreMode
): number {
  if (match.home_score === null || match.away_score === null) {
    return 0;
  }

  const predictionIsExact =
    prediction.home_score === match.home_score &&
    prediction.away_score === match.away_score;

  if (predictionIsExact) {
    return scoreMode === 'simple' ? POINTS.SIMPLE.EXACT : POINTS.EXACT.EXACT_SCORE;
  }

  const matchIsDraw = match.home_score === match.away_score;
  const predictionIsDraw = prediction.home_score === prediction.away_score;

  if (matchIsDraw && predictionIsDraw) {
    return POINTS.SIMPLE.WINNER;
  }

  const matchHomeWins = match.home_score > match.away_score;
  const predictionHomeWins = prediction.home_score > prediction.away_score;

  if (matchHomeWins === predictionHomeWins) {
    return POINTS.SIMPLE.WINNER;
  }

  return 0;
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}