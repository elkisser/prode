#!/usr/bin/env node

/**
 * Script para poblar la base de datos con partidos de TheSportsDB
 * Uso: node scripts/sync-from-thesportsdb.js
 */

const axios = require('axios');

const THESPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json/3';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const SUPPORTED_LEAGUES = [
  { id: '4328', name: 'English Premier League', season: '2024-2025' },
  { id: '4334', name: 'Spanish La Liga', season: '2024-2025' },
  { id: '4332', name: 'Italian Serie A', season: '2024-2025' },
  { id: '4331', name: 'German Bundesliga', season: '2024-2025' },
  { id: '4335', name: 'French Ligue 1', season: '2024-2025' },
  { id: '4396', name: 'Argentine Liga Profesional', season: '2024' },
  { id: '4424', name: 'UEFA Champions League', season: '2024-2025' },
  { id: '4425', name: 'UEFA Europa League', season: '2024-2025' },
];

async function fetchEvents(leagueId, season) {
  try {
    const response = await axios.get(`${THESPORTSDB_BASE_URL}/eventsseason.php`, {
      params: { id: leagueId, s: season }
    });
    return response.data.events || [];
  } catch (error) {
    console.error('Error fetching events:', error.message);
    return [];
  }
}

async function fetchLeagueInfo(leagueId) {
  try {
    const response = await axios.get(`${THESPORTSDB_BASE_URL}/lookupleague.php`, {
      params: { id: leagueId }
    });
    return response.data.leagues?.[0] || null;
  } catch (error) {
    console.error('Error fetching league info:', error.message);
    return null;
  }
}

async function insertOrUpdate(table, data) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase credentials');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error inserting into ${table}: ${error}`);
  }
}

async function syncLeague(league) {
  console.log(`\n📡 Fetching ${league.name} (${league.season})...`);

  const leagueInfo = await fetchLeagueInfo(league.id);
  const events = await fetchEvents(league.id, league.season);

  if (events.length === 0) {
    console.log(`  ⚠️ No events found for ${league.name}`);
    return 0;
  }

  if (leagueInfo) {
    try {
      await insertOrUpdate('competitions', {
        api_id: parseInt(leagueInfo.idLeague) || 0,
        name: leagueInfo.strLeague,
        logo_url: leagueInfo.strBadge,
        country: leagueInfo.strCountry,
        active: true,
      });
      console.log(`  ✅ Competition saved`);
    } catch (error) {
      console.log(`  ⚠️ Competition: ${error.message}`);
    }
  }

  let savedCount = 0;
  for (const event of events) {
    try {
      const match = {
        api_fixture_id: parseInt(event.idEvent) || 0,
        competition_id: parseInt(league.id) || 0,
        home_team_name: event.strHomeTeam,
        away_team_name: event.strAwayTeam,
        home_team_logo: null,
        away_team_logo: null,
        match_date: event.dateEvent ? `${event.dateEvent}T00:00:00Z` : new Date().toISOString(),
        home_score: event.intHomeScore ? parseInt(event.intHomeScore) : null,
        away_score: event.intAwayScore ? parseInt(event.intAwayScore) : null,
        status: event.intHomeScore ? 'finished' : 'pending',
        updated_at: new Date().toISOString(),
      };

      await insertOrUpdate('matches', match);
      savedCount++;
    } catch (error) {
      console.log(`  ⚠️ Match ${event.strHomeTeam} vs ${event.strAwayTeam}: ${error.message}`);
    }
  }

  console.log(`  ⚽ ${savedCount}/${events.length} matches saved`);
  return savedCount;
}

async function main() {
  console.log('🚀 TheSportsDB Sync Script');
  console.log('═'.repeat(40));

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('\n❌ Missing Supabase credentials');
    console.log('\nUsage:');
    console.log('VITE_SUPABASE_URL=https://xxx.supabase.co VITE_SUPABASE_ANON_KEY=xxx node scripts/sync-from-thesportsdb.js');
    process.exit(1);
  }

  let totalMatches = 0;

  for (const league of SUPPORTED_LEAGUES) {
    const count = await syncLeague(league);
    totalMatches += count;
  }

  console.log('\n' + '═'.repeat(40));
  console.log(`✅ Sync complete! Total matches: ${totalMatches}`);
  console.log('═'.repeat(40) + '\n');
}

main().catch(console.error);