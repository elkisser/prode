import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_TABLES } from '@/lib/supabase';
import type { Match } from '@/types';
import { syncAllLeaguesEvents, syncLeagueEvents } from '@/lib/api/matches';
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
        const count = await syncLeagueEvents(normalizedCompetitionId);
        return count;
      }
      const total = await syncAllLeaguesEvents();
      return total;
    },
    onSuccess: (count, params) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      if (params?.silent) return;
      if (count > 0) {
        toast.success(`${count} partidos sincronizados`);
      } else {
        toast.error('No se encontraron partidos. Intenta más tarde.');
      }
    },
    onError: () => {
      toast.error('Error al sincronizar partidos');
    },
  });
}
