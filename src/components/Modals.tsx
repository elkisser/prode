import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ScoreMode } from '@/types';
import { SUPPORTED_LEAGUES } from '@/lib/api/football';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface CreateLeagueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    scoring_mode: ScoreMode;
    competition_id: string;
    competition_name: string;
  }) => void;
  isLoading?: boolean;
}

export function CreateLeagueModal({ isOpen, onClose, onSubmit, isLoading }: CreateLeagueModalProps) {
  const [name, setName] = useState('');
  const [scoreMode, setScoreMode] = useState<ScoreMode>('simple');
  const [selectedCompetition, setSelectedCompetition] = useState<{ id: string; name: string; logo_url?: string | null } | null>(null);

  const { data: leaguesWithLogos } = useQuery({
    queryKey: ['supportedLeaguesWithLogos', 'v2'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-fixtures', {
        body: { action: 'supported_leagues' },
      });
      if (error) throw error;
      return (data as any)?.leagues as Array<{ id: string; name: string; logo_url: string | null }>;
    },
    enabled: isOpen,
    staleTime: 0,
    refetchOnMount: true,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }
    if (!selectedCompetition) {
      toast.error('Selecciona una competencia');
      return;
    }
    onSubmit({
      name,
      scoring_mode: scoreMode,
      competition_id: selectedCompetition.id,
      competition_name: selectedCompetition.name,
    });
    setName('');
    setScoreMode('simple');
    setSelectedCompetition(null);
  };

  return (
    <div className="fixed inset-0 bg-dark-950/90 flex items-center justify-center p-4 z-50">
      <div className="glass-card p-8 w-full max-w-lg rounded-[2.5rem] border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300">
        <h2 className="text-3xl font-black text-white mb-8">Nueva Liga</h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-bold text-dark-300 mb-3 px-1">
              Nombre de la Liga
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 glass-input rounded-2xl text-white placeholder:text-dark-600"
              placeholder="Ej: Los Galácticos"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-dark-300 mb-3 px-1">
              Competencia
            </label>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
              {(leaguesWithLogos || SUPPORTED_LEAGUES).map((comp) => (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => setSelectedCompetition(comp)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedCompetition?.id === comp.id
                      ? 'bg-primary-500/10 border-primary-500'
                      : 'bg-dark-800/40 border-transparent hover:border-white/10'
                  }`}
                >
                  {'logo_url' in comp && comp.logo_url ? (
                    <img
                      src={comp.logo_url as string}
                      alt=""
                      className="w-8 h-8 object-contain mb-2"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="font-bold text-white text-sm leading-tight block">
                    {comp.name}
                  </span>
                </button>
              ))}
            </div>
            {selectedCompetition && (
              <p className="text-xs text-primary-400 mt-2 px-1">
                ✓ {selectedCompetition.name} seleccionada
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-dark-300 mb-4 px-1">
              Modo de Puntuación
            </label>
            <div className="space-y-4">
              <label className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer transition-all border-2 ${
                scoreMode === 'simple'
                ? 'bg-primary-500/10 border-primary-500/50'
                : 'bg-dark-800/40 border-transparent hover:border-white/10'
              }`}>
                <input
                  type="radio"
                  name="scoreMode"
                  value="simple"
                  checked={scoreMode === 'simple'}
                  onChange={() => setScoreMode('simple')}
                  className="mt-1.5 accent-primary-500"
                />
                <div>
                  <span className="font-bold text-white text-lg">Modo Simple</span>
                  <p className="text-sm text-dark-400 mt-1">
                    Acierto de ganador: <strong className="text-primary-400">+3 pts</strong>
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer transition-all border-2 ${
                scoreMode === 'exact'
                ? 'bg-secondary-500/10 border-secondary-500/50'
                : 'bg-dark-800/40 border-transparent hover:border-white/10'
              }`}>
                <input
                  type="radio"
                  name="scoreMode"
                  value="exact"
                  checked={scoreMode === 'exact'}
                  onChange={() => setScoreMode('exact')}
                  className="mt-1.5 accent-secondary-500"
                />
                <div>
                  <span className="font-bold text-white text-lg">Modo Experto</span>
                  <p className="text-sm text-dark-400 mt-1">
                    Exacto: <strong className="text-secondary-400">+5 pts</strong> | Ganador: <strong className="text-secondary-400">+3 pts</strong>
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 bg-dark-800 hover:bg-dark-700 text-white rounded-2xl transition-all font-bold border border-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedCompetition}
              className="flex-1 btn-primary py-4 rounded-2xl text-lg"
            >
              {isLoading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface JoinLeagueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  isLoading?: boolean;
}

export function JoinLeagueModal({ isOpen, onClose, onSubmit, isLoading }: JoinLeagueModalProps) {
  const [code, setCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error('El código debe tener 6 caracteres');
      return;
    }
    onSubmit(code.toUpperCase());
    setCode('');
  };

  return (
    <div className="fixed inset-0 bg-dark-950/90 flex items-center justify-center p-4 z-50">
      <div className="glass-card p-8 w-full max-w-md rounded-[2.5rem] border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300">
        <h2 className="text-3xl font-black text-white mb-8">Unirse a Liga</h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-bold text-dark-300 mb-3 px-1">
              Código de Invitación
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-5 py-6 glass-input rounded-2xl text-white placeholder:text-dark-600 text-center text-4xl font-black tracking-[0.5em] focus:tracking-[0.6em] transition-all"
              placeholder="ABC123"
              maxLength={6}
              required
            />
            <p className="text-center text-dark-500 text-xs mt-4 uppercase tracking-widest font-bold">Pide el código a tu administrador</p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 bg-dark-800 hover:bg-dark-700 text-white rounded-2xl transition-all font-bold border border-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 btn-secondary py-4 rounded-2xl text-lg"
            >
              {isLoading ? 'Uniéndose...' : 'Unirse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
