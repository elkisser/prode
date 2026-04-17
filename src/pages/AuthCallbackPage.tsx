import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exchangeError) {
          throw exchangeError;
        }

        const redirect = searchParams.get('redirect');
        const safeRedirect = redirect && redirect.startsWith('/') ? redirect : '/dashboard';
        if (!cancelled) navigate(safeRedirect, { replace: true });
      } catch (e: any) {
        const msg = String(e?.message || 'No se pudo completar el login');
        if (!cancelled) setError(msg);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-dark-950 text-dark-50 flex items-center justify-center p-6">
      <div className="glass-card rounded-[2rem] p-8 border-white/5 w-full max-w-xl text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-black text-white">No se pudo confirmar</h1>
            <p className="text-dark-400 mt-3">{error}</p>
            <div className="mt-6">
              <Link to="/login" className="btn-primary px-6 py-3 rounded-2xl font-black inline-flex">
                Ir al Login
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white">Confirmando...</h1>
            <p className="text-dark-400 mt-3">Estamos validando tu acceso.</p>
          </>
        )}
      </div>
    </div>
  );
}

