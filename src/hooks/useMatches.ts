import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_TABLES } from '@/lib/supabase';
import type { Match } from '@/types';
import { syncAllLeaguesEvents, syncLeagueEvents, type SyncMatchesResult } from '@/lib/api/matches';
import toast from 'react-hot-toast';

function normalizeCompetitionId(competitionId?: string) {
  if (!competitionId) return undefined;
  const legacyMap: Record<string, string> = {
    '4480': '4424',
    '4481': '4425',
    '4396': '4406',
  };
  return legacyMap[competitionId] || competitionId;
}

export function useMatches(competitionId?: string) {
  const normalizedCompetitionId = normalizeCompetitionId(competitionId);
  return useQuery({
    queryKey: ['matches', normalizedCompetitionId],
    queryFn: async () => {
      let query = supabase
        .from(SUPABASE_TABLES.MATCHES)
        .select('*')
        .order('match_date', { ascending: true });

      if (normalizedCompetitionId) {
        query = query.eq('competition_id', normalizedCompetitionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Match[];
    },
  });
}

export function useSyncMatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { competitionId?: string; silent?: boolean }) => {
      const normalizedCompetitionId = normalizeCompetitionId(params?.competitionId);
      if (normalizedCompetitionId) {
        const result = await syncLeagueEvents(normalizedCompetitionId);
        return result;
      }
      const result = await syncAllLeaguesEvents();
      return result;
    },
    onSuccess: (result: SyncMatchesResult, params) => {
      if (result.synced > 0) {
        const normalizedCompetitionId = normalizeCompetitionId(params?.competitionId);
        queryClient.invalidateQueries({
          queryKey: normalizedCompetitionId ? ['matches', normalizedCompetitionId] : ['matches'],
        });
      }
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['prediction'] });
      queryClient.invalidateQueries({ queryKey: ['myPredictionsLite'] });
      queryClient.invalidateQueries({ queryKey: ['leagueStandings'] });

      if (params?.silent) return;
      if (result.mode === 'recalculate_points') {
        const updated = typeof result.updatedPredictions === 'number' ? result.updatedPredictions : 0;
        toast.success(updated > 0 ? `Puntos actualizados (${updated})` : 'Puntos actualizados');
        return;
      }
      if (result.synced > 0) {
        toast.success(`${result.synced} partidos sincronizados`);
      } else {
        toast.error('No se encontraron partidos. Intenta más tarde.');
      }
    },
    onError: (_error, params?: { competitionId?: string; silent?: boolean }) => {
      if (params?.silent) return;
      const message =
        _error instanceof Error
          ? _error.message
          : typeof _error === 'string'
            ? _error
            : null;
      toast.error(message ? `Error al sincronizar: ${message}` : 'Error al sincronizar partidos');
    },
  });
}
