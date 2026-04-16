import type { LeagueStanding } from '@/types';
import { useAuthStore } from '@/store/authStore';

interface StandingsTableProps {
  standings: LeagueStanding[];
  isLoading?: boolean;
}

export function StandingsTable({ standings, isLoading }: StandingsTableProps) {
  const user = useAuthStore((state) => state.user);

  if (isLoading) {
    return (
      <div className="glass-card rounded-[2rem] p-8 text-center border-white/5">
        <div className="animate-pulse space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-dark-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <div className="glass-card rounded-[2rem] p-10 md:p-16 text-center border-white/5">
        <div className="text-5xl md:text-6xl mb-4 grayscale">📊</div>
        <h3 className="text-xl font-black text-white mb-2">Sin posiciones</h3>
        <p className="text-dark-400">Las estadísticas aparecerán cuando se jueguen partidos.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-[2rem] overflow-hidden border-white/5 shadow-2xl">
      <div className="bg-dark-900/80 p-4 md:p-6 border-b border-white/5 hidden md:block">
        <div className="grid grid-cols-12 gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-500">
          <div className="col-span-1">#</div>
          <div className="col-span-7">Jugador</div>
          <div className="col-span-4 text-right">Puntuación</div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {standings.map((standing) => (
          <div
            key={standing.user_id}
            className={`flex md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 md:p-6 items-center transition-colors hover:bg-white/[0.02] ${
              standing.user_id === user?.id ? 'bg-primary-500/5' : ''
            }`}
          >
            <div className="md:col-span-1 shrink-0">
              <span
                className={`inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl text-base md:text-lg font-black ${
                  standing.position === 1
                    ? 'bg-accent-500/20 text-accent-500 border border-accent-500/30 shadow-lg shadow-accent-900/20'
                    : standing.position === 2
                    ? 'bg-dark-200/20 text-dark-300 border border-dark-400/30'
                    : standing.position === 3
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'bg-dark-800 text-dark-400 border border-white/5'
                }`}
              >
                {standing.position}
              </span>
            </div>
            <div className="md:col-span-7 flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <div className="relative">
                {standing.avatar_url ? (
                  <img
                    src={standing.avatar_url}
                    alt=""
                    className="w-10 h-10 md:w-12 md:h-12 rounded-2xl object-cover border-2 border-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-tr from-dark-800 to-dark-700 flex items-center justify-center text-lg md:text-xl font-black text-white border border-white/5">
                    {standing.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {standing.position === 1 && (
                  <div className="absolute -top-2 -right-2 text-lg">👑</div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-black text-white text-base md:text-lg leading-none mb-1 truncate">{standing.username}</span>
                {standing.user_id === user?.id && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-md w-fit">
                    Tú
                  </span>
                )}
              </div>
            </div>
            <div className="md:col-span-4 text-right shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-2xl md:text-3xl font-black text-white leading-none">
                  {standing.total_points}
                </span>
                <span className="text-[10px] font-black uppercase tracking-tighter text-dark-500 hidden md:inline">
                  Puntos Totales
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
