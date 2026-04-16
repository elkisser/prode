import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
    initialize();
  }, [initialize]);

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
  if (user) {
    window.location.href = '/dashboard';
    return null;
  }
  window.location.href = '/login';
  return null;
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
