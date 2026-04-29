import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimePredictions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('predictions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['predictions'] });
          queryClient.invalidateQueries({ queryKey: ['prediction'] });
          queryClient.invalidateQueries({ queryKey: ['myPredictionsLite'] });
          queryClient.invalidateQueries({ queryKey: ['leagueStandings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeLeagueMembers() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('league_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'league_members',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leagueStandings'] });
          queryClient.invalidateQueries({ queryKey: ['leagues'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeMatches() {
  const queryClient = useQueryClient();
  const invalidateTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('matches_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        () => {
          if (invalidateTimeoutRef.current) {
            window.clearTimeout(invalidateTimeoutRef.current);
          }
          invalidateTimeoutRef.current = window.setTimeout(() => {
            invalidateTimeoutRef.current = null;
            queryClient.invalidateQueries({ queryKey: ['matches'] });
          }, 600);
        }
      )
      .subscribe();

    return () => {
      if (invalidateTimeoutRef.current) {
        window.clearTimeout(invalidateTimeoutRef.current);
        invalidateTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
