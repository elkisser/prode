import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://example.supabase.co', 'public-anon-key');

export const SUPABASE_TABLES = {
  PROFILES: 'profiles',
  COMPETITIONS: 'competitions',
  MATCHES: 'matches',
  PREDICTIONS: 'predictions',
  LEAGUES: 'leagues',
  LEAGUE_MEMBERS: 'league_members',
} as const;
