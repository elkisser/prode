export const SUPPORTED_LEAGUES: { id: string; name: string }[] = [
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

export type SupportedLeague = typeof SUPPORTED_LEAGUES[number];
