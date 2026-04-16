import { Link } from 'react-router-dom';
import { useLeagues, useLeagueStandings } from '@/hooks/useLeagues';
import { useAuthStore } from '@/store/authStore';
import { Trophy, ChevronLeft } from '@/components/Icons';
import type { League } from '@/types';

function LeagueSummaryCard({ league }: { league: League }) {
  const user = useAuthStore((state) => state.user);
  const { data: standings = [], isLoading } = useLeagueStandings(league.id);

  const me = standings.find((s) => s.user_id === user?.id);
  const position = me?.position ?? null;
  const points = me?.total_points ?? 0;
  const members = standings.length;

  return (
    <div className="glass-card rounded-[2rem] p-5 md:p-6 border-white/5 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500/50 to-secondary-500/50" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-black bg-dark-800/40 border border-white/5 text-dark-200">
              {league.scoring_mode === 'simple' ? 'Simple' : 'Exacto'}
            </span>
            <span className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-black bg-primary-500/10 border border-primary-500/20 text-primary-300 truncate">
              {league.competition_name}
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white truncate">{league.name}</h3>
          <p className="text-xs text-dark-500 font-bold uppercase tracking-widest mt-1">
            {members} miembro{members === 1 ? '' : 's'}
          </p>
        </div>

        <Link
          to={`/league/${league.id}`}
          className="btn-primary px-5 py-2.5 rounded-2xl font-black whitespace-nowrap"
        >
          Abrir
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 bg-dark-900/40 border border-white/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-dark-500">Tus puntos</div>
          <div className="text-3xl font-black text-white mt-1">{points}</div>
        </div>

        <div className="rounded-2xl p-4 bg-dark-900/40 border border-white/5">
          <div className="text-[10px] font-black uppercase tracking-widest text-dark-500">Tu puesto</div>
          <div className="text-3xl font-black text-white mt-1">
            {isLoading ? '—' : position ? `${position}°` : '—'}
          </div>
        </div>
      </div>

      {position === 1 ? (
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent-500/10 border border-accent-500/20 text-accent-400 font-black text-xs uppercase tracking-widest">
          Vas 1°
        </div>
      ) : null}
    </div>
  );
}

export function LeaguesPage() {
  const { myLeagues, isLoading } = useLeagues();

  return (
    <div className="min-h-screen bg-dark-950 text-dark-50">
      <header className="sticky top-0 z-30 bg-dark-900 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/dashboard"
                className="w-10 h-10 rounded-2xl bg-dark-800/50 border border-white/5 flex items-center justify-center text-dark-200 hover:text-white hover:bg-dark-800/80 transition-colors shrink-0"
                aria-label="Volver"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-primary-500" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-black text-white truncate">Ligas</h1>
                <p className="text-[10px] md:text-xs text-dark-400 font-bold uppercase tracking-widest truncate">
                  Resumen de tu progreso
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card h-56 rounded-[2rem] animate-pulse border-white/5" />
            ))}
          </div>
        ) : myLeagues.length === 0 ? (
          <div className="glass-card p-10 md:p-16 text-center rounded-[3rem] border-white/5">
            <div className="w-20 h-20 mx-auto mb-6 text-primary-500 flex items-center justify-center opacity-30">
              <Trophy className="w-full h-full" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3">Todavía no estás en ligas</h3>
            <p className="text-dark-400 max-w-md mx-auto">
              Volvé al Dashboard para crear una liga o unirte con un código.
            </p>
            <div className="mt-8">
              <Link to="/dashboard" className="btn-primary px-8 py-3 rounded-2xl font-black inline-flex">
                Ir al Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {myLeagues.map((league) => (
              <LeagueSummaryCard key={league.id} league={league} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
