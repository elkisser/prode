import { supabase, SUPABASE_TABLES } from '@/lib/supabase';

function getInvokeErrorMessage(error: any): string {
  const fallback = error instanceof Error ? error.message : String(error || 'Error al sincronizar');
  const ctx = (error as any)?.context;
  const body = ctx?.body;
  if (body) {
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      if (parsed?.error) return String(parsed.error);
      if (parsed?.message) return String(parsed.message);
    } catch {
      if (typeof body === 'string' && body.trim()) return body;
    }
  }
  return fallback;
}

export async function syncLeagueEvents(leagueId: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke('sync-fixtures', {
    body: { competition_id: leagueId },
  });

  if (error) throw new Error(getInvokeErrorMessage(error));
  if ((data as any)?.success === false) {
    throw new Error(String((data as any)?.error || 'Error al sincronizar'));
  }
  return Number((data as any)?.total ?? 0);
}

export async function syncAllLeaguesEvents(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('sync-fixtures', {
    body: {},
  });

  if (error) throw new Error(getInvokeErrorMessage(error));
  if ((data as any)?.success === false) {
    throw new Error(String((data as any)?.error || 'Error al sincronizar'));
  }
  return Number((data as any)?.total ?? 0);
}

export async function updateMatchResults(matchId: number): Promise<number> {
  const { data: match } = await supabase
    .from(SUPABASE_TABLES.MATCHES)
    .select('*')
    .eq('id', matchId)
    .single();

  if (!match || match.status === 'pending') return 0;

  const { data: predictions } = await supabase
    .from(SUPABASE_TABLES.PREDICTIONS)
    .select('*')
    .eq('match_id', matchId);

  if (!predictions || predictions.length === 0) return 0;

  let updatedCount = 0;
  for (const prediction of predictions) {
    const predictedHome =
      typeof (prediction as any).home_score === 'number'
        ? (prediction as any).home_score
        : typeof (prediction as any).predicted_home === 'number'
          ? (prediction as any).predicted_home
          : Number((prediction as any).predicted_home);
    const predictedAway =
      typeof (prediction as any).away_score === 'number'
        ? (prediction as any).away_score
        : typeof (prediction as any).predicted_away === 'number'
          ? (prediction as any).predicted_away
          : Number((prediction as any).predicted_away);

    const points = calculatePredictionPoints(
      predictedHome,
      predictedAway,
      match.home_score,
      match.away_score
    );
    if (points > prediction.points) {
      await supabase.from(SUPABASE_TABLES.PREDICTIONS).update({ points }).eq('id', prediction.id);
      updatedCount++;
    }
  }
  return updatedCount;
}

function calculatePredictionPoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number | null,
  actualAway: number | null
): number {
  if (actualHome === null || actualAway === null) return 0;
  const isExact = predictedHome === actualHome && predictedAway === actualAway;
  if (isExact) return 5;
  const actualWins = actualHome > actualAway;
  const predictedWins = predictedHome > predictedAway;
  const isDraw = actualHome === actualAway;
  const predictedDraw = predictedHome === predictedAway;
  if ((isDraw && predictedDraw) || actualWins === predictedWins) return 3;
  return 0;
}

export async function updateAllFinishedMatchesResults(): Promise<{ updatedMatches: number; updatedPredictions: number }> {
  const { data: finishedMatches } = await supabase
    .from(SUPABASE_TABLES.MATCHES)
    .select('id')
    .eq('status', 'finished');

  if (!finishedMatches || finishedMatches.length === 0) {
    return { updatedMatches: 0, updatedPredictions: 0 };
  }

  let totalUpdatedPredictions = 0;
  for (const match of finishedMatches) {
    const updated = await updateMatchResults(match.id);
    totalUpdatedPredictions += updated;
  }

  return { updatedMatches: finishedMatches.length, updatedPredictions: totalUpdatedPredictions };
}
