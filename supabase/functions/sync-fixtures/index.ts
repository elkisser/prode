const THESPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json/3';
const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';
const API_FOOTBALL_HOST = 'v3.football.api-sports.io';
const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

export const config = {
  verifyJWT: false,
};

const SUPPORTED_LEAGUES = [
  { id: '4328', name: 'Premier League' },
  { id: '4335', name: 'La Liga' },
  { id: '4332', name: 'Serie A' },
  { id: '4331', name: 'Bundesliga' },
  { id: '4334', name: 'Ligue 1' },
  { id: '4406', name: 'Liga Argentina' },
  { id: '4424', name: 'UEFA Champions League' },
  { id: '4425', name: 'UEFA Europa League' },
  { id: 'WORLD_CUP', name: 'Mundial' },
];

type SupportedLeague = typeof SUPPORTED_LEAGUES[number];

function normalizeCompetitionId(competitionId: string) {
  const legacyMap: Record<string, string> = {
    '4480': '4424',
    '4481': '4425',
    '4396': '4406',
  };
  return legacyMap[competitionId] || competitionId;
}

interface TheSportsDBEvent {
  idEvent: string;
  dateEvent: string | null;
  strHomeTeam: string | null;
  strAwayTeam: string | null;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  strTimestamp?: string | null;
  intRound?: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null;
}

interface TheSportsDBLeague {
  idLeague: string;
  strLeague: string;
  strBadge: string | null;
  strCountry: string | null;
}

type ApiFootballFixtureStatusShort =
  | 'NS'
  | 'TBD'
  | 'PST'
  | 'CANC'
  | 'FT'
  | 'AET'
  | 'PEN'
  | 'ET'
  | 'HT'
  | 'LIVE'
  | '1H'
  | '2H'
  | 'BT'
  | string;

interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: ApiFootballFixtureStatusShort };
  };
  league: {
    id: number;
    name: string;
    logo: string | null;
    country: string | null;
  };
  teams: {
    home: { name: string; logo: string | null };
    away: { name: string; logo: string | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

type FootballDataMatchStatus = 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELED' | string;

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: FootballDataMatchStatus;
  homeTeam: { name: string; crest?: string | null; crestURI?: string | null };
  awayTeam: { name: string; crest?: string | null; crestURI?: string | null };
  score?: { fullTime?: { home?: number | null; away?: number | null; homeTeam?: number | null; awayTeam?: number | null } };
}

const API_FOOTBALL_COMPETITIONS: Record<
  string,
  { leagueId: number; name: string; logoUrl: string; footballDataCode: 'CL' | 'EL' | 'WC' }
> = {
  '4424': {
    leagueId: 2,
    name: 'UEFA Champions League',
    logoUrl: 'https://media.api-sports.io/football/leagues/2.png',
    footballDataCode: 'CL',
  },
  '4425': {
    leagueId: 3,
    name: 'UEFA Europa League',
    logoUrl: 'https://media.api-sports.io/football/leagues/3.png',
    footballDataCode: 'EL',
  },
  WORLD_CUP: {
    leagueId: 1,
    name: 'Mundial',
    logoUrl: 'https://media.api-sports.io/football/leagues/1.png',
    footballDataCode: 'WC',
  },
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getCurrentSeasonYearForApiFootball(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 7 ? year : year - 1;
}

function pickRelevantByDate<T extends { match_date: string }>(items: T[], now = new Date(), strict = false): T[] {
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const to = new Date(now);
  to.setDate(to.getDate() + 60);

  const filtered = (items || []).filter((x) => {
    const d = new Date(x.match_date);
    if (Number.isNaN(d.getTime())) return false;
    return d >= from && d <= to;
  });

  return strict ? filtered : filtered.length > 0 ? filtered : items;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
  }
  return (await res.json()) as T;
}

async function fetchLeagueInfo(leagueId: string): Promise<TheSportsDBLeague | null> {
  const url = `${THESPORTSDB_BASE_URL}/lookupleague.php?id=${encodeURIComponent(leagueId)}`;
  const data = await fetchJSON<{ leagues?: TheSportsDBLeague[] }>(url);
  return data.leagues?.[0] ?? null;
}

async function fetchEventsSeason(leagueId: string, season: string): Promise<TheSportsDBEvent[]> {
  const url = `${THESPORTSDB_BASE_URL}/eventsseason.php?id=${encodeURIComponent(leagueId)}&s=${encodeURIComponent(season)}`;
  const data = await fetchJSON<{ events?: TheSportsDBEvent[] | null }>(url);
  return data.events ?? [];
}

function mapApiFootballStatusToDb(
  apiStatus: ApiFootballFixtureStatusShort
): 'pending' | 'finished' | 'in_progress' | 'cancelled' {
  const statusMap: Record<string, 'pending' | 'finished' | 'in_progress' | 'cancelled'> = {
    NS: 'pending',
    TBD: 'pending',
    PST: 'cancelled',
    CANC: 'cancelled',
    FT: 'finished',
    AET: 'finished',
    PEN: 'finished',
    HT: 'in_progress',
    ET: 'in_progress',
    BT: 'in_progress',
    LIVE: 'in_progress',
    '1H': 'in_progress',
    '2H': 'in_progress',
  };
  return statusMap[String(apiStatus)] || 'pending';
}

async function fetchApiFootballFixtures(leagueId: number, season: number): Promise<ApiFootballFixture[]> {
  const apiKey =
    (globalThis as any).Deno?.env?.get('API_FOOTBALL_KEY') ??
    (globalThis as any).Deno?.env?.get('VITE_API_FOOTBALL_KEY') ??
    '';

  if (!apiKey) {
    throw new Error('Falta API_FOOTBALL_KEY en las variables de entorno de Supabase (Edge Function)');
  }

  const url = new URL(`${API_FOOTBALL_BASE_URL}/fixtures`);
  url.searchParams.set('league', String(leagueId));
  url.searchParams.set('season', String(season));

  const res = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': apiKey,
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': API_FOOTBALL_HOST,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API-Football error: HTTP ${res.status} ${res.statusText} ${text}`.trim());
  }

  const data = (await res.json().catch(() => ({}))) as any;
  if (data?.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`);
  }
  return (data?.response || []) as ApiFootballFixture[];
}

function mapFootballDataStatusToDb(status: FootballDataMatchStatus): 'pending' | 'finished' | 'in_progress' | 'cancelled' {
  const s = String(status);
  if (s === 'FINISHED') return 'finished';
  if (s === 'IN_PLAY' || s === 'PAUSED') return 'in_progress';
  if (s === 'POSTPONED' || s === 'SUSPENDED' || s === 'CANCELED') return 'cancelled';
  return 'pending';
}

function getUtcWindow(now = new Date()) {
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const to = new Date(now);
  to.setDate(to.getDate() + 60);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { dateFrom: fmt(from), dateTo: fmt(to) };
}

async function fetchFootballDataMatches(code: 'CL' | 'EL' | 'WC', now = new Date()): Promise<FootballDataMatch[]> {
  const token =
    (globalThis as any).Deno?.env?.get('FOOTBALL_DATA_TOKEN') ??
    (globalThis as any).Deno?.env?.get('FOOTBALL_DATA_API_KEY') ??
    '';
  if (!token) {
    throw new Error('Falta FOOTBALL_DATA_TOKEN en las variables de entorno de Supabase (Edge Function)');
  }

  const { dateFrom, dateTo } = getUtcWindow(now);
  const url = new URL(`${FOOTBALL_DATA_BASE_URL}/competitions/${encodeURIComponent(code)}/matches`);
  url.searchParams.set('dateFrom', dateFrom);
  url.searchParams.set('dateTo', dateTo);

  const res = await fetch(url.toString(), {
    headers: {
      'X-Auth-Token': token,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Football-Data error: HTTP ${res.status} ${res.statusText} ${text}`.trim());
  }

  const data = (await res.json().catch(() => ({}))) as any;
  return (data?.matches || []) as FootballDataMatch[];
}

