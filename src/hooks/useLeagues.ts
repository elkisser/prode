import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_TABLES } from '@/lib/supabase';
import type { League, LeagueStanding, CreateLeagueInput, JoinLeagueInput } from '@/types';
import { generateInviteCode } from '@/lib/constants';
import { syncLeagueEvents } from '@/lib/api/matches';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export function useLeagues() {
  const user = useAuthStore((state) => state.user);

  const { data: myLeagues = [], isLoading } = useQuery({
    queryKey: ['leagues', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from(SUPABASE_TABLES.LEAGUE_MEMBERS)
        .select(`
          *,
          league:leagues(*)
        `)
        .eq('user_id', user.id);
      return (data || []).map((d: any) => d.league as League);
    },
    enabled: !!user,
  });

  return { myLeagues, isLoading };
}

export function useCreateLeague() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ name, scoring_mode, competition_id, competition_name }: CreateLeagueInput) => {
      if (!user) throw new Error('Not authenticated');

      const invite_code = generateInviteCode();

      const { data: league, error: leagueError } = await supabase
        .from(SUPABASE_TABLES.LEAGUES)
        .insert({
          name,
          scoring_mode,
          invite_code,
          owner_id: user.id,
          created_by: user.id,
          competition_id,
          competition_name,
        })
        .select()
        .single();

      if (leagueError) {
        console.error('Error creating league:', leagueError);
        throw new Error('Error al crear liga: ' + leagueError.message);
      }

      const { error: memberError } = await supabase
        .from(SUPABASE_TABLES.LEAGUE_MEMBERS)
        .insert({
          league_id: league.id,
          user_id: user.id,
        });

      if (memberError) {
        console.error('Error adding member:', memberError);
        throw new Error('Error al agregar miembro: ' + memberError.message);
      }

      try {
        await syncLeagueEvents(competition_id);
      } catch (syncError) {
        console.warn('Sync after league creation failed:', syncError);
      }

      return league;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast.success('Liga creada y partidos sincronizados!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al crear la liga');
    },
  });
}

export function useJoinLeague() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ invite_code }: JoinLeagueInput) => {
      if (!user) throw new Error('Not authenticated');
      const normalizedCode = invite_code.trim().toUpperCase();

      const { data: rpcData, error: rpcError } = await supabase.rpc('join_league_by_invite', {
        p_invite_code: normalizedCode,
      });

      const rpcMissing =
        !!rpcError &&
        (rpcError.code === 'PGRST202' ||
          String(rpcError.message || '').toLowerCase().includes('join_league_by_invite'));

      if (!rpcError) {
        const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        const leagueId = (rpcRow as any)?.league_id;

        if (!leagueId) {
          throw new Error('No se pudo obtener la liga para unirse');
        }

        const { data: league, error: leagueError } = await supabase
          .from(SUPABASE_TABLES.LEAGUES)
          .select('*')
          .eq('id', leagueId)
          .single();

        if (leagueError) {
          throw new Error('Te uniste a la liga, pero hubo un problema al cargarla');
        }

        try {
          await syncLeagueEvents(league.competition_id);
        } catch (syncError) {
          console.warn('Sync after joining failed:', syncError);
        }

        return league;
      }

      if (!rpcMissing) {
        throw rpcError;
      }

      const { data: league } = await supabase
        .from(SUPABASE_TABLES.LEAGUES)
        .select('*')
        .eq('invite_code', normalizedCode)
        .single();

      if (!league) throw new Error('Código de liga inválido');

      const { error: memberError } = await supabase
        .from(SUPABASE_TABLES.LEAGUE_MEMBERS)
        .insert({
          league_id: league.id,
          user_id: user.id,
        });

      if (memberError) {
        if (memberError.code === '23505') {
          throw new Error('Ya eres miembro de esta liga');
        }
        throw memberError;
      }

      try {
        await syncLeagueEvents(league.competition_id);
      } catch (syncError) {
        console.warn('Sync after joining failed:', syncError);
      }

      return league;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast.success('Te uniste a la liga!');
    },
  });
}

export function useLeagueStandings(leagueId: string) {
  return useQuery({
    queryKey: ['leagueStandings', leagueId],
    queryFn: async () => {
      const { data: league } = await supabase
        .from(SUPABASE_TABLES.LEAGUES)
        .select('competition_id')
        .eq('id', leagueId)
        .single();

      const { data: members } = await supabase
        .from(SUPABASE_TABLES.LEAGUE_MEMBERS)
        .select('user_id')
        .eq('league_id', leagueId);

      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);

      const competitionId = league?.competition_id ? String(league.competition_id) : null;
      let matchIds: string[] = [];
      if (competitionId) {
        const { data: matches } = await supabase
          .from(SUPABASE_TABLES.MATCHES)
          .select('id')
          .eq('competition_id', competitionId);
        matchIds = (matches || [])
          .map((m: any) => m?.id)
          .filter((id: any) => id !== null && typeof id !== 'undefined')
          .map((id: any) => String(id));
      }

      const { data: predictions } = await supabase
        .from(SUPABASE_TABLES.PREDICTIONS)
        .select('user_id, points')
        .in('user_id', userIds)
        .in('match_id', matchIds.length > 0 ? matchIds : ['__none__'])
        .gt('points', 0);

      const { data: profiles } = await supabase
        .from(SUPABASE_TABLES.PROFILES)
        .select('id, username, avatar_url')
        .in('id', userIds);

      const pointsByUser: Record<string, number> = {};
      predictions?.forEach((p: any) => {
        pointsByUser[p.user_id] = (pointsByUser[p.user_id] || 0) + p.points;
      });

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => {
        profileMap[p.id] = p;
      });

      const standings: LeagueStanding[] = members.map((member: any, index: number) => ({
        position: index + 1,
        user_id: member.user_id,
        username: profileMap[member.user_id]?.username || 'Unknown',
        avatar_url: profileMap[member.user_id]?.avatar_url,
        total_points: pointsByUser[member.user_id] || 0,
      }));

      standings.sort((a, b) => b.total_points - a.total_points);
      standings.forEach((s, i) => s.position = i + 1);

      return standings;
    },
  });
}

export function useLeaveLeague() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (leagueId: string) => {
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from(SUPABASE_TABLES.LEAGUE_MEMBERS)
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast.success('Has salido de la liga');
    },
  });
}

export function useDeleteLeague() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (leagueId: string) => {
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from(SUPABASE_TABLES.LEAGUE_MEMBERS)
        .delete()
        .eq('league_id', leagueId);

      await supabase
        .from(SUPABASE_TABLES.LEAGUES)
        .delete()
        .eq('id', leagueId)
        .eq('created_by', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast.success('Liga eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar la liga');
    },
  });
}
