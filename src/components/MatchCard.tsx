import { useEffect, useState } from 'react';
import type { Match } from '@/types';
import { useMatchPrediction, useCreatePrediction } from '@/hooks/usePredictions';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface MatchCardProps {
  match: Match;
  showPrediction?: boolean;
  scoringMode?: 'simple' | 'exact';
}

function getWinnerFromScores(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home === away) return 'draw';
  return home > away ? 'home' : 'away';
}

function getWinnerLabel(winner: 'home' | 'draw' | 'away', match: Match) {
  if (winner === 'home') return `Gana ${match.home_team}`;
  if (winner === 'away') return `Gana ${match.away_team}`;
  return 'Empate';
}

function cleanUrl(url?: string | null) {
  if (!url) return null;
  return String(url).trim().replace(/`/g, '').trim();
}

export function MatchCard({ match, showPrediction = true, scoringMode = 'exact' }: MatchCardProps) {
  const { data: prediction } = useMatchPrediction(match.id);
  const createPrediction = useCreatePrediction();
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const canPredict = match.home_score === null && match.away_score === null && match.status !== 'finished';
  const predictedWinner =
    prediction && typeof prediction.home_score === 'number' && typeof prediction.away_score === 'number'
      ? getWinnerFromScores(prediction.home_score, prediction.away_score)
      : null;
  const [winner, setWinner] = useState<'home' | 'draw' | 'away'>(predictedWinner || 'home');

  useEffect(() => {
    if (!prediction) return;
    setHomeScore(String(prediction.home_score));
    setAwayScore(String(prediction.away_score));
    if (typeof prediction.home_score === 'number' && typeof prediction.away_score === 'number') {
      setWinner(getWinnerFromScores(prediction.home_score, prediction.away_score));
    }
  }, [prediction]);

  const handleSavePrediction = async () => {
    let home: number;
    let away: number;

    if (scoringMode === 'simple') {
      if (winner === 'draw') {
        home = 9;
        away = 9;
      } else if (winner === 'home') {
        home = 9;
        away = 0;
      } else {
        home = 0;
        away = 9;
      }
    } else {
      home = parseInt(String(homeScore));
      away = parseInt(String(awayScore));

      if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
        toast.error('Ingresa resultados válidos');
        return;
      }
    }

    try {
      await createPrediction.mutateAsync({
        match_id: match.id,
        home_score: home,
        away_score: away,
      });
      setIsEditing(false);
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="glass-card rounded-[2rem] p-5 md:p-6 border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500/60 to-secondary-500/60 opacity-40 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border ${
              match.status === 'finished'
                ? 'bg-primary-500/10 text-primary-300 border-primary-500/20'
                : 'bg-accent-500/10 text-accent-400 border-accent-500/20'
            }`}
          >
            {match.status === 'finished' ? 'Finalizado' : 'Próximo'}
          </span>
          <time className="text-[10px] text-dark-500 font-bold truncate" dateTime={String(match.match_date)}>
            {formatDateTime(String(match.match_date))}
          </time>
        </div>
        {match.competition?.logo_url ? (
          <img
            src={cleanUrl(match.competition.logo_url) || undefined}
            alt=""
            className="w-6 h-6 object-contain opacity-80"
            loading="lazy"
          />
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-dark-800/50 rounded-2xl p-2 border border-white/5">
            {match.home_logo ? (
              <img src={cleanUrl(match.home_logo) || undefined} alt="" className="w-full h-full object-contain" />
            ) : null}
          </div>
          <div className="min-w-0 hidden md:block">
            <div className="text-[11px] font-black uppercase tracking-widest text-dark-500">Local</div>
            <div className="font-black text-white text-sm md:text-base truncate">{match.home_team}</div>
          </div>
          <span className="sr-only">{match.home_team}</span>
        </div>

        <div className="shrink-0">
          {match.status === 'finished' ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-dark-900/40 border border-white/5">
              <span className="text-3xl md:text-4xl font-black text-white">{match.home_score}</span>
              <span className="text-dark-600 font-black text-2xl">:</span>
              <span className="text-3xl md:text-4xl font-black text-white">{match.away_score}</span>
            </div>
          ) : prediction && !isEditing ? (
            scoringMode === 'simple' ? (
              <div className="px-4 py-3 rounded-2xl bg-primary-500/10 border border-primary-500/20">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary-500/60 text-center">
                  Tu Pronóstico
                </div>
                <div className="text-sm font-black text-primary-200 text-center">
                  {getWinnerLabel(getWinnerFromScores(prediction.home_score, prediction.away_score), match)}
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 rounded-2xl bg-primary-500/10 border border-primary-500/20">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary-500/60 text-center">
                  Tu Predicción
                </div>
                <div className="text-sm font-black text-primary-200 text-center">
                  {prediction.home_score} - {prediction.away_score}
                </div>
              </div>
            )
          ) : (
            <div className="px-4 py-3 rounded-2xl bg-dark-900/30 border border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-dark-600 text-center">
                Pronóstico
              </div>
              <div className="text-sm font-black text-dark-400 text-center">—</div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 min-w-0 justify-end">
          <div className="min-w-0 text-right hidden md:block">
            <div className="text-[11px] font-black uppercase tracking-widest text-dark-500">Visitante</div>
            <div className="font-black text-white text-sm md:text-base truncate">{match.away_team}</div>
          </div>
          <div className="w-12 h-12 md:w-14 md:h-14 bg-dark-800/50 rounded-2xl p-2 border border-white/5">
            {match.away_logo ? (
              <img src={cleanUrl(match.away_logo) || undefined} alt="" className="w-full h-full object-contain" />
            ) : null}
          </div>
          <span className="sr-only">{match.away_team}</span>
        </div>
      </div>

      {match.status !== 'finished' && isEditing ? (
        <div className="mt-6">
          {scoringMode === 'simple' ? (
            <div className="grid grid-cols-3 gap-2">
              {(['home', 'draw', 'away'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWinner(w)}
                  className={`px-3 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${
                    winner === w
                      ? 'bg-primary-500/15 border-primary-500/40 text-primary-200'
                      : 'bg-dark-800/40 border-white/5 text-dark-300 hover:bg-dark-800/70'
                  }`}
                >
                  {w === 'home' ? 'Local' : w === 'away' ? 'Visitante' : 'Empate'}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                className="w-16 h-14 text-center text-2xl font-black glass-input rounded-2xl"
                placeholder="0"
              />
              <span className="text-dark-600 font-black text-xl">-</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                className="w-16 h-14 text-center text-2xl font-black glass-input rounded-2xl"
                placeholder="0"
              />
            </div>
          )}
        </div>
      ) : null}

      {showPrediction && canPredict && (
        <div className="mt-8 flex justify-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 bg-dark-800 hover:bg-dark-700 text-white rounded-xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePrediction}
                disabled={createPrediction.isPending}
                className="btn-primary px-8 py-2.5 rounded-xl"
              >
                Confirmar
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className={`${prediction ? 'bg-dark-800 hover:bg-dark-700 text-dark-300' : 'btn-secondary'} px-8 py-3 rounded-xl font-black transition-all active:scale-95`}
            >
              {prediction ? 'Cambiar Pronóstico' : 'Hacer Predicción'}
            </button>
          )}
        </div>
      )}

      {match.status === 'finished' && prediction && (
        <div className="mt-6 flex justify-center">
          <div className={`px-6 py-2 rounded-2xl border flex items-center gap-3 ${
            prediction.points > 0 
            ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <span className="text-xs font-black uppercase tracking-widest">Resultado:</span>
            <span className="text-xl font-black">{prediction.points} PTS</span>
          </div>
        </div>
      )}
    </div>
  );
}
