export function getDefaultAvatarUrl(seed: string, size = 160): string {
  const url = new URL('https://api.dicebear.com/9.x/avataaars/png');
  url.searchParams.set('seed', seed);
  url.searchParams.set('radius', '36');
  url.searchParams.set('backgroundColor', '0b1220');
  url.searchParams.set('size', String(size));
  return url.toString();
}

export function resolveAvatarUrl(avatarUrl: string | null | undefined, seed: string, size = 160): string {
  return avatarUrl || getDefaultAvatarUrl(seed, size);
}
