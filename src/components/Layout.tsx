import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function AuthLayout() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  const search = new URLSearchParams(location.search);
  const redirect = search.get('redirect');
  const safeRedirect = redirect && redirect.startsWith('/') ? redirect : '/dashboard';

  if (user) {
    return <Navigate to={safeRedirect} replace />;
  }

  return <Outlet />;
}

export function ProtectedLayout() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="text-center animate-bounce">
          <div className="text-6xl mb-4">⚽</div>
          <div className="text-xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
            Cargando PRODE...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
