import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, SUPABASE_TABLES } from '@/lib/supabase';
import { useLeagueStandings } from '@/hooks/useLeagues';
import { useMatches, useSyncMatches } from '@/hooks/useMatches';
import { MatchCard } from '@/components/MatchCard';
import { StandingsTable } from '@/components/StandingsTable';
import { ChevronLeft, Share2 } from '@/components/Icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [activeTab, setActiveTab] = useState<'standings' | 'matches'>('standings');
  const [finishedPage, setFinishedPage] = useState(0);
  const [finishedPageSize, setFinishedPageSize] = useState(3);
  const finishedTrackRef = useRef<HTMLDivElement | null>(null);

  const { data: league, isLoading: leagueLoading } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      const { data } = await supabase
        .from(SUPABASE_TABLES.LEAGUES)
        .select('*, creator:profiles!created_by(*)')
        .eq('id', leagueId)
        .single();
      return data;
    },
    enabled: !!leagueId,
  });

  const { data: standings = [], isLoading: standingsLoading } = useLeagueStandings(leagueId || '');
  const syncMatches = useSyncMatches();
  const { data: matches = [], isLoading: matchesLoading, error: matchesError } = useMatches(
    league?.competition_id ? String(league.competition_id) : undefined
  );

  const scoringMode = (league?.scoring_mode as 'simple' | 'exact') || 'exact';

  const live = useMemo(() => {
    return matches
      .filter((m) => m.status === 'in_progress')
      .slice()
      .sort((a, b) => String(a.match_date).localeCompare(String(b.match_date)));
  }, [matches]);

  const upcoming = useMemo(() => {
    return matches
      .filter((m) => m.status === 'pending' && m.home_score === null && m.away_score === null)
      .slice()
      .sort((a, b) => String(a.match_date).localeCompare(String(b.match_date)));
  }, [matches]);

  const finished = useMemo(() => {
    return matches
      .filter(
        (m) =>
          m.status === 'finished' ||
          m.status === 'cancelled' ||
          ((m.home_score !== null || m.away_score !== null) && m.status !== 'in_progress')
      )
      .slice()
      .sort((a, b) => String(b.match_date).localeCompare(String(a.match_date)));
  }, [matches]);

  const finishedPages = useMemo(() => {
    const size = Math.max(1, finishedPageSize);
    const out: typeof finished[] = [];
    for (let i = 0; i < finished.length; i += size) out.push(finished.slice(i, i + size));
    return out;
  }, [finished, finishedPageSize]);

  const pageCount = finishedPages.length;
  const canSlide = pageCount > 1;
  const safePage = pageCount > 0 ? ((finishedPage % pageCount) + pageCount) % pageCount : 0;

  const prevFinished = useCallback(() => {
    if (!canSlide) return;
    setFinishedPage((v) => v - 1);
  }, [canSlide]);

  const nextFinished = useCallback(() => {
    if (!canSlide) return;
    setFinishedPage((v) => v + 1);
  }, [canSlide]);

  useEffect(() => {
    if (!league?.competition_id) return;
    syncMatches.mutate({ competitionId: String(league.competition_id), silent: true });
  }, [league?.competition_id]);

  useEffect(() => {
    if (activeTab !== 'matches') return;
    if (!league?.competition_id) return;

    const competitionId = String(league.competition_id);
    const intervalMs = live.length > 0 ? 60_000 : 300_000;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      if (syncMatches.isPending) return;
      syncMatches.mutate({ competitionId, silent: true });
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [activeTab, league?.competition_id, live.length, syncMatches.isPending]);

  useEffect(() => {
    if (activeTab !== 'matches') return;
    setFinishedPage(0);
  }, [activeTab, league?.competition_id]);

  useEffect(() => {
    if (activeTab !== 'matches') return;
    if (!canSlide) return;
    const id = window.setInterval(() => {
      setFinishedPage((v) => v + 1);
    }, 4500);
    return () => window.clearInterval(id);
  }, [activeTab, canSlide]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setFinishedPageSize(mq.matches ? 3 : 1);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const el = finishedTrackRef.current;
    if (!el) return;
    el.style.transform = `translate3d(-${safePage * 100}%, 0, 0)`;
  }, [safePage]);

  const inviteUrl = league?.invite_code ? `${window.location.origin}/invite/${league.invite_code}` : '';

  const handleCopyInviteLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  }, [inviteUrl]);

  const handleShareInviteLink = useCallback(async () => {
    if (!inviteUrl) return;
    const canShare = typeof (navigator as any)?.share === 'function';
    if (!canShare) {
      await handleCopyInviteLink();
      return;
    }
    try {
      await (navigator as any).share({
        title: league?.name ? `Invitación a ${league.name}` : 'Invitación a liga',
        url: inviteUrl,
      });
    } catch {
      // usuario canceló o share falló; no hacer toast de error
    }
  }, [inviteUrl, league?.name, handleCopyInviteLink]);

  if (!leagueId) {
    return <div className="p-8 text-center">Liga no encontrada</div>;
  }

  return (
    <div className="min-h-screen bg-dark-950 text-dark-50">
      <header className="sticky top-0 z-30 bg-dark-900 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="md:hidden">
            <div className="grid grid-cols-3 items-center gap-3">
              <div className="flex items-center justify-start">
                <Link
                  to="/dashboard"
                  className="w-10 h-10 rounded-2xl bg-dark-800/50 border border-white/5 flex items-center justify-center text-dark-200 hover:text-white hover:bg-dark-800/80 transition-colors"
                  aria-label="Volver al Dashboard"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
              </div>
              <div className="text-center min-w-0">
                <span
                  className={`inline-flex text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-black border ${
                    league?.scoring_mode === 'simple'
                      ? 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                      : 'bg-secondary-500/10 text-secondary-400 border-secondary-500/20'
                  }`}
                >
                  {league?.scoring_mode === 'simple' ? 'Simple' : 'Experto'}
                </span>
                <h1 className="text-lg font-black text-white leading-tight truncate mt-2">
                  {leagueLoading ? 'Cargando…' : league?.name}
                </h1>
              </div>
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-dark-800/50 border border-white/5">
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="text-xs font-black text-primary-400 tracking-widest uppercase"
                    aria-label="Copiar código"
                  >
                    {league?.invite_code}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareInviteLink}
                    className="text-dark-300 hover:text-white transition-colors"
                    aria-label="Compartir o copiar link de invitación"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex p-1 bg-dark-900/80 rounded-2xl border border-white/5 shadow-2xl w-full">
              <button
                onClick={() => setActiveTab('standings')}
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-all ${
                  activeTab === 'standings'
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                Posiciones
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-all ${
                  activeTab === 'matches'
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                Partidos
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center gap-4 mb-4 md:mb-6">
              <Link
                to="/dashboard"
                className="flex items-center gap-3 text-dark-300 hover:text-white transition-colors font-black uppercase text-xs tracking-widest"
              >
                <span className="w-10 h-10 rounded-2xl bg-dark-800/50 border border-white/5 flex items-center justify-center">
                  <ChevronLeft className="w-5 h-5" />
                </span>
                Dashboard
              </Link>
            </div>
          </div>

          <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
            <div>
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <span
                  className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-black ${
                    league?.scoring_mode === 'simple'
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'bg-secondary-500/10 text-secondary-400 border border-secondary-500/20'
                  }`}
                >
                  {league?.scoring_mode === 'simple' ? 'Modo Simple' : 'Modo Experto'}
                </span>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-dark-800/50 border border-white/5">
                  <span className="text-[10px] text-dark-400 font-bold uppercase tracking-tighter">Código:</span>
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="text-xs md:text-sm font-black text-primary-400 tracking-widest uppercase"
                    aria-label="Copiar código"
                  >
                    {league?.invite_code}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareInviteLink}
                    className="text-dark-300 hover:text-white transition-colors"
                    aria-label="Compartir o copiar link de invitación"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
                {leagueLoading ? (
                  <div className="h-10 md:h-12 w-56 md:w-64 bg-dark-800 animate-pulse rounded-2xl" />
                ) : league?.name}
              </h1>
            </div>
            
            <div className="flex p-1 bg-dark-900/80 rounded-2xl border border-white/5 shadow-2xl w-full md:w-auto">
              <button
                onClick={() => setActiveTab('standings')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'standings'
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                Posiciones
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'matches'
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                Partidos
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'standings' ? (
            <StandingsTable standings={standings} isLoading={standingsLoading} />
          ) : (
            <div className="grid grid-cols-1 gap-10 max-w-4xl mx-auto">
              {matchesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card h-40 rounded-[2rem] animate-pulse" />
                ))
              ) : matchesError ? (
                <div className="glass-card p-16 text-center rounded-[3rem] border-white/5">
                  <h3 className="text-2xl font-black text-white mb-2">Error al cargar partidos</h3>
                  <p className="text-dark-400">{matchesError instanceof Error ? matchesError.message : 'Error desconocido'}</p>
                </div>
              ) : matches.length === 0 ? (
                <div className="glass-card p-16 text-center rounded-[3rem] border-white/5">
                  <div className="text-7xl mb-6 grayscale">⚽</div>
                  <h3 className="text-2xl font-black text-white mb-2">No hay partidos</h3>
                  <p className="text-dark-400">Los encuentros aparecerán aquí pronto.</p>
                </div>
              ) : (
                <>
                  {live.length > 0 ? (
                    <section className="space-y-5">
                      <div className="glass-card rounded-[2.5rem] p-6 border-white/5 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500/70 to-red-400/30" />
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <h2 className="text-xl font-black text-white">En vivo</h2>
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-widest shadow-[0_0_0_1px_rgba(239,68,68,0.06),0_0_32px_rgba(239,68,68,0.15)]">
                                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                LIVE
                              </span>
                            </div>
                            <p className="text-xs text-dark-500 font-bold uppercase tracking-widest mt-1">
                              {live.length} partido{live.length === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {live.map((match) => (
                        <MatchCard key={match.id} match={match} scoringMode={scoringMode} showPrediction={false} />
                      ))}
                    </section>
                  ) : null}

                  {finished.length > 0 ? (
                    <section className="space-y-5">
                      <div className="glass-card rounded-[2.5rem] p-6 border-white/5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-black text-white">Finalizados</h2>
                            <p className="text-xs text-dark-500 font-bold uppercase tracking-widest mt-1">
                              {finished.length} partido{finished.length === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={prevFinished}
                              disabled={!canSlide}
                              className="w-10 h-10 rounded-xl bg-dark-800/60 hover:bg-dark-700/70 disabled:opacity-40 disabled:hover:bg-dark-800/60 text-white font-black border border-white/5"
                            >
                              ‹
                            </button>
                            <button
                              onClick={nextFinished}
                              disabled={!canSlide}
                              className="w-10 h-10 rounded-xl bg-dark-800/60 hover:bg-dark-700/70 disabled:opacity-40 disabled:hover:bg-dark-800/60 text-white font-black border border-white/5"
                            >
                              ›
                            </button>
                          </div>
                        </div>
                        {canSlide ? (
                          <div className="mt-4 flex items-center justify-between gap-4">
                            <div className="hidden md:flex items-center gap-1.5">
                              {(pageCount <= 10 ? Array.from({ length: pageCount }) : Array.from({ length: 8 })).map((_, i) => {
                                const target = pageCount <= 10 ? i : Math.round((i / 7) * (pageCount - 1));
                                const active = target === safePage;
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setFinishedPage(target)}
                                    className={`h-1.5 rounded-full transition-all ${
                                      active ? 'w-8 bg-primary-400' : 'w-3 bg-dark-700 hover:bg-dark-600'
                                    }`}
                                  />
                                );
                              })}
                            </div>

                            <div className="md:hidden flex-1">
                              <div className="h-2 rounded-full bg-dark-800/60 border border-white/5 overflow-hidden">
                                <div
                                  className="h-full bg-primary-400 transition-[width] duration-500 ease-out"
                                  style={{ width: `${Math.round(((safePage + 1) / pageCount) * 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="text-[10px] text-dark-500 font-bold uppercase tracking-widest shrink-0 tabular-nums">
                              {safePage + 1}/{pageCount}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="relative overflow-hidden">
                        <div
                          ref={finishedTrackRef}
                          className="flex w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                          style={{ transform: 'translate3d(0,0,0)' }}
                        >
                          {finishedPages.map((page, idx) => (
                            <div key={idx} className="w-full shrink-0">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {page.map((m) => (
                                  <div
                                    key={m.id}
                                    className="glass-card rounded-[2.25rem] p-5 border-white/5 overflow-hidden relative"
                                  >
                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500/40 to-secondary-500/40" />
                                    <div className="flex items-center justify-between mb-4 pt-1">
                                      <span
                                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${
                                          m.status === 'cancelled'
                                            ? 'bg-dark-800/40 text-dark-300 border-white/5'
                                            : 'bg-primary-500/10 text-primary-300 border-primary-500/20'
                                        }`}
                                      >
                                        {m.status === 'cancelled' ? 'Cancelado' : 'Finalizado'}
                                      </span>
                                      <time className="text-[10px] text-dark-500 font-bold" dateTime={String(m.match_date)}>
                                        {String(m.match_date).slice(0, 10)}
                                      </time>
                                    </div>
                                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        {m.home_logo ? (
                                          <img
                                            src={String(m.home_logo).trim().replace(/`/g, '')}
                                            alt=""
                                            className="w-10 h-10 object-contain"
                                          />
                                        ) : null}
                                        <span className="sr-only">{m.home_team}</span>
                                      </div>

                                      <div className="flex justify-center">
                                        <div className="px-4 py-3 rounded-2xl bg-dark-900/40 border border-white/5 text-center min-w-[92px]">
                                          <div className="text-[10px] font-black uppercase tracking-widest text-dark-600">
                                            Resultado
                                          </div>
                                          <div className="mt-1 flex items-center justify-center gap-2">
                                            <span className="text-3xl font-black text-white">
                                              {m.home_score ?? '—'}
                                            </span>
                                            <span className="text-dark-600 font-black text-2xl">:</span>
                                            <span className="text-3xl font-black text-white">
                                              {m.away_score ?? '—'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 min-w-0 justify-end">
                                        {m.away_logo ? (
                                          <img
                                            src={String(m.away_logo).trim().replace(/`/g, '')}
                                            alt=""
                                            className="w-10 h-10 object-contain"
                                          />
                                        ) : null}
                                        <span className="sr-only">{m.away_team}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <section className="space-y-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-white">Próximos</h2>
                        <p className="text-xs text-dark-500 font-bold uppercase tracking-widest mt-1">
                          {upcoming.length} partido{upcoming.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    {upcoming.length === 0 ? (
                      <div className="glass-card p-10 text-center rounded-[2.5rem] border-white/5">
                        <h3 className="text-lg font-black text-white mb-1">No hay próximos partidos</h3>
                        <p className="text-dark-400 text-sm">
                          Todavía no hay fixtures cargados para esta competencia en el proveedor de datos.
                        </p>
                      </div>
                    ) : (
                      upcoming.map((match) => <MatchCard key={match.id} match={match} scoringMode={scoringMode} />)
                    )}
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
