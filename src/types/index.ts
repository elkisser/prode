export type ScoreMode = 'simple' | 'exact';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  updated_at: string;
  created_at?: string;
}

export interface Competition {
  id: number;
  api_id: string;
  name: string;
  logo_url: string | null;
  country: string | null;
  active: boolean;
  created_at?: string;
}

export interface Match {
  id: string | number;
  competition_id: string;
  api_fixture_id: string;
  home_team: string;
  away_team: string;
  home_logo: string | null;
  away_logo: string | null;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  status: 'pending' | 'finished' | string;
  updated_at: string;
  round?: string | null;
  competition?: Competition;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string | number;
  home_score: number;
  away_score: number;
  points: number;
  created_at: string;
  match?: Match;
  profile?: Profile;
}

export interface League {
  id: string;
  name: string;
  invite_code: string;
  scoring_mode: ScoreMode;
  owner_id: string;
  created_by: string;
  competition_id: string;
  competition_name: string;
  created_at: string;
  creator?: Profile;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  created_at: string;
  profile?: Profile;
  league?: League;
}

export interface LeagueStanding {
  position: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
}

export interface CreateLeagueInput {
  name: string;
  scoring_mode: ScoreMode;
  competition_id: string;
  competition_name: string;
}

export interface JoinLeagueInput {
  invite_code: string;
}

export interface CreatePredictionInput {
  match_id: string | number;
  home_score: number;
  away_score: number;
}
