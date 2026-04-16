import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { AuthLayout, ProtectedLayout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LeaguePage } from '@/pages/LeaguePage';
import { MatchesPage } from '@/pages/MatchesPage';
import { LeaguesPage } from '@/pages/LeaguesPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { useRealtimePredictions, useRealtimeLeagueMembers, useRealtimeMatches } from '@/hooks/useRealtime';
import { isSupabaseConfigured } from '@/lib/supabase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function AppContent() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    initialize();
  }, [initialize]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-dark-950 text-dark-50 flex items-center justify-center p-6">
        <div className="glass-card rounded-[2rem] p-8 border-white/5 max-w-xl w-full">
          <h1 className="text-2xl font-black text-white">Faltan variables de entorno</h1>
          <p className="text-dark-400 mt-3">
            Configurá estas variables en Vercel y redeployá:
          </p>
          <div className="mt-5 space-y-2 text-sm font-bold">
            <div className="px-4 py-3 rounded-2xl bg-dark-900/40 border border-white/5">
              VITE_SUPABASE_URL
            </div>
            <div className="px-4 py-3 rounded-2xl bg-dark-900/40 border border-white/5">
              VITE_SUPABASE_ANON_KEY
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <RealtimeSubscriptions />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/league/:leagueId" element={<LeaguePage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="/" element={<NavigateToDashboard />} />
      </Routes>
    </>
  );
}

function NavigateToDashboard() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

function RealtimeSubscriptions() {
  useRealtimePredictions();
  useRealtimeLeagueMembers();
  useRealtimeMatches();
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  );
}
