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
    onMutate: async ({ match_id, home_score, away_score }) => {
      if (!user) return;

      const key = ['prediction', user.id, match_id];
      const prev = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (current: any) => ({
        ...(current || {}),
        match_id,
        user_id: user.id,
        home_score,
        away_score,
        points: 0,
      }));

      return { prev, key };
    },
    mutationFn: async ({ match_id, home_score, away_score }: CreatePredictionInput) => {
      if (!user) throw new Error('Not authenticated');

      const base = {
        user_id: user.id,
        match_id,
        points: 0,
      };

      const payloads: any[] = [
        // 1) Máxima compatibilidad: si existen ambos pares de columnas y/o ambos son NOT NULL
        {
          ...base,
          home_score,
          away_score,
          predicted_home: home_score,
          predicted_away: away_score,
        },
        // 2) Esquema nuevo
        {
          ...base,
          home_score,
          away_score,
        },
        // 3) Esquema legacy
        {
          ...base,
          predicted_home: home_score,
          predicted_away: away_score,
        },
      ];

      let lastError: any = null;
      for (const payload of payloads) {
        const { error } = await supabase
          .from(SUPABASE_TABLES.PREDICTIONS)
          .upsert(payload, { onConflict: 'user_id,match_id' });
        if (!error) return;
        lastError = error;
      }

      throw lastError;
    },
    onError: (error: any, _vars, ctx: any) => {
      if (ctx?.key) {
        queryClient.setQueryData(ctx.key, ctx.prev);
      }
      if (error?.code === '23505') {
        toast.error('Ya has predicho este partido');
      } else if (error?.code === 'PGRST204') {
        toast.error('La tabla predictions no tiene las columnas esperadas (schema cache).');
      } else {
        toast.error('Error al guardar predicción');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      toast.success('Predicción guardada');
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
