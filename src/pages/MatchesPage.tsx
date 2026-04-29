import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMatches, useSyncMatches } from '@/hooks/useMatches';
import { MatchCard } from '@/components/MatchCard';
import { SoccerBall, RefreshCw } from '@/components/Icons';
import { useMyPredictionsLite } from '@/hooks/usePredictions';

export function MatchesPage() {
  const { data: matches = [], isLoading, error } = useMatches();
  const syncMatches = useSyncMatches();
  const [syncing, setSyncing] = useState(false);
  const [onlyMyPredictions, setOnlyMyPredictions] = useState(true);
  const { data: myPredictions = [] } = useMyPredictionsLite();

  const predictionByMatchId = useMemo(() => {
    const map = new Map<number, (typeof myPredictions)[number]>();
    for (const p of myPredictions) {
      if (typeof p.match_id === 'number') map.set(p.match_id, p);
    }
    return map;
  }, [myPredictions]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncMatches.mutateAsync({});
    } catch {
    } finally {
      setSyncing(false);
    }
  };

  const filteredMatches = onlyMyPredictions
    ? matches.filter((m) => predictionByMatchId.has(m.id))
    : matches;

  const pendingMatches = filteredMatches.filter((m) => m.status === 'pending');
  const finishedMatches = filteredMatches.filter((m) => m.status === 'finished');

  return (
    <div className="min-h-screen bg-dark-950 text-dark-50">
      <header className="sticky top-0 z-30 bg-dark-900 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="group flex items-center gap-2 text-dark-400 hover:text-white transition-colors font-bold uppercase text-xs tracking-widest">
              <span className="group-hover:-translate-x-1 transition-transform">←</span>
              Dashboard
            </Link>
            <h1 className="text-2xl font-black text-white ml-4">Partidos</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOnlyMyPredictions((v) => !v)}
              className={`px-4 py-3 rounded-xl font-black uppercase tracking-widest text-xs border transition-colors ${
                onlyMyPredictions
                  ? 'bg-primary-500/10 text-primary-300 border-primary-500/20'
                  : 'bg-dark-800/60 text-dark-300 border-white/5 hover:bg-dark-700/70'
              }`}
            >
              {onlyMyPredictions ? 'Mis predicciones' : 'Todos'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-primary px-6 py-3 rounded-xl flex items-center gap-3"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass-card h-40 rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="glass-card p-20 text-center rounded-[3rem] border-white/5">
            <h3 className="text-3xl font-black text-white mb-4">Error al cargar partidos</h3>
            <p className="text-dark-400 mb-10 text-lg max-w-md mx-auto">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-primary px-10 py-4 rounded-2xl text-lg inline-flex items-center gap-3"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar Partidos
            </button>
          </div>
        ) : matches.length === 0 ? (
          <div className="glass-card p-20 text-center rounded-[3rem] border-white/5">
            <div className="w-24 h-24 mx-auto mb-6 text-dark-600 flex items-center justify-center">
              <SoccerBall className="w-20 h-20" />
            </div>
            <h3 className="text-3xl font-black text-white mb-4">
              Estadio vacío
            </h3>
            <p className="text-dark-400 mb-10 text-lg max-w-md mx-auto">
              Sincronizá los partidos desde la API de football para comenzar a competir.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-primary px-10 py-4 rounded-2xl text-lg inline-flex items-center gap-3"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar Partidos
            </button>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="glass-card p-20 text-center rounded-[3rem] border-white/5">
            <h3 className="text-3xl font-black text-white mb-4">Todavía no hiciste predicciones</h3>
            <p className="text-dark-400 mb-10 text-lg max-w-md mx-auto">
              Cambiá a “Todos” para ver los partidos disponibles y hacer tu primera predicción.
            </p>
            <button
              type="button"
              onClick={() => setOnlyMyPredictions(false)}
              className="btn-primary px-10 py-4 rounded-2xl text-lg inline-flex items-center gap-3"
            >
              Ver todos los partidos
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {pendingMatches.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-xs font-black uppercase tracking-widest px-4 py-1.5 bg-accent-500/10 text-accent-500 border border-accent-500/20 rounded-lg">
                    {pendingMatches.length} Pendientes
                  </span>
                  <div className="flex-1 h-px bg-white/5"></div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {pendingMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      predictionOverride={predictionByMatchId.get(match.id) ?? null}
                    />
                  ))}
                </div>
              </section>
            )}

            {finishedMatches.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-xs font-black uppercase tracking-widest px-4 py-1.5 bg-dark-800 text-dark-400 border border-white/5 rounded-lg">
                    {finishedMatches.length} Finalizados
                  </span>
                  <div className="flex-1 h-px bg-white/5"></div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {finishedMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      predictionOverride={predictionByMatchId.get(match.id) ?? null}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
