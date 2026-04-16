import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_TABLES } from '@/lib/supabase';
import type { Prediction, CreatePredictionInput } from '@/types';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export function usePredictions(matchId?: string) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['predictions', user?.id, matchId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from(SUPABASE_TABLES.PREDICTIONS)
        .select('*, match:matches(*, competition:competitions(*))')
        .eq('user_id', user.id);

      if (matchId) {
        query = query.eq('match_id', matchId);
      }

      const { data } = await query;
      const rows = (data || []) as any[];
      return rows.map((p) => ({
        ...p,
        home_score: typeof p.home_score === 'number' ? p.home_score : p.predicted_home,
        away_score: typeof p.away_score === 'number' ? p.away_score : p.predicted_away,
      })) as Prediction[];
    },
    enabled: !!user,
  });
}

export function useCreatePrediction() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ match_id, home_score, away_score }: CreatePredictionInput) => {
      if (!user) throw new Error('Not authenticated');

      const base = {
        user_id: user.id,
        match_id,
        points: 0,
      };

      const { error } = await supabase
        .from(SUPABASE_TABLES.PREDICTIONS)
        .upsert(
          {
            ...base,
            home_score,
            away_score,
          },
          { onConflict: 'user_id,match_id' }
        );

      if (!error) return;

      const shouldRetryLegacy =
        error?.code === 'PGRST204' ||
        (error?.code === '23502' && String(error?.message || '').includes('predicted_home')) ||
        String(error?.message || '').includes("predicted_home") ||
        String(error?.message || '').includes("predicted_away");

      if (!shouldRetryLegacy) throw error;

      const { error: error2 } = await supabase
        .from(SUPABASE_TABLES.PREDICTIONS)
        .upsert(
          {
            ...base,
            predicted_home: home_score,
            predicted_away: away_score,
          } as any,
          { onConflict: 'user_id,match_id' }
        );

      if (error2) throw error2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      toast.success('Predicción guardada');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Ya has predicho este partido');
      } else if (error?.code === 'PGRST204') {
        toast.error('La tabla predictions no tiene las columnas home_score/away_score (o el schema cache no se recargó). Recarga el schema de PostgREST y/o ejecuta el ALTER TABLE.');
      } else {
        toast.error('Error al guardar predicción');
      }
    },
  });
}

export function useMatchPrediction(matchId: number) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['prediction', user?.id, matchId],
    queryFn: async () => {
      if (!user) return null;

      const { data } = await supabase
        .from(SUPABASE_TABLES.PREDICTIONS)
        .select('*')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .single();

      if (!data) return null;
      const p: any = data;
      return {
        ...p,
        home_score: typeof p.home_score === 'number' ? p.home_score : p.predicted_home,
        away_score: typeof p.away_score === 'number' ? p.away_score : p.predicted_away,
      } as Prediction;
    },
    enabled: !!user && !!matchId,
  });
}
