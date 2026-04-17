-- PRODE App - Supabase Database Setup
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create competitions table
CREATE TABLE IF NOT EXISTS public.competitions (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id INTEGER PRIMARY KEY,
  competition_id INTEGER REFERENCES public.competitions(id),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_logo TEXT,
  away_logo TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leagues table
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  score_mode TEXT DEFAULT 'simple' CHECK (score_mode IN ('simple', 'exact')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create league_members table
CREATE TABLE IF NOT EXISTS public.league_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- Create unique constraint for predictions (as mentioned in requirements)
ALTER TABLE public.predictions 
ADD CONSTRAINT unique_user_match UNIQUE (user_id, match_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matches_competition ON public.matches(competition_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON public.predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user ON public.league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league ON public.league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_leagues_invite_code ON public.leagues(invite_code);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User' || substr(NEW.id::text, 1, 6)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment member points
CREATE OR REPLACE FUNCTION public.increment_member_points(
  p_league_id UUID,
  p_user_id UUID,
  p_points INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.league_members
  SET total_points = total_points + p_points
  WHERE league_id = p_league_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get league info from invite code (public-safe fields only)
CREATE OR REPLACE FUNCTION public.get_league_by_invite_public(
  p_invite_code TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  scoring_mode TEXT,
  competition_name TEXT,
  invite_code TEXT,
  member_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.scoring_mode,
    l.competition_name,
    l.invite_code,
    COALESCE(COUNT(lm.id), 0)::BIGINT AS member_count
  FROM public.leagues l
  LEFT JOIN public.league_members lm ON lm.league_id = l.id
  WHERE UPPER(l.invite_code) = UPPER(TRIM(p_invite_code))
  GROUP BY l.id, l.name, l.scoring_mode, l.competition_name, l.invite_code
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to join a league by invite code without direct read access to leagues
CREATE OR REPLACE FUNCTION public.join_league_by_invite(
  p_invite_code TEXT
)
RETURNS TABLE (
  league_id UUID,
  already_member BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_league_id UUID;
  v_already_member BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT l.id
  INTO v_league_id
  FROM public.leagues l
  WHERE UPPER(l.invite_code) = UPPER(TRIM(p_invite_code))
  LIMIT 1;

  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'Código de liga inválido';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.league_members lm
    WHERE lm.league_id = v_league_id
      AND lm.user_id = v_user_id
  ) INTO v_already_member;

  IF NOT v_already_member THEN
    INSERT INTO public.league_members (league_id, user_id)
    VALUES (v_league_id, v_user_id)
    ON CONFLICT (league_id, user_id) DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_league_id, v_already_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can read all, update only own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Competitions: readable by all
CREATE POLICY "Competitions are viewable by everyone" ON public.competitions
  FOR SELECT USING (true);

-- Matches: readable by all
CREATE POLICY "Matches are viewable by everyone" ON public.matches
  FOR SELECT USING (true);

-- Leagues: readable by members, creatable by authenticated
CREATE POLICY "Leagues are viewable by members" ON public.leagues
  FOR SELECT USING (
    id IN (SELECT league_id FROM public.league_members WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );
CREATE POLICY "Authenticated users can create leagues" ON public.leagues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- League members: readable by league members
CREATE POLICY "League members are viewable by members" ON public.league_members
  FOR SELECT USING (
    league_id IN (SELECT league_id FROM public.league_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can join leagues" ON public.league_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT EXECUTE ON FUNCTION public.get_league_by_invite_public(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_league_by_invite(TEXT) TO authenticated;

-- Predictions: readable by user, editable by owner
CREATE POLICY "Users can view own predictions" ON public.predictions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create predictions" ON public.predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON public.predictions
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_members;
