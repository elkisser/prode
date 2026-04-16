#!/usr/bin/env node

/**
 * Script de Sincronización de Partidos
 * Uso: node scripts/sync-fixtures.js
 *
 * Este script debe ejecutarse desde el frontend para cargar datos iniciales.
 * Para producción, usar Supabase Edge Functions.
 */

import axios from 'axios';

const API_FOOTBALL_KEY = process.env.VITE_API_FOOTBALL_KEY || process.env.API_FOOTBALL_KEY;
const API_FOOTBALL_HOST = 'v3.football.api-sports.io';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const CURRENT_YEAR = new Date().getFullYear();

const SUPPORTED_LEAGUES = [
  { id: 128, name: 'Liga Profesional Argentina', season: CURRENT_YEAR },
  { id: 39, name: 'Premier League', season: CURRENT_YEAR },
  { id: 140, name: 'La Liga', season: CURRENT_YEAR },
  { id: 78, name: 'Bundesliga', season: CURRENT_YEAR },
  { id: 61, name: 'Ligue 1', season: CURRENT_YEAR },
  { id: 45, name: 'Serie A', season: CURRENT_YEAR },
  { id: 2, name: 'UEFA Champions League', season: CURRENT_YEAR },
  { id: 3, name: 'UEFA Europa League', season: CURRENT_YEAR },
];

async function fetchFixtures(leagueId, season) {
  console.log(`Fetching fixtures for league ${leagueId}, season ${season}...`);

  try {
    const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: {
        'x-rapidapi-key': API_FOOTBALL_KEY,
        'x-rapidapi-host': API_FOOTBALL_HOST,
      },
      params: {
        league: leagueId,
        season: season,
        status: '-',
      },
    });

    return response.data.response || [];
  } catch (error) {
    console.error(`Error fetching fixtures for league ${leagueId}:`, error.message);
    return [];
  }
}

async function saveToSupabase(fixtures) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials not found. Skipping database save.');
    return;
  }

  console.log(`Saving ${fixtures.length} fixtures to Supabase...`);

  const competitionData = fixtures.map((f) => ({
    api_id: f.league.id,
    name: f.league.name,
    logo_url: f.league.logo,
    country: f.league.country,
    active: true,
  }));

  const uniqueCompetitions = competitionData.filter(
    (c, i) => competitionData.findIndex((x) => x.api_id === c.api_id) === i
  );

  for (const comp of uniqueCompetitions) {
    try {
      await axios.post(`${SUPABASE_URL}/rest/v1/competitions`, comp, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
      });
    } catch (error) {
      console.error('Error saving competition:', error.message);
    }
  }

  const matchData = fixtures.map((f) => ({
    api_fixture_id: f.fixture.id,
    competition_id: f.league.id,
    home_team_name: f.teams.home.name,
    away_team_name: f.teams.away.name,
    home_team_logo: f.teams.home.logo,
    away_team_logo: f.teams.away.logo,
    match_date: f.fixture.date,
    home_score: f.goals.home,
    away_score: f.goals.away,
    status: mapStatus(f.fixture.status.short),
    updated_at: new Date().toISOString(),
  }));

  for (const match of matchData) {
    try {
      await axios.post(`${SUPABASE_URL}/rest/v1/matches`, match, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
      });
    } catch (error) {
      console.error('Error saving match:', error.message);
    }
  }

  console.log(`Saved ${fixtures.length} fixtures to Supabase`);
}

function mapStatus(apiStatus) {
  const statusMap = {
    'NS': 'pending',
    'TBD': 'pending',
    'PST': 'cancelled',
    'CANC': 'cancelled',
    'FT': 'finished',
    'HT': 'in_progress',
    'ET': 'in_progress',
    'PEN': 'finished',
    'BT': 'in_progress',
    'LIVE': 'in_progress',
  };
  return statusMap[apiStatus] || 'pending';
}

async function main() {
  console.log('🚀 Starting fixture sync...\n');

  if (!API_FOOTBALL_KEY) {
    console.error('❌ API_FOOTBALL_KEY not found in environment');
    console.log('Please set VITE_API_FOOTBALL_KEY or API_FOOTBALL_KEY');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase credentials not found');
    console.warn('Data will be fetched but not saved to database\n');
  }

  let totalFixtures = 0;

  for (const league of SUPPORTED_LEAGUES) {
    const fixtures = await fetchFixtures(league.id, league.season);

    if (fixtures.length > 0) {
      await saveToSupabase(fixtures);
      totalFixtures += fixtures.length;
      console.log(`✅ ${league.name}: ${fixtures.length} fixtures\n`);
    } else {
      console.log(`⚠️ ${league.name}: No fixtures found\n`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Total fixtures synced: ${totalFixtures}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (totalFixtures === 0) {
    console.log('❌ No fixtures were synced.');
    console.log('This could mean:');
    console.log('  - API key is invalid');
    console.log('  - API rate limit reached');
    console.log('  - No fixtures available for this season');
    process.exit(1);
  }

  console.log('✅ Sync completed successfully!');
}

main().catch(console.error);