async function fetchEventsNextLeague(leagueId: string): Promise<TheSportsDBEvent[]> {
  const url = `${THESPORTSDB_BASE_URL}/eventsnextleague.php?id=${encodeURIComponent(leagueId)}`;
  const data = await fetchJSON<{ events?: TheSportsDBEvent[] | null }>(url);
  return data.events ?? [];
}

async function fetchEventsPastLeague(leagueId: string): Promise<TheSportsDBEvent[]> {
  const url = `${THESPORTSDB_BASE_URL}/eventspastleague.php?id=${encodeURIComponent(leagueId)}`;
  const data = await fetchJSON<{ events?: TheSportsDBEvent[] | null }>(url);
  return data.events ?? [];
}

function filterByLeagueId(leagueId: string, events: TheSportsDBEvent[]): TheSportsDBEvent[] {
  return (events || []).filter((e: any) => String(e?.idLeague || '') === String(leagueId));
}

function uniqEvents(events: TheSportsDBEvent[]): TheSportsDBEvent[] {
  const seen = new Set<string>();
  const out: TheSportsDBEvent[] = [];
  for (const e of events) {
    if (!e?.idEvent) continue;
    if (seen.has(e.idEvent)) continue;
    seen.add(e.idEvent);
    out.push(e);
  }
  return out;
}

function pickRelevantEvents(events: TheSportsDBEvent[], now = new Date(), strict = false): TheSportsDBEvent[] {
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const to = new Date(now);
  to.setDate(to.getDate() + 60);

  const filtered = events.filter((e) => {
    const raw = e.strTimestamp || (e.dateEvent ? `${e.dateEvent}T00:00:00Z` : null);
    if (!raw) return false;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    return d >= from && d <= to;
  });

  return strict ? filtered : filtered.length > 0 ? filtered : events;
}

async function fetchWithFallback(leagueId: string): Promise<TheSportsDBEvent[]> {
  const season = getCurrentSeason();
  let events = await fetchEventsSeason(leagueId, season);

  if (!events || events.length === 0) {
    events = await fetchEventsSeason(leagueId, '2024-2025');
  }

  if (leagueId === '4480' || leagueId === '4481') {
    const next = filterByLeagueId(leagueId, await fetchEventsNextLeague(leagueId));
    const past = filterByLeagueId(leagueId, await fetchEventsPastLeague(leagueId));
    const combined = uniqEvents([...(events || []), ...(next || []), ...(past || [])]);
    events = pickRelevantEvents(combined, new Date(), true);
  }

  if ((!events || events.length === 0) && leagueId === '4406') {
    const year = new Date().getFullYear();
    events = await fetchEventsSeason(leagueId, String(year));
    if (!events || events.length === 0) {
      events = await fetchEventsSeason(leagueId, String(year - 1));
    }
  }

  return events ?? [];
}

function getSupabaseAdminConfig() {
  const supabaseUrl = (globalThis as any).Deno?.env?.get('SUPABASE_URL') || '';
  const supabaseKey = (globalThis as any).Deno?.env?.get('SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan variables de entorno en la Edge Function: SUPABASE_URL y/o SERVICE_ROLE_KEY.');
  }
  return { supabaseUrl, supabaseKey };
}

