import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_TABLES = {
  PROFILES: 'profiles',
  COMPETITIONS: 'competitions',
  MATCHES: 'matches',
  PREDICTIONS: 'predictions',
  LEAGUES: 'leagues',
  LEAGUE_MEMBERS: 'league_members',
} as const;