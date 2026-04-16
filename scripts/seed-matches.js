#!/usr/bin/env node

/**
 * Script para poblar la base de datos con partidos de PRUEBA
 * Uso: node scripts/seed-matches.js
 * 
 * Este script inserta partidos directamente en Supabase sin necesidad de API externa.
 * Útil para pruebas locales.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const MOCK_COMPETITIONS = [
  { api_id: 128, name: 'Liga Profesional Argentina', logo_url: 'https://media.api-sports.io/football/leagues/128.png', country: 'Argentina', active: true },
  { api_id: 39, name: 'Premier League', logo_url: 'https://media.api-sports.io/football/leagues/39.png', country: 'England', active: true },
  { api_id: 140, name: 'La Liga', logo_url: 'https://media.api-sports.io/football/leagues/140.png', country: 'Spain', active: true },
  { api_id: 2, name: 'UEFA Champions League', logo_url: 'https://media.api-sports.io/football/leagues/2.png', country: 'World', active: true },
];

const MOCK_MATCHES = [
  // Partidos pendientes
  {
    api_fixture_id: 999001,
    competition_id: 128,
    home_team_name: 'River Plate',
    away_team_name: 'Boca Juniors',
    home_team_logo: 'https://media.api-sports.io/football/teams/451.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/455.png',
    match_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: null,
    away_score: null,
    status: 'pending',
  },
  {
    api_fixture_id: 999002,
    competition_id: 128,
    home_team_name: 'Independiente',
    away_team_name: 'Racing Club',
    home_team_logo: 'https://media.api-sports.io/football/teams/460.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/448.png',
    match_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: null,
    away_score: null,
    status: 'pending',
  },
  {
    api_fixture_id: 999003,
    competition_id: 128,
    home_team_name: 'San Lorenzo',
    away_team_name: 'Huracán',
    home_team_logo: 'https://media.api-sports.io/football/teams/11217.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/11216.png',
    match_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: null,
    away_score: null,
    status: 'pending',
  },
  {
    api_fixture_id: 999004,
    competition_id: 39,
    home_team_name: 'Manchester City',
    away_team_name: 'Liverpool',
    home_team_logo: 'https://media.api-sports.io/football/teams/50.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/64.png',
    match_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: null,
    away_score: null,
    status: 'pending',
  },
  {
    api_fixture_id: 999005,
    competition_id: 39,
    home_team_name: 'Arsenal',
    away_team_name: 'Chelsea',
    home_team_logo: 'https://media.api-sports.io/football/teams/42.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/49.png',
    match_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: null,
    away_score: null,
    status: 'pending',
  },
  {
    api_fixture_id: 999006,
    competition_id: 140,
    home_team_name: 'Real Madrid',
    away_team_name: 'Barcelona',
    home_team_logo: 'https://media.api-sports.io/football/teams/541.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/529.png',
    match_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: null,
    away_score: null,
    status: 'pending',
  },
  {
    api_fixture_id: 999007,
    competition_id: 140,
    home_team_name: 'Atlético Madrid',
    away_team_name: 'Sevilla',
    home_team_logo: 'https://media.api-sports.io/football/teams/530.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/536.png',
    match_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: null,
    away_score: null,
    status: 'pending',
  },
  {
    api_fixture_id: 999008,
    competition_id: 2,
    home_team_name: 'Bayern Munich',
    away_team_name: 'Paris Saint-Germain',
    home_team_logo: 'https://media.api-sports.io/football/teams/157.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/85.png',
    match_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: null,
    away_score: null,
    status: 'pending',
  },
  // Partidos finalizados (para probar cálculo de puntos)
  {
    api_fixture_id: 999101,
    competition_id: 128,
    home_team_name: 'Velez Sarsfield',
    away_team_name: 'Estudiantes',
    home_team_logo: 'https://media.api-sports.io/football/teams/452.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/445.png',
    match_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: 2,
    away_score: 1,
    status: 'finished',
  },
  {
    api_fixture_id: 999102,
    competition_id: 39,
    home_team_name: 'Manchester United',
    away_team_name: 'Tottenham',
    home_team_logo: 'https://media.api-sports.io/football/teams/66.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/71.png',
    match_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: 1,
    away_score: 1,
    status: 'finished',
  },
  {
    api_fixture_id: 999103,
    competition_id: 140,
    home_team_name: 'Villarreal',
    away_team_name: 'Real Sociedad',
    home_team_logo: 'https://media.api-sports.io/football/teams/533.png',
    away_team_logo: 'https://media.api-sports.io/football/teams/548.png',
    match_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    home_score: 3,
    away_score: 0,
    status: 'finished',
  },
];

async function insertOrUpdate(table, data) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
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

async function main() {
  console.log('🚀 Seeding database with mock matches...\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
    console.log('\nExample:');
    console.log('VITE_SUPABASE_URL=https://xxx.supabase.co VITE_SUPABASE_ANON_KEY=xxx node scripts/seed-matches.js');
    process.exit(1);
  }

  console.log('📦 Inserting competitions...');
  for (const comp of MOCK_COMPETITIONS) {
    try {
      await insertOrUpdate('competitions', comp);
      console.log(`  ✅ ${comp.name}`);
    } catch (error) {
      console.log(`  ⚠️ ${comp.name}: ${error.message}`);
    }
  }

  console.log('\n⚽ Inserting matches...');
  for (const match of MOCK_MATCHES) {
    try {
      await insertOrUpdate('matches', match);
      const status = match.status === 'finished' ? '✅' : '⏳';
      console.log(`  ${status} ${match.home_team_name} vs ${match.away_team_name}`);
    } catch (error) {
      console.log(`  ⚠️ ${match.home_team_name} vs ${match.away_team_name}: ${error.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Database seeded successfully!');
  console.log('📊 Added competitions: ' + MOCK_COMPETITIONS.length);
  console.log('⚽ Added matches: ' + MOCK_MATCHES.length);
  console.log('   - Pending: ' + MOCK_MATCHES.filter(m => m.status === 'pending').length);
  console.log('   - Finished: ' + MOCK_MATCHES.filter(m => m.status === 'finished').length);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);