async function upsertMatches(matches: any[]) {
  const { supabaseUrl, supabaseKey } = getSupabaseAdminConfig();

  const res = await fetch(`${supabaseUrl}/rest/v1/matches?on_conflict=api_fixture_id`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(matches),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (text.includes('invalid input syntax for type integer') && text.includes('api_fixture_id')) {
      throw new Error(
        [
          `Supabase upsert matches failed: HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          'Tu columna matches.api_fixture_id está como integer. Para soportar IDs con prefijo (af:/fd:) debe ser text.',
          'SQL sugerido:',
          'ALTER TABLE matches ALTER COLUMN api_fixture_id TYPE text USING api_fixture_id::text;',
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_api_fixture ON matches(api_fixture_id);',
        ].join('\n')
      );
    }
    throw new Error(`Supabase upsert matches failed: HTTP ${res.status} ${res.statusText} ${text}`.trim());
  }
}

function calculatePredictionPoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number | null,
  actualAway: number | null
): number {
  if (actualHome === null || actualAway === null) return 0;
  const isExact = predictedHome === actualHome && predictedAway === actualAway;
  if (isExact) return 5;
  const actualWins = actualHome > actualAway;
  const predictedWins = predictedHome > predictedAway;
  const isDraw = actualHome === actualAway;
  const predictedDraw = predictedHome === predictedAway;
  if ((isDraw && predictedDraw) || actualWins === predictedWins) return 3;
  return 0;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function updatePredictionsForFinishedMatchesByApiFixtureIds(apiFixtureIds: string[]) {
  const { supabaseUrl, supabaseKey } = getSupabaseAdminConfig();

  const uniq = Array.from(new Set((apiFixtureIds || []).filter(Boolean).map(String)));
  if (uniq.length === 0) return;

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  const idChunks = chunkArray(uniq, 60);
  for (const ids of idChunks) {
    const quoted = ids.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
    const matchParams = new URLSearchParams();
    matchParams.set('select', 'id,api_fixture_id,home_score,away_score,status');
    matchParams.set('api_fixture_id', `in.(${quoted})`);

    const matchRes = await fetch(`${supabaseUrl}/rest/v1/matches?${matchParams.toString()}`, {
      headers,
    });
    if (!matchRes.ok) continue;

    const matchRows = (await matchRes.json().catch(() => [])) as any[];
    const finished = (matchRows || []).filter(
      (m) =>
        (m?.status === 'finished' || (typeof m?.status === 'string' && m.status.toLowerCase() === 'finished')) &&
        (typeof m?.id === 'string' || typeof m?.id === 'number') &&
        typeof m?.home_score === 'number' &&
        typeof m?.away_score === 'number'
    );

    if (finished.length === 0) continue;

    const matchById = new Map<string, { home_score: number; away_score: number }>();
    for (const m of finished) {
      matchById.set(String(m.id), { home_score: m.home_score, away_score: m.away_score });
    }

    const matchIds = Array.from(matchById.keys());
    const matchIdChunks = chunkArray(matchIds, 180);
    for (const matchIdChunk of matchIdChunks) {
      const quotedMatchIds = matchIdChunk.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
      const predParams = new URLSearchParams();
      predParams.set('select', '*');
      predParams.set('match_id', `in.(${quotedMatchIds})`);

      const predRes = await fetch(`${supabaseUrl}/rest/v1/predictions?${predParams.toString()}`, {
        headers,
      });
      if (!predRes.ok) continue;

      const predictions = (await predRes.json().catch(() => [])) as any[];
      for (const p of predictions || []) {
        if (!p?.id || typeof p?.match_id === 'undefined' || p?.match_id === null) continue;
        const actual = matchById.get(String(p.match_id));
        if (!actual) continue;

        const predictedHome =
          typeof p.home_score === 'number'
            ? p.home_score
            : typeof p.predicted_home === 'number'
              ? p.predicted_home
              : Number(p.predicted_home);
        const predictedAway =
          typeof p.away_score === 'number'
            ? p.away_score
            : typeof p.predicted_away === 'number'
              ? p.predicted_away
              : Number(p.predicted_away);

        if (!Number.isFinite(predictedHome) || !Number.isFinite(predictedAway)) continue;

        const points = calculatePredictionPoints(predictedHome, predictedAway, actual.home_score, actual.away_score);
        if (typeof p.points === 'number' && p.points === points) continue;

        const updParams = new URLSearchParams();
        updParams.set('id', `eq.${p.id}`);
        const updRes = await fetch(`${supabaseUrl}/rest/v1/predictions?${updParams.toString()}`, {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ points }),
        });
        if (!updRes.ok) continue;
      }
    }
  }
}

async function updatePredictionsForFinishedMatchesByCompetitionId(competitionId: string) {
  const { supabaseUrl, supabaseKey } = getSupabaseAdminConfig();

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  const params = new URLSearchParams();
  params.set('select', 'id,home_score,away_score,status');
  params.set('competition_id', `eq.${encodeURIComponent(competitionId)}`);

  const matchesRes = await fetch(`${supabaseUrl}/rest/v1/matches?${params.toString()}`, { headers });
  if (!matchesRes.ok) {
    const text = await matchesRes.text().catch(() => '');
    throw new Error(text?.trim() ? text.trim() : `No se pudieron leer matches (HTTP ${matchesRes.status})`);
  }

  const matches = (await matchesRes.json().catch(() => [])) as any[];
  const finished = (matches || []).filter(
    (m) =>
      (typeof m?.id === 'string' || typeof m?.id === 'number') &&
      typeof m?.home_score === 'number' &&
      typeof m?.away_score === 'number' &&
      m?.status !== 'in_progress'
  );
  if (finished.length === 0) return { updatedMatches: 0, updatedPredictions: 0 };

  const matchById = new Map<string, { home_score: number; away_score: number }>();
  for (const m of finished) {
    matchById.set(String(m.id), { home_score: m.home_score, away_score: m.away_score });
  }

  const matchIds = Array.from(matchById.keys());
  let updatedPredictions = 0;

  const matchIdChunks = chunkArray(matchIds, 180);
  for (const matchIdChunk of matchIdChunks) {
    const quoted = matchIdChunk.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
    const predParams = new URLSearchParams();
    predParams.set('select', '*');
    predParams.set('match_id', `in.(${quoted})`);

    const predRes = await fetch(`${supabaseUrl}/rest/v1/predictions?${predParams.toString()}`, { headers });
    if (!predRes.ok) continue;

    const predictions = (await predRes.json().catch(() => [])) as any[];
    for (const p of predictions || []) {
      if (!p?.id || typeof p?.match_id === 'undefined' || p?.match_id === null) continue;
      const actual = matchById.get(String(p.match_id));
      if (!actual) continue;

      const predictedHome =
        typeof p.home_score === 'number'
          ? p.home_score
          : typeof p.predicted_home === 'number'
            ? p.predicted_home
            : Number(p.predicted_home);
      const predictedAway =
        typeof p.away_score === 'number'
          ? p.away_score
          : typeof p.predicted_away === 'number'
            ? p.predicted_away
            : Number(p.predicted_away);

      if (!Number.isFinite(predictedHome) || !Number.isFinite(predictedAway)) continue;

      const points = calculatePredictionPoints(predictedHome, predictedAway, actual.home_score, actual.away_score);
      if (typeof p.points === 'number' && p.points === points) continue;

      const updParams = new URLSearchParams();
      updParams.set('id', `eq.${p.id}`);
      const updRes = await fetch(`${supabaseUrl}/rest/v1/predictions?${updParams.toString()}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ points }),
      });
      if (updRes.ok) updatedPredictions++;
    }
  }

  return { updatedMatches: finished.length, updatedPredictions };
}

