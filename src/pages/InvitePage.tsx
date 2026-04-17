import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, SUPABASE_TABLES } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useJoinLeague } from '@/hooks/useLeagues';
import { Trophy, Users, ChevronLeft, Copy, Share2 } from '@/components/Icons';
import toast from 'react-hot-toast';

export function InvitePage() {
  const { inviteCode = '' } = useParams<{ inviteCode: string }>();
  const normalizedCode = inviteCode.toUpperCase();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const joinLeague = useJoinLeague();

  const { data: league, isLoading } = useQuery({
    queryKey: ['inviteLeague', normalizedCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(SUPABASE_TABLES.LEAGUES)
        .select('id, name, scoring_mode, competition_name, invite_code')
        .eq('invite_code', normalizedCode)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: normalizedCode.length > 0,
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: ['inviteMemberCount', league?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from(SUPABASE_TABLES.LEAGUE_MEMBERS)
        .select('*', { count: 'exact', head: true })
        .eq('league_id', league!.id);
      return count || 0;
    },
    enabled: !!league?.id,
  });

  const handleJoin = async () => {
    if (!league) return;
    try {
      await joinLeague.mutateAsync({ invite_code: league.invite_code });
      navigate(`/league/${league.id}`);
    } catch (error: any) {
      if (String(error?.message || '').includes('Ya eres miembro')) {
        toast.success('Ya estás en esta liga');
        navigate(`/league/${league.id}`);
        return;
      }
      toast.error(error?.message || 'No se pudo unir a la liga');
    }
  };

  const inviteUrl = league?.invite_code ? `${window.location.origin}/invite/${league.invite_code}` : '';

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    const canShare = typeof (navigator as any)?.share === 'function';
    if (!canShare) {
      await handleCopy();
      return;
    }
    try {
      await (navigator as any).share({
        title: league?.name ? `Invitación a ${league.name}` : 'Invitación a liga',
        url: inviteUrl,
      });
    } catch {
      // usuario canceló
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 text-dark-50 flex items-center justify-center p-6">
        <div className="glass-card rounded-[2rem] p-8 border-white/5 w-full max-w-xl animate-pulse h-56" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-dark-950 text-dark-50 flex items-center justify-center p-6">
        <div className="glass-card rounded-[2rem] p-8 border-white/5 w-full max-w-xl text-center">
          <h1 className="text-2xl font-black text-white">Invitación inválida</h1>
          <p className="text-dark-400 mt-3">Este link no corresponde a ninguna liga activa.</p>
          <div className="mt-6">
            <Link to="/dashboard" className="btn-primary px-6 py-3 rounded-2xl font-black inline-flex">
              Ir al Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-dark-50">
      <header className="sticky top-0 z-30 bg-dark-900 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to={user ? '/dashboard' : '/login'}
              className="w-10 h-10 rounded-2xl bg-dark-800/50 border border-white/5 flex items-center justify-center text-dark-200 hover:text-white hover:bg-dark-800/80 transition-colors"
              aria-label="Volver"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg md:text-xl font-black text-white">Invitación a Liga</h1>
            <div className="w-10 h-10 rounded-2xl bg-primary-500/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary-400" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12 min-h-[calc(100vh-72px)] flex items-center justify-center">
        <div className="glass-card rounded-[2.75rem] p-6 md:p-10 border-white/5 relative overflow-hidden w-full prode-fade-up">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500/60 to-secondary-500/60" />
          <div className="text-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-primary-400">Te invitaron a unirte</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mt-2 break-words">{league.name}</h2>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-dark-900/40 border border-white/5">
              <code className="text-sm font-black text-primary-300 tracking-widest uppercase">{league.invite_code}</code>
              <button
                type="button"
                onClick={handleShare}
                className="text-dark-300 hover:text-white transition-colors"
                aria-label="Compartir link de invitación"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="text-dark-300 hover:text-white transition-colors"
                aria-label="Copiar link de invitación"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 bg-dark-900/40 border border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-dark-500">Competencia</div>
              <div className="text-sm font-black text-white mt-2">{league.competition_name}</div>
            </div>
            <div className="rounded-2xl p-4 bg-dark-900/40 border border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-dark-500">Modo</div>
              <div className="text-sm font-black text-white mt-2">
                {league.scoring_mode === 'simple' ? 'Simple' : 'Experto'}
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-dark-900/40 border border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-dark-500">Miembros</div>
              <div className="text-sm font-black text-white mt-2 inline-flex items-center gap-2">
                <Users className="w-4 h-4" />
                {memberCount}
              </div>
            </div>
          </div>

          {!user ? (
            <div className="mt-8 rounded-2xl p-5 bg-dark-900/40 border border-white/5">
              <h3 className="text-lg font-black text-white">Para unirte, primero iniciá sesión</h3>
              <p className="text-dark-400 mt-2 text-sm">
                No estás autenticado. Ingresá o registrate y vas a volver automáticamente a esta invitación.
              </p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to={`/login?redirect=${encodeURIComponent(`/invite/${league.invite_code}`)}`}
                  className="btn-primary px-5 py-3 rounded-2xl font-black text-center"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to={`/register?redirect=${encodeURIComponent(`/invite/${league.invite_code}`)}`}
                  className="px-5 py-3 rounded-2xl font-black text-center bg-dark-800 hover:bg-dark-700 text-white border border-white/5 transition-colors"
                >
                  Registrarme
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <button
                onClick={handleJoin}
                disabled={joinLeague.isPending}
                className="w-full btn-primary py-4 rounded-2xl text-lg font-black"
              >
                {joinLeague.isPending ? 'Uniéndote...' : 'Unirme a esta liga'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
