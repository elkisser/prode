import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const redirectSuffix = redirect && redirect.startsWith('/') ? `?redirect=${encodeURIComponent(redirect)}` : '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((state) => state.signIn);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('¡Bienvenido de vuelta!');
    } catch (error) {
      toast.error('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-600/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 prode-float"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-600/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 prode-float"></div>

      <div className="glass-card p-10 w-full max-w-md relative z-10 rounded-3xl border-white/5 prode-fade-up">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent mb-2">
            PRODE
          </h1>
          <p className="text-dark-400 font-medium">Predice, gana y demuestra quién manda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-dark-300 mb-2 px-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 glass-input rounded-2xl text-dark-50 placeholder:text-dark-600"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark-300 mb-2 px-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 glass-input rounded-2xl text-dark-50 placeholder:text-dark-600"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-4 text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Iniciando...
              </span>
            ) : (
              'Entrar al Estadio'
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-dark-400 font-medium">
          ¿Aún no tienes equipo?{' '}
          <Link to={`/register${redirectSuffix}`} className="text-primary-400 font-bold hover:text-primary-300 transition-colors">
            Ficha aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
