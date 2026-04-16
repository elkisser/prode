import { useEffect } from 'react';
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
          queryClient.invalidateQueries({ queryKey: ['matches'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}