async function deleteMatchesByCompetitionId(competitionId: string) {
  const { supabaseUrl, supabaseKey } = getSupabaseAdminConfig();

  const res = await fetch(
    `${supabaseUrl}/rest/v1/matches?competition_id=eq.${encodeURIComponent(competitionId)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase delete matches failed: HTTP ${res.status} ${res.statusText} ${text}`.trim());
  }
}

function mapTheSportsDbStatusToDb(
  strStatus: string | null,
  intHomeScore: string | null,
  intAwayScore: string | null
): 'pending' | 'finished' | 'in_progress' | 'cancelled' {
  const s = (strStatus || '').toLowerCase();
  if (s.includes('match finished') || s === 'ft' || s.includes('finished')) return 'finished';
  if (s.includes('live') || s.includes('in play') || s.includes('1st half') || s.includes('2nd half') || s.includes('half time')) return 'in_progress';
  if (s.includes('postpon') || s.includes('cancel') || s.includes('aband') || s.includes('suspend')) return 'cancelled';
  if (s.includes('not started') || s === 'ns') return 'pending';

  const hasScore = (intHomeScore !== null && intHomeScore !== '') || (intAwayScore !== null && intAwayScore !== '');
  return hasScore ? 'finished' : 'pending';
}

(globalThis as any).Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  try {
    const payload = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    if (payload?.action === 'supported_leagues') {
      const leagues = await Promise.all(
        SUPPORTED_LEAGUES.map(async (l) => {
          const apiFootball = API_FOOTBALL_COMPETITIONS[l.id];
          if (apiFootball) {
            return { ...l, logo_url: apiFootball.logoUrl };
          }
          try {
            const info = await fetchLeagueInfo(l.id);
            return { ...l, logo_url: info?.strBadge ?? null };
          } catch {
            return { ...l, logo_url: null };
          }
        })
      );
      return jsonResponse(200, { success: true, leagues });
    }

    const competitionIdRaw = payload?.competition_id as string | undefined;
    const competitionId = competitionIdRaw ? normalizeCompetitionId(competitionIdRaw) : undefined;

    if (payload?.action === 'recalculate_points') {
      if (!competitionId) return jsonResponse(200, { success: false, error: 'competition_id requerido' });
      const stats = await updatePredictionsForFinishedMatchesByCompetitionId(competitionId);
      return jsonResponse(200, { success: true, ...stats });
    }

    const leaguesToSync: SupportedLeague[] = (() => {
      if (!competitionId) return SUPPORTED_LEAGUES;
      const direct = SUPPORTED_LEAGUES.filter((l) => l.id === competitionId);
      if (direct.length > 0) return direct;
      const apiFootball = API_FOOTBALL_COMPETITIONS[competitionId];
      if (apiFootball) return [{ id: competitionId, name: apiFootball.name }] as SupportedLeague[];
      return [];
    })();

    if (competitionId && leaguesToSync.length === 0) {
      return jsonResponse(200, { success: false, error: 'competition_id inválido' });
    }

    if (competitionIdRaw && competitionId && competitionIdRaw !== competitionId) {
      await deleteMatchesByCompetitionId(competitionIdRaw).catch(() => null);
    }

    let total = 0;
    for (const league of leaguesToSync) {
      const apiFootball = API_FOOTBALL_COMPETITIONS[league.id];
      let formatted: any[] = [];
      if (apiFootball) {
        const season = getCurrentSeasonYearForApiFootball();
        try {
          let fixtures = await fetchApiFootballFixtures(apiFootball.leagueId, season);
          if (!fixtures || fixtures.length === 0) fixtures = await fetchApiFootballFixtures(apiFootball.leagueId, season - 1);
          formatted = (fixtures || []).map((f) => ({
            api_fixture_id: `af:${f.fixture.id}`,
            competition_id: league.id,
            match_date: f.fixture.date,

            home_team_name: f.teams.home.name ?? '',
            away_team_name: f.teams.away.name ?? '',
            home_team_logo: f.teams.home.logo ?? null,
            away_team_logo: f.teams.away.logo ?? null,

            home_team: f.teams.home.name ?? '',
            away_team: f.teams.away.name ?? '',
            home_logo: f.teams.home.logo ?? null,
            away_logo: f.teams.away.logo ?? null,

            home_score: typeof f.goals.home === 'number' ? f.goals.home : null,
            away_score: typeof f.goals.away === 'number' ? f.goals.away : null,
            status: mapApiFootballStatusToDb(f.fixture.status.short),
            updated_at: new Date().toISOString(),
          }));
          formatted = pickRelevantByDate(formatted, new Date(), true);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('Free plans do not have access to this season')) {
            const matches = await fetchFootballDataMatches(apiFootball.footballDataCode, new Date());
            formatted = (matches || []).map((m) => {
              const fullTime = m.score?.fullTime || {};
              const homeScore =
                typeof (fullTime as any).home === 'number'
                  ? (fullTime as any).home
                  : typeof (fullTime as any).homeTeam === 'number'
                    ? (fullTime as any).homeTeam
                    : null;
              const awayScore =
                typeof (fullTime as any).away === 'number'
                  ? (fullTime as any).away
                  : typeof (fullTime as any).awayTeam === 'number'
                    ? (fullTime as any).awayTeam
                    : null;

              const homeCrest = (m.homeTeam as any)?.crest ?? (m.homeTeam as any)?.crestURI ?? null;
              const awayCrest = (m.awayTeam as any)?.crest ?? (m.awayTeam as any)?.crestURI ?? null;

              return {
                api_fixture_id: `fd:${m.id}`,
                competition_id: league.id,
                match_date: m.utcDate,

                home_team_name: m.homeTeam?.name ?? '',
                away_team_name: m.awayTeam?.name ?? '',
                home_team_logo: homeCrest,
                away_team_logo: awayCrest,

                home_team: m.homeTeam?.name ?? '',
                away_team: m.awayTeam?.name ?? '',
                home_logo: homeCrest,
                away_logo: awayCrest,

                home_score: homeScore,
                away_score: awayScore,
                status: mapFootballDataStatusToDb(m.status),
                updated_at: new Date().toISOString(),
              };
            });
          } else {
            throw err;
          }
        }
      } else {
        const events = await fetchWithFallback(league.id);
        formatted = (events || []).map((e) => ({
          api_fixture_id: e.idEvent,
          competition_id: league.id,
          match_date: e.strTimestamp || (e.dateEvent ? `${e.dateEvent}T00:00:00Z` : new Date().toISOString()),

          home_team_name: e.strHomeTeam ?? '',
          away_team_name: e.strAwayTeam ?? '',
          home_team_logo: e.strHomeTeamBadge ?? null,
          away_team_logo: e.strAwayTeamBadge ?? null,

          home_team: e.strHomeTeam ?? '',
          away_team: e.strAwayTeam ?? '',
          home_logo: e.strHomeTeamBadge ?? null,
          away_logo: e.strAwayTeamBadge ?? null,

          home_score: e.intHomeScore ? Number(e.intHomeScore) : null,
          away_score: e.intAwayScore ? Number(e.intAwayScore) : null,
          status: mapTheSportsDbStatusToDb(e.strStatus, e.intHomeScore, e.intAwayScore),
          updated_at: new Date().toISOString(),
        }));
        formatted = pickRelevantByDate(formatted, new Date(), false);
      }

      if (formatted.length === 0) continue;

      await upsertMatches(formatted);
      await updatePredictionsForFinishedMatchesByApiFixtureIds(formatted.map((m) => m.api_fixture_id)).catch(() => null);
      total += formatted.length;
    }

    const pointsStats = competitionId ? await updatePredictionsForFinishedMatchesByCompetitionId(competitionId).catch(() => null) : null;
    return jsonResponse(200, { success: true, total, ...(pointsStats || {}) });
  } catch (error) {
    return jsonResponse(200, { success: false, error: error instanceof Error ? error.message : String(error) });
  }
});
