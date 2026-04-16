import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLeagues, useCreateLeague, useJoinLeague, useLeaveLeague, useDeleteLeague } from '@/hooks/useLeagues';
import { LeagueCard } from '@/components/LeagueCard';
import { CreateLeagueModal, JoinLeagueModal } from '@/components/Modals';
import { useAuthStore } from '@/store/authStore';
import { Trophy, RefreshCw, LogOut, SoccerBall } from '@/components/Icons';
import { useSyncMatches } from '@/hooks/useMatches';
import toast from 'react-hot-toast';
import type { CreateLeagueInput } from '@/types';

export function DashboardPage() {
  const { myLeagues, isLoading: leaguesLoading } = useLeagues();
  const createLeague = useCreateLeague();
  const joinLeague = useJoinLeague();
  const leaveLeague = useLeaveLeague();
  const deleteLeague = useDeleteLeague();
  const syncMatches = useSyncMatches();
  const user = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncMatches.mutateAsync({});
    } catch (error) {
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  const handleCreateLeague = async (data: CreateLeagueInput) => {
    try {
      await createLeague.mutateAsync(data);
      setShowCreateModal(false);
    } catch (error: any) {
      console.error('League creation error:', error);
      toast.error(error?.message || 'Error al crear la liga');
    }
  };

  const handleJoinLeague = async (code: string) => {
    try {
      await joinLeague.mutateAsync({ invite_code: code });
      setShowJoinModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al unirse a la liga');
    }
  };

  const handleLeaveLeague = async (leagueId: string) => {
    if (window.confirm('¿Estás seguro de salir de esta liga?')) {
      try {
        await leaveLeague.mutateAsync(leagueId);
      } catch {
        toast.error('Error al salir de la liga');
      }
    }
  };

  const handleDeleteLeague = async (leagueId: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta liga? Esta acción no se puede deshacer.')) {
      try {
        await deleteLeague.mutateAsync(leagueId);
      } catch (error) {
        console.error('Delete league error:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-dark-50">
      <header className="sticky top-0 z-30 bg-dark-900 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 items-center">
            <div className="flex items-center justify-start">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-500" />
              </div>
            </div>
            <div className="text-center min-w-0">
              <h1 className="text-lg md:text-xl font-black tracking-tighter bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent truncate">
                PRODE
              </h1>
              <p className="text-[10px] md:text-xs text-dark-400 font-bold uppercase tracking-widest truncate">
                Dashboard
              </p>
            </div>
            <div className="flex items-center justify-end">
              <Link to="/profile" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-secondary-600 flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 md:flex md:items-center md:gap-4 md:overflow-x-auto">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl transition-all font-bold text-sm whitespace-nowrap"
              aria-label="Sincronizar partidos"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              <span className="sm:hidden">{syncing ? 'Sync...' : 'Sync'}</span>
            </button>

            <Link
              to="/leagues"
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-dark-800/40 hover:bg-dark-800/70 text-dark-200 rounded-xl transition-all font-bold text-sm whitespace-nowrap border border-white/5"
            >
              <SoccerBall className="w-4 h-4" />
              <span>Ligas</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-dark-800/40 hover:bg-dark-800/70 text-dark-200 rounded-xl transition-all font-bold text-sm whitespace-nowrap border border-white/5"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12">
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-white mb-2">Mis Ligas</h2>
            <p className="text-dark-400 text-sm md:text-base">Compite con tus amigos y demuestra tu conocimiento futbolístico.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 md:px-6 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-2xl transition-all font-bold border border-white/5 shadow-xl active:scale-95"
            >
              Unirse a Liga
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary px-4 md:px-8 py-3 rounded-2xl text-base md:text-lg active:scale-95"
            >
              + Crear Liga
            </button>
          </div>
        </div>

        {leaguesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card h-48 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : myLeagues.length === 0 ? (
          <div className="glass-card p-16 text-center rounded-[3rem] border-white/5">
            <div className="w-20 h-20 mx-auto mb-6 text-primary-500 flex items-center justify-center opacity-30">
              <Trophy className="w-full h-full" />
            </div>
            <h3 className="text-3xl font-black text-white mb-4">
              ¿Listo para el debut?
            </h3>
            <p className="text-dark-400 max-w-md mx-auto mb-10 text-lg">
              Aún no formas parte de ninguna liga. Crea una para tus amigos o únete a una existente.
            </p>
            <div className="flex gap-4 justify-center relative z-10">
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-8 py-4 bg-dark-800 hover:bg-dark-700 text-white rounded-2xl transition-all font-bold text-lg border border-white/5"
              >
                Unirse a Liga
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary px-8 py-4 rounded-2xl text-lg"
              >
                Crear Liga
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myLeagues.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                onLeave={handleLeaveLeague}
                onDelete={handleDeleteLeague}
              />
            ))}
          </div>
        )}
      </main>

      <CreateLeagueModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateLeague}
        isLoading={createLeague.isPending}
      />

      <JoinLeagueModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSubmit={handleJoinLeague}
        isLoading={joinLeague.isPending}
      />
    </div>
  );
}
