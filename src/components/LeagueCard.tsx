import { Link } from 'react-router-dom';
import type { League } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Trophy, Copy, Trash2, LogIn } from './Icons';

interface LeagueCardProps {
  league: League;
  onLeave?: (leagueId: string) => void;
  onDelete?: (leagueId: string) => void;
}

export function LeagueCard({ league, onLeave, onDelete }: LeagueCardProps) {
  const user = useAuthStore((state) => state.user);
  const isCreator = league.created_by === user?.id;

  return (
    <div className="glass-card p-6 rounded-[2rem] hover:border-primary-500/30 transition-all duration-300 group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Trophy className="w-10 h-10 text-primary-500" />
      </div>

      <div className="flex flex-col h-full">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black ${
                league.scoring_mode === 'simple'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'bg-secondary-500/10 text-secondary-400 border border-secondary-500/20'
              }`}
            >
              {league.scoring_mode === 'simple' ? 'Simple' : 'Exacto'}
            </span>
            {isCreator && (
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black bg-accent-500/10 text-accent-500 border border-accent-500/20">
                Creador
              </span>
            )}
          </div>
          <h3 className="text-2xl font-black text-white group-hover:text-primary-400 transition-colors leading-tight">
            {league.name}
          </h3>
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-2xl border border-white/5">
            <div className="flex flex-col">
              <span className="text-[10px] text-dark-400 uppercase font-bold tracking-tighter">Código</span>
              <code className="text-lg font-black text-primary-400 tracking-widest">{league.invite_code}</code>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(league.invite_code);
              }}
              className="p-2 hover:bg-dark-700 rounded-xl transition-colors text-dark-300 hover:text-white"
              title="Copiar código"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <Link
              to={`/league/${league.id}`}
              className="flex-[2] btn-primary py-3 rounded-2xl text-center flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </Link>
            {isCreator && onDelete ? (
              <button
                onClick={() => onDelete(league.id)}
                className="flex-1 px-4 py-3 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-2xl transition-all font-bold text-sm border border-red-900/30 flex items-center justify-center gap-2"
                title="Eliminar liga"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : !isCreator && onLeave ? (
              <button
                onClick={() => onLeave(league.id)}
                className="flex-1 px-4 py-3 bg-dark-800 hover:bg-red-900/20 text-dark-400 hover:text-red-400 rounded-2xl transition-all font-bold text-sm border border-white/5"
              >
                Salir
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}